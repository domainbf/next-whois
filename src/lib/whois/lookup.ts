import { MAX_WHOIS_FOLLOW, LOOKUP_TIMEOUT } from "@/lib/env";
import { WhoisResult, WhoisAnalyzeResult } from "@/lib/whois/types";
import { getJsonRedisValue, setJsonRedisValue } from "@/lib/server/redis";
import { analyzeWhois } from "@/lib/whois/common_parser";
import { extractDomain } from "@/lib/utils";
import { lookupRdap, convertRdapToWhoisResult } from "@/lib/whois/rdap_client";
import { whoisDomain, whoisIp, whoisAsn, whoisQuery } from "whoiser";
import { domainToASCII } from "url";
import {
  getCustomServerEntry,
  isHttpEntry,
  isScraperEntry,
  getTcpHost,
  isUserManagedServer,
  HttpServerEntry,
} from "@/lib/whois/custom-servers";
import { probeDomain } from "@/lib/whois/dns-check";
import { lookupNicBa } from "@/lib/whois/http-scrapers/nic-ba";
import { lookupYisi } from "@/lib/whois/yisi-fallback";

class ScraperRequiredError extends Error {
  registryUrl: string;
  blocked: boolean;
  constructor(message: string, registryUrl: string, blocked = false) {
    super(message);
    this.name = "ScraperRequiredError";
    this.registryUrl = registryUrl;
    this.blocked = blocked;
  }
}

const WHOIS_ERROR_PATTERNS = [
  /no match/i,
  /not found/i,
  /no data found/i,
  /no entries found/i,
  /no object found/i,
  /nothing found/i,
  /invalid query/i,
  /error:/i,
  /malformed/i,
  /object does not exist/i,
  /domain not found/i,
  /status:\s*free/i,
  /status:\s*available/i,
  /is available for/i,
  /no whois information/i,
  /tld is not supported/i,
];

const WHOIS_NOT_REGISTERED_PATTERNS = [
  /no match/i,
  /not found/i,
  /no data found/i,
  /no entries found/i,
  /no object found/i,
  /nothing found/i,
  /object does not exist/i,
  /domain not found/i,
  /status:\s*free/i,
  /status:\s*available/i,
  /is available for/i,
];

function isNotRegisteredWhoisResponse(whoisError: string): boolean {
  return WHOIS_NOT_REGISTERED_PATTERNS.some((p) => p.test(whoisError));
}

function toAsciiDomain(domain: string): string {
  if (!/[^\x00-\x7F]/.test(domain)) return domain;
  try {
    const ascii = domainToASCII(domain.toLowerCase());
    if (ascii && ascii !== domain.toLowerCase() && !ascii.includes("\u0000")) {
      return ascii;
    }
  } catch {}
  return domain;
}

function isIanaFallback(raw: string): boolean {
  return raw.includes("% IANA WHOIS server");
}

function detectWhoisError(raw: string): string | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith("%") &&
        !l.startsWith("#") &&
        !l.startsWith(">>>") &&
        !l.startsWith("NOTICE") &&
        !l.startsWith("TERMS OF USE"),
    );
  if (lines.length === 0) return "Empty WHOIS response";

  for (const pattern of WHOIS_ERROR_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const matchLine = raw.split("\n").find((l) => pattern.test(l));
      return matchLine?.trim() || match[0];
    }
  }
  return null;
}

