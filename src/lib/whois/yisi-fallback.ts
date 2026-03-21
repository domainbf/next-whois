/**
 * Fallback WHOIS lookup via yisi.yun API.
 * Called when native RDAP + WHOIS produce no usable result for a domain.
 */

import { WhoisResult, WhoisAnalyzeResult, DomainStatusProps, initialWhoisAnalyzeResult } from "@/lib/whois/types";

const YISI_API = "https://yisi.yun/api/lookup";
const YISI_TIMEOUT = 10_000;

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

function str(v: string | null | undefined, fallback = "Unknown"): string {
  if (!v || v.trim() === "" || v.trim().toLowerCase() === "unknown") return fallback;
  return v.trim();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(".000Z", " UTC");
  } catch {
    return iso;
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

  const nameServers = Array.isArray(r.nameServers)
    ? r.nameServers.map((ns) => ns.toUpperCase())
    : [];

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
    // Pricing is handled separately by our own pipeline
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), YISI_TIMEOUT);

    const res = await fetch(
      `${YISI_API}?query=${encodeURIComponent(domain)}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));

    if (!res.ok) return null;

    const json: YisiResponse = await res.json();
    if (!json.status || !json.result) return null;

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
