/**
 * Fallback WHOIS lookup via yisi.yun API.
 * Called when native RDAP + WHOIS produce no usable result for a domain.
 * Uses node:https with Chrome-like TLS fingerprint to bypass bot detection.
 */

import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import { createGunzip } from "node:zlib";
import { WhoisResult, WhoisAnalyzeResult, DomainStatusProps, initialWhoisAnalyzeResult } from "@/lib/whois/types";

const YISI_HOST = "yisi.yun";
const YISI_TIMEOUT = 10_000;

const CHROME_CIPHERS = [
  "TLS_AES_128_GCM_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "TLS_CHACHA20_POLY1305_SHA256",
  "ECDHE-ECDSA-AES128-GCM-SHA256",
  "ECDHE-RSA-AES128-GCM-SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
].join(":");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

interface YisiStatus {
  status: string;
  url: string;
}

interface YisiResult {
  domain: string;
  registrar: string;
  registrarURL: string;
  ianaId: string;
  whoisServer: string;
  creationDate: string | null;
  expirationDate: string | null;
  updatedDate: string | null;
  status: YisiStatus[];
  nameServers: string[];
  registrantOrganization: string | null;
  registrantOrganizationEn: string | null;
  registrantType: string | null;
  registrantHandle: string | null;
  techHandle: string | null;
  registrantProvince: string | null;
  registrantCountry: string | null;
  registrantPhone: string | null;
  registrantEmail: string | null;
  dnssec: string | null;
  rawWhoisContent: string | null;
  domainAge: number | null;
  remainingDays: number | null;
  domainNotFound: boolean;
}

interface YisiResponse {
  status: boolean;
  time: number;
  cached?: boolean;
  source?: string;
  result?: YisiResult;
  error?: string;
  code?: string;
}

interface RawResponse {
  statusCode: number;
  headers: IncomingMessage["headers"];
  body: string;
}

function httpsGet(path: string, headers: Record<string, string>, timeoutMs: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: YISI_HOST,
        path,
        method: "GET",
        headers,
        ciphers: CHROME_CIPHERS,
        ecdhCurve: "X25519:prime256v1:secp384r1",
        minVersion: "TLSv1.2" as const,
      },
      (res) => {
        const chunks: Buffer[] = [];
        const stream = res.headers["content-encoding"] === "gzip" ? res.pipe(createGunzip()) : res;
        stream.on("data", (c: Buffer) => chunks.push(c));
        stream.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
        stream.on("error", reject);
      },
    );
    req.on("error", reject);
    setTimeout(() => {
      req.destroy();
      reject(new Error("yisi timeout"));
    }, timeoutMs);
    req.end();
  });
}

async function yisiFetch(domain: string): Promise<YisiResponse | null> {
  const half = Math.floor(YISI_TIMEOUT / 2);

  const baseHeaders: Record<string, string> = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "user-agent": UA,
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
  };

  // Step 1: get a session cookie from the lookup page
  const homeResp = await httpsGet(`/lookup?query=${encodeURIComponent(domain)}`, baseHeaders, half);

  const setCookies: string[] = Array.isArray(homeResp.headers["set-cookie"])
    ? homeResp.headers["set-cookie"]
    : homeResp.headers["set-cookie"]
      ? [homeResp.headers["set-cookie"] as string]
      : [];
  const cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");

  // Step 2: call the API with proper browser-like headers and session cookie
  const apiHeaders: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "user-agent": UA,
    referer: `https://${YISI_HOST}/lookup?query=${encodeURIComponent(domain)}`,
    origin: `https://${YISI_HOST}`,
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    ...(cookieStr ? { cookie: cookieStr } : {}),
  };

  const apiResp = await httpsGet(`/api/lookup?query=${encodeURIComponent(domain)}`, apiHeaders, half);

  if (apiResp.statusCode < 200 || apiResp.statusCode >= 300) return null;

  const json: YisiResponse = JSON.parse(apiResp.body);
  return json;
}

function str(v: string | null | undefined, fallback = "Unknown"): string {
  if (!v || v.trim() === "" || v.trim().toLowerCase() === "unknown") return fallback;
  return v.trim();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Unknown";
    return d.toISOString();
  } catch {
    return "Unknown";
  }
}

function hasUsableData(r: YisiResult): boolean {
  if (r.domainNotFound) return false;
  return (
    Boolean(r.registrar && r.registrar !== "Unknown") ||
    Boolean(r.expirationDate) ||
    Boolean(r.creationDate) ||
    (Array.isArray(r.nameServers) && r.nameServers.length > 0)
  );
}

function convertYisiToAnalyzeResult(r: YisiResult, domain: string): WhoisAnalyzeResult {
  const statuses: DomainStatusProps[] = Array.isArray(r.status)
    ? r.status.map((s) => ({ status: s.status, url: s.url ?? "" }))
    : [];

  const nameServers = Array.isArray(r.nameServers) ? r.nameServers.map((ns) => ns.toUpperCase()) : [];

  return {
    ...initialWhoisAnalyzeResult,
    domain: r.domain || domain,
    registrar: str(r.registrar),
    registrarURL: str(r.registrarURL),
    ianaId: str(r.ianaId, "N/A"),
    whoisServer: str(r.whoisServer),
    creationDate: formatDate(r.creationDate),
    expirationDate: formatDate(r.expirationDate),
    updatedDate: formatDate(r.updatedDate),
    status: statuses,
    nameServers,
    registrantOrganization: str(r.registrantOrganization || r.registrantOrganizationEn),
    registrantProvince: str(r.registrantProvince),
    registrantCountry: str(r.registrantCountry),
    registrantPhone: str(r.registrantPhone),
    registrantEmail: str(r.registrantEmail),
    dnssec: r.dnssec ? r.dnssec.toLowerCase() : "unsigned",
    rawWhoisContent: r.rawWhoisContent || "",
    domainAge: typeof r.domainAge === "number" ? r.domainAge : null,
    remainingDays: typeof r.remainingDays === "number" ? r.remainingDays : null,
    registerPrice: null,
    renewPrice: null,
    transferPrice: null,
  };
}

/**
 * Try fetching from yisi.yun. Returns a successful WhoisResult if data is
 * available, or null if yisi also has nothing (so the caller can show the
 * original error to the user).
 */
export async function lookupYisi(domain: string): Promise<WhoisResult | null> {
  try {
    const json = await yisiFetch(domain);
    if (!json || !json.status || !json.result) return null;

    const r = json.result;
    if (!hasUsableData(r)) return null;

    const analyzeResult = convertYisiToAnalyzeResult(r, domain);

    return {
      time: json.time ?? 0,
      status: true,
      cached: json.cached ?? false,
      source: "whois",
      result: analyzeResult,
    };
  } catch {
    return null;
  }
}