function isEmptyResult(result: {
  domain: string;
  registrar: string;
  creationDate: string;
  expirationDate: string;
  nameServers: string[];
  cidr: string;
  netRange: string;
  netName: string;
  originAS: string;
  inetNum: string;
  inet6Num: string;
}): boolean {
  const hasIpData =
    (result.cidr && result.cidr !== "Unknown") ||
    (result.netRange && result.netRange !== "Unknown") ||
    (result.netName && result.netName !== "Unknown") ||
    (result.originAS && result.originAS !== "Unknown") ||
    (result.inetNum && result.inetNum !== "Unknown") ||
    (result.inet6Num && result.inet6Num !== "Unknown");
  if (hasIpData) return false;

  return (
    (!result.domain || result.domain === "") &&
    result.registrar === "Unknown" &&
    result.creationDate === "Unknown" &&
    result.expirationDate === "Unknown" &&
    result.nameServers.length === 0
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

interface WhoisRawResult {
  raw: string;
  structured: Record<string, any>;
  server: string;
  registryUrl?: string;
}

function isIPAddress(query: string): boolean {
  const bare = query.replace(/\/\d{1,3}$/, "");
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(bare) ||
    /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(bare)
  );
}

function isASNumber(query: string): boolean {
  return /^AS\d+$/i.test(query);
}

function queryWhoisTcp(
  host: string,
  port: number,
  query: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const net = require("node:net") as typeof import("net");
    let data = "";
    const socket = net.connect({ host, port }, () =>
      socket.write(query + "\r\n"),
    );
    socket.setTimeout(timeoutMs);
    socket.on("data", (chunk: Buffer) => (data += chunk.toString()));
    socket.on("close", () => resolve(data));
    socket.on("timeout", () => socket.destroy(new Error("TCP WHOIS timeout")));
    socket.on("error", reject);
  });
}

function stripHtmlToWhoisText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:tr|p|div|li|h[1-6]|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

async function queryWhoisHttp(
  entry: HttpServerEntry,
  domain: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const placeholder = (s: string) => s.replace(/\{\{domain\}\}/g, domain);
  const url = placeholder(entry.url);
  const method = entry.method || "GET";

  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; next-whois-ui/1.0; +https://github.com/zmh-program/next-whois-ui)",
        Accept: "text/plain, text/html, */*",
      },
    };
    if (method === "POST") {
      init.body = entry.body ? placeholder(entry.body) : domain;
      (init.headers as Record<string, string>)["Content-Type"] =
        "application/x-www-form-urlencoded";
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      throw new Error(`HTTP WHOIS server returned ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (contentType.includes("text/html") || text.trimStart().startsWith("<!")) {
      return stripHtmlToWhoisText(text);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function getLookupWhois(domain: string): Promise<WhoisRawResult> {
  if (isIPAddress(domain)) {
    const ip = domain.replace(/\/\d{1,3}$/, "");
    const data = await whoisIp(ip, { timeout: LOOKUP_TIMEOUT });
    return {
      raw: (data as any).__raw || "",
      structured: data as any,
      server: "ip-whois",
    };
  }

  if (isASNumber(domain)) {
    const asNum = parseInt(domain.replace(/^AS/i, ""));
    const data = await whoisAsn(asNum, { timeout: LOOKUP_TIMEOUT });
    return {
      raw: (data as any).__raw || "",
      structured: data as any,
      server: "asn-whois",
    };
  }

  const rawExtracted = extractDomain(domain) || domain;
  const domainToQuery = toAsciiDomain(rawExtracted);
  const follow = Math.min(Math.max(MAX_WHOIS_FOLLOW, 1), 2) as 1 | 2;
  const tld = domainToQuery.split(".").slice(1).join(".");
  const tldSuffix = domainToQuery.split(".").pop() || "";
  const customEntry =
    (await getCustomServerEntry(tld)) || (await getCustomServerEntry(tldSuffix));

  const isUserServer =
    (await isUserManagedServer(tld)) || (await isUserManagedServer(tldSuffix));

  if (customEntry) {
    if (isScraperEntry(customEntry)) {
      const { name: scraperName, registryUrl } = customEntry;
      if (scraperName === "nic-ba") {
        const nicBaResult = await lookupNicBa(domainToQuery, LOOKUP_TIMEOUT);
        if (nicBaResult.success) {
          return {
            raw: nicBaResult.raw,
            structured: {},
            server: "nic.ba",
            registryUrl,
          };
        }
        const nicBaFail = nicBaResult as { success: false; blocked: boolean; reason: string };
        throw new ScraperRequiredError(
          nicBaFail.blocked
            ? "nic.ba requires CAPTCHA verification — automated WHOIS lookup is not available for .ba domains"
            : `nic.ba scraper error: ${nicBaFail.reason}`,
          registryUrl,
          nicBaFail.blocked,
        );
      }
      throw new ScraperRequiredError(
        `No scraper implementation for "${scraperName}"`,
        registryUrl,
      );
    } else if (isHttpEntry(customEntry)) {
      const raw = await queryWhoisHttp(
        customEntry,
        domainToQuery,
        LOOKUP_TIMEOUT,
      );
      if (!raw || raw.trim().length === 0) {
        if (isUserServer) {
          throw new Error(
            `No data returned from HTTP WHOIS server: ${customEntry.url}`,
          );
        }
      } else {
        return { raw, structured: {}, server: customEntry.url };
      }
    } else {
      const tcpHost = getTcpHost(customEntry);
      if (tcpHost) {
        const port =
          typeof customEntry === "object" &&
          "port" in customEntry &&
          customEntry.port
            ? customEntry.port
            : 43;
        try {
          const raw =
            port === 43
              ? await whoisQuery(tcpHost, domainToQuery, LOOKUP_TIMEOUT)
              : await queryWhoisTcp(tcpHost, port, domainToQuery, LOOKUP_TIMEOUT);
          if (raw && raw.trim().length > 0) {
            return { raw, structured: {}, server: tcpHost };
          }
          if (isUserServer) {
            throw new Error(
              `No data returned from custom WHOIS server: ${tcpHost}`,
            );
          }
        } catch (tcpErr) {
          if (isUserServer) throw tcpErr;
        }
      }
    }
  }

  const data = await whoisDomain(domainToQuery, {
    raw: true,
    follow,
    timeout: LOOKUP_TIMEOUT,
  });

  const servers = Object.keys(data);
  if (servers.length === 0) throw new Error("No WHOIS server responded");

  const lastServer = servers[servers.length - 1];
  const structured = (data as any)[lastServer] || {};
  const rawParts: string[] = [];
  for (const s of servers) {
    const entry = (data as any)[s];
    if (entry?.__raw) {
      rawParts.push(entry.__raw);
    } else if (entry) {
      const lines: string[] = [];
      for (const [k, v] of Object.entries(entry)) {
        if (k === "text" || k === "__raw" || k === "__comments") continue;
        if (Array.isArray(v)) {
          for (const item of v) lines.push(`${k}: ${item}`);
        } else if (v !== undefined && v !== null && v !== "") {
          lines.push(`${k}: ${v}`);
        }
      }
      if (lines.length > 0) rawParts.push(lines.join("\n"));
    }
  }
  const raw = rawParts.join("\n\n") || "";

  return { raw, structured, server: lastServer };
}

function pickStr(a: string, b: string): string {
  return a && a !== "Unknown" && a !== "" ? a : b;
}

function mergeResults(
  rdap: WhoisAnalyzeResult,
  whoisParsed: WhoisAnalyzeResult,
): WhoisAnalyzeResult {
  return {
    domain: pickStr(rdap.domain, whoisParsed.domain),
    domainPunycode: rdap.domainPunycode || whoisParsed.domainPunycode,
    registrar: pickStr(rdap.registrar, whoisParsed.registrar),
    registrarURL: pickStr(rdap.registrarURL, whoisParsed.registrarURL),
    ianaId: pickStr(rdap.ianaId, whoisParsed.ianaId),
    whoisServer: pickStr(rdap.whoisServer, whoisParsed.whoisServer),
    updatedDate: pickStr(rdap.updatedDate, whoisParsed.updatedDate),
    creationDate: pickStr(rdap.creationDate, whoisParsed.creationDate),
    expirationDate: pickStr(rdap.expirationDate, whoisParsed.expirationDate),
    status: rdap.status.length > 0 ? rdap.status : whoisParsed.status,
    nameServers:
      rdap.nameServers.length > 0 ? rdap.nameServers : whoisParsed.nameServers,
    registrantOrganization: pickStr(
      rdap.registrantOrganization,
      whoisParsed.registrantOrganization,
    ),
    registrantProvince: pickStr(
      rdap.registrantProvince,
      whoisParsed.registrantProvince,
    ),
    registrantCountry: pickStr(
      rdap.registrantCountry,
      whoisParsed.registrantCountry,
    ),
    registrantPhone: pickStr(rdap.registrantPhone, whoisParsed.registrantPhone),
    registrantEmail: pickStr(rdap.registrantEmail, whoisParsed.registrantEmail),
    dnssec: pickStr(rdap.dnssec, whoisParsed.dnssec),
    rawWhoisContent: rdap.rawWhoisContent || whoisParsed.rawWhoisContent,
    rawRdapContent: rdap.rawRdapContent || whoisParsed.rawRdapContent,
    domainAge: rdap.domainAge ?? whoisParsed.domainAge,
    remainingDays: rdap.remainingDays ?? whoisParsed.remainingDays,
    registerPrice: rdap.registerPrice ?? whoisParsed.registerPrice,
    renewPrice: rdap.renewPrice ?? whoisParsed.renewPrice,
    transferPrice: rdap.transferPrice ?? whoisParsed.transferPrice,
    mozDomainAuthority:
      rdap.mozDomainAuthority || whoisParsed.mozDomainAuthority,
    mozPageAuthority: rdap.mozPageAuthority || whoisParsed.mozPageAuthority,
    mozSpamScore: rdap.mozSpamScore || whoisParsed.mozSpamScore,
    cidr: pickStr(rdap.cidr, whoisParsed.cidr),
    inetNum: pickStr(rdap.inetNum, whoisParsed.inetNum),
    inet6Num: pickStr(rdap.inet6Num, whoisParsed.inet6Num),
    netRange: pickStr(rdap.netRange, whoisParsed.netRange),
    netName: pickStr(rdap.netName, whoisParsed.netName),
    netType: pickStr(rdap.netType, whoisParsed.netType),
    originAS: pickStr(rdap.originAS, whoisParsed.originAS),
  };
}

export async function lookupWhoisWithCache(
  domain: string,
): Promise<WhoisResult> {
  const key = `whois:${domain}`;
  const cached = await getJsonRedisValue<WhoisResult>(key);
  if (cached) {
    return { ...cached, time: 0, cached: true };
  }

  const result = await lookupWhois(domain);
  if (result.status) {
    await setJsonRedisValue<WhoisResult>(key, result);
  }

  return { ...result, cached: false };
}

export async function lookupWhois(domain: string): Promise<WhoisResult> {
  const startTime = performance.now();
  const elapsed = () => (performance.now() - startTime) / 1000;

  const [rdapSettled, whoisSettled] = await Promise.allSettled([
    withTimeout(lookupRdap(domain), LOOKUP_TIMEOUT),
    withTimeout(getLookupWhois(domain), LOOKUP_TIMEOUT),
  ]);

  const rdapResult =
    rdapSettled.status === "fulfilled" ? rdapSettled.value : null;
  const rdapData = rdapResult && !rdapResult.errorCode ? rdapResult : null;
  const whoisData =
    whoisSettled.status === "fulfilled" ? whoisSettled.value : null;
  const rdapRaw = rdapData ? JSON.stringify(rdapData, null, 2) : undefined;
  const whoisRawData = whoisData?.raw || null;
  const whoisReturnedEmpty =
    whoisSettled.status === "fulfilled" &&
    whoisData !== null &&
    (!whoisData.raw || whoisData.raw.trim().length === 0);

  if (rdapData) {
    try {
      let result = await convertRdapToWhoisResult(rdapData, domain);

      if (whoisRawData) {
        if (!isIanaFallback(whoisRawData)) {
          try {
            const whoisParsed = await analyzeWhois(whoisRawData);
            result = mergeResults(result, whoisParsed);
          } catch {}
        }
        result.rawWhoisContent = whoisRawData;
      }
      if (whoisData?.server) {
        result.whoisServer = pickStr(result.whoisServer, whoisData.server);
      }
      result.rawRdapContent = rdapRaw!;

      return {
        time: elapsed(),
        status: true,
        cached: false,
        source: "rdap",
        result,
      };
    } catch {}
  }

  const isDomainQuery = !isIPAddress(domain) && !isASNumber(domain);

  const whoisError =
    whoisSettled.status === "rejected" ? whoisSettled.reason : null;
  const scraperRegistryUrl =
    whoisError instanceof ScraperRequiredError
      ? whoisError.registryUrl
      : undefined;

  async function failWithDns(
    error: string,
    registryUrl?: string,
  ): Promise<WhoisResult> {
    const dnsProbe = isDomainQuery
      ? await probeDomain(domain).catch(() => undefined)
      : undefined;
    return {
      time: elapsed(),
      status: false,
      cached: false,
      error,
      dnsProbe,
      registryUrl,
    };
  }

  // Try yisi.yun as a fallback before giving up; only for domain queries.
  async function tryYisiOrFail(
    error: string,
    registryUrl?: string,
  ): Promise<WhoisResult> {
    if (isDomainQuery) {
      const yisiResult = await lookupYisi(domain).catch(() => null);
      if (yisiResult) return yisiResult;
    }
    return failWithDns(error, registryUrl);
  }

  if (whoisRawData) {
    if (isIanaFallback(whoisRawData)) {
      return tryYisiOrFail("No WHOIS/RDAP server available for this TLD");
    }

    try {
      const result = await analyzeWhois(whoisRawData);

      const whoisError = detectWhoisError(whoisRawData);
      if (whoisError || isEmptyResult(result)) {
        if (whoisError && isNotRegisteredWhoisResponse(whoisError)) {
          if (isDomainQuery) {
            const yisiResult = await lookupYisi(domain).catch(() => null);
            if (yisiResult) return yisiResult;
          }
          return {
            time: elapsed(),
            status: false,
            cached: false,
            error: whoisError,
            dnsProbe: {
              domain,
              registrationStatus: "unregistered",
              confidence: "high",
              signals: [],
              nameservers: [],
              ipv4: [],
              ipv6: [],
              mx: [],
              hasSsl: null,
            },
          };
        }
        return tryYisiOrFail(whoisError || "Empty WHOIS response");
      }

      if (whoisData?.server) {
        result.whoisServer = pickStr(result.whoisServer, whoisData.server);
      }
      if (rdapRaw) result.rawRdapContent = rdapRaw;

      return {
        time: elapsed(),
        status: true,
        cached: false,
        source: "whois",
        result,
      };
    } catch (parseError: unknown) {
      return tryYisiOrFail(
        parseError instanceof Error
          ? parseError.message
          : "Failed to parse WHOIS response",
      );
    }
  }

  const rdapError =
    rdapSettled.status === "rejected" ? rdapSettled.reason : null;
  const whoisMsg = whoisError?.message || "";
  const rdapMsg = rdapError?.message || "";
  const isTldUnsupported = /not supported/i.test(whoisMsg);
  const isInternalError =
    /cannot read properties/i.test(whoisMsg) ||
    /cannot read properties/i.test(rdapMsg);
  const isWhoisServerEmpty =
    whoisReturnedEmpty && whoisData?.server && whoisData.server !== "ip-whois";
  const errMsg = isTldUnsupported
    ? "WHOIS/RDAP not available for this TLD"
    : isInternalError
      ? "No WHOIS/RDAP data found for this query"
      : isWhoisServerEmpty
        ? `WHOIS server (${whoisData!.server}) connected but returned no data — the server may restrict access by IP or require queries from the registry's country`
        : whoisMsg || rdapMsg || "Unknown error occurred";
  return tryYisiOrFail(errMsg, scraperRegistryUrl);
}
