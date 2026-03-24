import { MAX_WHOIS_FOLLOW, LOOKUP_TIMEOUT } from "@/lib/env";
// intEnv re-used here so we can override per-protocol timeouts via env vars
function intEnv(name: string, def: number): number {
  const v = typeof process !== "undefined" ? process.env[name] : undefined;
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? def : n;
}
import { WhoisResult, WhoisAnalyzeResult, initialWhoisAnalyzeResult } from "@/lib/whois/types";
import {
  getJsonRedisValueWithTtl,
  setJsonRedisValue,
  isRedisAvailable,
  getRemainingTtl,
} from "@/lib/server/redis";

const L1_TTL_MS = 30_000;
const L1_MAX = 500;
type MemEntry = { value: WhoisResult; expiresAt: number };
const _memCache = new Map<string, MemEntry>();
function l1Get(key: string): WhoisResult | null {
  const entry = _memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _memCache.delete(key); return null; }
  return entry.value;
}
function l1Set(key: string, value: WhoisResult) {
  if (_memCache.size >= L1_MAX) {
    const oldest = _memCache.keys().next().value;
    if (oldest) _memCache.delete(oldest);
  }
  _memCache.set(key, { value, expiresAt: Date.now() + L1_TTL_MS });
}
import { analyzeWhois } from "@/lib/whois/common_parser";
import { extractDomain } from "@/lib/utils";
import { lookupRdap, convertRdapToWhoisResult } from "@/lib/whois/rdap_client";
// whoiser is ESM-only; use dynamic import() so CJS serverless can load it.
// The module promise is held at module level so subsequent calls are instant
// (Node.js caches the fulfilled promise rather than re-parsing the bundle).
let _whoiserPromise: Promise<typeof import("whoiser")> | null = null;
const getWhoiser = () => {
  if (!_whoiserPromise) _whoiserPromise = import("whoiser");
  return _whoiserPromise;
};
// Warm up eagerly — by the time the first request arrives the module is loaded.
void getWhoiser();
import { domainToASCII } from "url";
import {
  getCustomServerEntry,
  isTldKnownNoServer,
  isHttpEntry,
  isScraperEntry,
  getTcpHost,
  isUserManagedServer,
  HttpServerEntry,
} from "@/lib/whois/custom-servers";
import { probeDomain } from "@/lib/whois/dns-check";
import { lookupNicBa } from "@/lib/whois/http-scrapers/nic-ba";
import { lookupYisi } from "@/lib/whois/yisi-fallback";
import { lookupTianhu } from "@/lib/whois/tianhu-fallback";
import { isTldFallbackEnabled, recordTldNativeFailure, recordTldNativeSuccess, forceTldFallback } from "@/lib/whois/tld-fallback-gate";
import { isRdapSkipped, markRdapSkipped, markRdapSupported, initRdapSkipCache } from "@/lib/whois/tld-rdap-skip";
import { getCnReservedSldInfo } from "@/lib/whois/cn-reserved-sld";

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
    const { whoisIp } = await getWhoiser();
    const data = await whoisIp(ip, { timeout: LOOKUP_TIMEOUT });
    return {
      raw: (data as any).__raw || "",
      structured: data as any,
      server: "ip-whois",
    };
  }

  if (isASNumber(domain)) {
    const asNum = parseInt(domain.replace(/^AS/i, ""));
    const { whoisAsn } = await getWhoiser();
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
  // Deduplicate DB calls when tld and tldSuffix are identical (all 2-part domains like .com/.net).
  let customEntry: Awaited<ReturnType<typeof getCustomServerEntry>>;
  let isUserServer: boolean;
  if (tld === tldSuffix) {
    const [ce, us] = await Promise.all([getCustomServerEntry(tld), isUserManagedServer(tld)]);
    customEntry = ce;
    isUserServer = us;
  } else {
    const [[ce1, ce2], [us1, us2]] = await Promise.all([
      Promise.all([getCustomServerEntry(tld), getCustomServerEntry(tldSuffix)]),
      Promise.all([isUserManagedServer(tld), isUserManagedServer(tldSuffix)]),
    ]);
    customEntry = ce1 || ce2;
    isUserServer = us1 || us2;
  }

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
          const { whoisQuery } = await getWhoiser();
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

  // Short-circuit: TLD is explicitly listed as having no public WHOIS server.
  // Avoids the whoiser attempt + TCP timeout and returns a fast informative error.
  if (await isTldKnownNoServer(tld || tldSuffix)) {
    throw new Error(`No public WHOIS server available for .${tld || tldSuffix} domains`);
  }

  const { whoisDomain } = await getWhoiser();
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
    negotiable: rdap.negotiable ?? whoisParsed.negotiable,
    cidr: pickStr(rdap.cidr, whoisParsed.cidr),
    inetNum: pickStr(rdap.inetNum, whoisParsed.inetNum),
    inet6Num: pickStr(rdap.inet6Num, whoisParsed.inet6Num),
    netRange: pickStr(rdap.netRange, whoisParsed.netRange),
    netName: pickStr(rdap.netName, whoisParsed.netName),
    netType: pickStr(rdap.netType, whoisParsed.netType),
    originAS: pickStr(rdap.originAS, whoisParsed.originAS),
  };
}

// ── Smart cache TTL ────────────────────────────────────────────────────────
// Returns the number of seconds to cache a lookup result in Redis.
// Strategy:
//   • IP / ASN queries             → 24 h  (IP allocations change rarely)
//   • registry-reserved / pending  → 12 h  (status changes slowly)
//   • available / unregistered     →  5 min (could be registered any moment)
//   • registered, expired          → 10 min (may be re-registered soon)
//   • registered, expiring ≤ 7 d   → 30 min (could change hands)
//   • registered, remaining ≤ 60 d →  1 h
//   • registered, remaining > 60 d →  6 h  (very stable data)
//   • error / unknown              →  0     (do not cache failures)
export function computeSmartTtl(result: WhoisResult): number {
  if (!result.status || !result.result) return 0;

  const r = result.result;

  const isIpQuery =
    (r.cidr    && r.cidr    !== "Unknown") ||
    (r.inetNum && r.inetNum !== "Unknown") ||
    (r.inet6Num && r.inet6Num !== "Unknown") ||
    (r.originAS && r.originAS !== "Unknown") ||
    (r.netRange && r.netRange !== "Unknown");
  if (isIpQuery) return 86_400;

  const statuses = (r.status || []).map((s) => s.status?.toLowerCase() ?? "");
  const isReserved =
    statuses.some((s) => s.includes("registry-reserved")) ||
    statuses.some((s) => s.includes("pending"));
  if (isReserved) return 43_200;

  const hasRegistrar   = r.registrar    && r.registrar    !== "Unknown";
  const hasExpiry      = r.expirationDate && r.expirationDate !== "Unknown";
  const hasNameServers = r.nameServers  && r.nameServers.length > 0;
  const hasCreation    = r.creationDate && r.creationDate !== "Unknown";
  const isRegistered   = !!(hasRegistrar || hasExpiry || hasCreation || hasNameServers);

  if (!isRegistered) return 300;

  const remaining = r.remainingDays;
  if (remaining !== null && remaining !== undefined) {
    if (remaining <= 0)  return 600;
    if (remaining <= 7)  return 1_800;
    if (remaining <= 60) return 3_600;
  }

  return 21_600;
}

export async function lookupWhoisWithCache(
  domain: string,
): Promise<WhoisResult> {
  // ── CN Reserved SLD short-circuit ──────────────────────────────────────────
  const cnReserved = getCnReservedSldInfo(domain);
  if (cnReserved) {
    return {
      time: 0,
      status: true,
      cached: false,
      cacheTtl: 43_200,
      source: "whois",
      result: {
        ...initialWhoisAnalyzeResult,
        domain,
        status: [{ status: "registry-reserved", url: "" }],
        rawWhoisContent: `[CN Reserved] ${cnReserved.descZh}`,
      },
    };
  }

  const key = `whois:${domain}`;

  // L1 — in-process memory cache (30 s, survives within the same lambda instance)
  const l1Hit = l1Get(key);
  if (l1Hit) {
    const remainingTtl = await getRemainingTtl(key).catch(() => null);
    return { ...l1Hit, time: 0, cached: true, cachedAt: l1Hit.cachedAt, cacheTtl: remainingTtl ?? l1Hit.cacheTtl };
  }

  // L2 — Redis (smart TTL per domain type)
  if (isRedisAvailable()) {
    const l2 = await getJsonRedisValueWithTtl<WhoisResult>(key);
    if (l2) {
      l1Set(key, l2.value);
      return { ...l2.value, time: 0, cached: true, cachedAt: l2.value.cachedAt, cacheTtl: l2.remainingTtl ?? l2.value.cacheTtl };
    }
  }

  // Cache miss — perform live lookup
  const result = await lookupWhois(domain);

  if (result.status) {
    const ttl = computeSmartTtl(result);
    const now = Date.now();
    const toStore: WhoisResult = { ...result, cachedAt: now, cacheTtl: ttl };
    l1Set(key, toStore);
    if (isRedisAvailable() && ttl > 0) {
      setJsonRedisValue<WhoisResult>(key, toStore, ttl).catch(() => {});
    }
    return { ...result, cached: false, cachedAt: now, cacheTtl: ttl };
  }

  return { ...result, cached: false };
}

// After RDAP succeeds, wait at most this long for WHOIS (for raw content merging).
// 350 ms is enough to catch WHOIS responses that arrive just after RDAP without
// meaningfully delaying the response when WHOIS is truly slow.
const WHOIS_MERGE_WAIT_MS = 350;

// Separate timeout caps for each protocol.
// RDAP is HTTP/JSON (fast on Vercel's network) — 2 s is generous.
// WHOIS TCP varies more; give legitimate slow servers 4 s before giving up.
const RDAP_TIMEOUT  = intEnv("RDAP_TIMEOUT_MS",  2_000);
const WHOIS_TIMEOUT = intEnv("WHOIS_TIMEOUT_MS", 4_000);

// How long to wait for native lookups before starting third-party fallbacks
// in parallel.  Set shorter than WHOIS_TIMEOUT so that slow WHOIS servers
// don't block the response: fallbacks start racing at t=2.5 s while WHOIS
// TCP is still open, whichever responds first wins.
const FALLBACK_START_MS = intEnv("FALLBACK_START_MS", 2_000);

export async function lookupWhois(domain: string): Promise<WhoisResult> {
  const startTime = performance.now();
  const elapsed = () => (performance.now() - startTime) / 1000;
  const isDomainQuery = !isIPAddress(domain) && !isASNumber(domain);

  // ── Initialise RDAP-skip cache (no-op after first call) ──────────────────
  await initRdapSkipCache();

  // ── Determine strategy: skip RDAP? start yisi in parallel? ───────────────
  const tldSuffix = domain.split(".").pop()?.toLowerCase() ?? "";
  const skipRdap = isDomainQuery && isRdapSkipped(tldSuffix);

  // Check fallback gate upfront — if already enabled we race yisi/tianhu
  // alongside native from the start rather than only as last resort.
  const useFallbackEarly = isDomainQuery
    ? await isTldFallbackEnabled(domain).catch(() => false)
    : false;

  // ── Build promise pool ────────────────────────────────────────────────────
  // RDAP: only if not skipped; uses a shorter cap (RDAP_TIMEOUT) since it's HTTP/JSON.
  // IMPORTANT: never use Promise.reject() here — an unattached rejected promise causes
  // UnhandledPromiseRejection crashes in Node 15+.  When skipRdap is true, rdapPromise
  // is excluded from taggedRacers entirely, so Promise.resolve(null) is safe.
  const rdapPromise: Promise<any> = skipRdap
    ? Promise.resolve(null)
    : withTimeout(lookupRdap(domain), RDAP_TIMEOUT);

  // WHOIS TCP is inherently slower; give it a bit more headroom.
  const whoisPromise = withTimeout(getLookupWhois(domain), WHOIS_TIMEOUT);

  // Yisi / Tianhu: started immediately when the fallback gate is already open.
  // This lets a fast third-party response beat a slow native timeout.
  const yisiEarlyPromise: Promise<WhoisResult | null> = useFallbackEarly
    ? Promise.all([
        lookupTianhu(domain).catch(() => null),
        lookupYisi(domain).catch(() => null),
      ]).then(([t, y]) => t ?? y)
    : Promise.resolve(null);

  // Progressive fallback: fires after FALLBACK_START_MS even while native
  // lookups are still in-flight, so third-party APIs race alongside a slow
  // WHOIS TCP connection instead of waiting for it to fully time out.
  //
  // If the early-gate is already open (useFallbackEarly=true), yisiEarlyPromise
  // is already racing; no need to run the progressive path at all.
  //
  // nativeWon is set to true as soon as firstNonNull() resolves with a non-null
  // winner, so that if native finishes before the delay we skip third-party calls.
  let nativeWon = false;
  const progressiveFallbackRacer: Promise<WhoisResult | null> = isDomainQuery
    ? (async () => {
        // Skip if early-gate yisi/tianhu are already racing in parallel
        if (useFallbackEarly) return null;
        // Wait for EITHER all native lookups to settle OR the eager-start timer,
        // whichever comes first.  This way a slow WHOIS TCP server doesn't block
        // the response — fallbacks start racing at FALLBACK_START_MS.
        await Promise.race([
          Promise.allSettled([
            ...(skipRdap ? [] : [rdapPromise]),
            whoisPromise,
          ]),
          new Promise<void>(resolve => setTimeout(resolve, FALLBACK_START_MS)),
        ]);
        // Native won the race — no third-party calls needed
        if (nativeWon) return null;
        // Native is slow or failed → fire third-party in parallel with any
        // still-running native; whichever responds first wins overall.
        const [t, y] = await Promise.all([
          lookupTianhu(domain).catch(() => null),
          lookupYisi(domain).catch(() => null),
        ]);
        return t ?? y;
      })()
    : Promise.resolve(null);

  // ── Race: first to produce a *tagged, non-null* result wins ──────────────
  // Important: null resolvers (failed/skipped) must never short-circuit the
  // race — we use a custom "first non-null" race instead of Promise.race.
  type Tagged =
    | { tag: "rdap"; value: any }
    | { tag: "whois"; value: Awaited<ReturnType<typeof getLookupWhois>> }
    | { tag: "yisi_early"; value: WhoisResult }
    | { tag: "yisi_progressive"; value: WhoisResult };

  function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
    return new Promise(resolve => {
      let remaining = promises.length;
      if (remaining === 0) { resolve(null); return; }
      for (const p of promises) {
        p.then(v => { if (v !== null) resolve(v); })
         .catch(() => {})
         .finally(() => { if (--remaining === 0) resolve(null); });
      }
    });
  }

  const taggedRacers: Promise<Tagged | null>[] = [
    // Only add RDAP to the race when it's not statically skipped
    ...(skipRdap ? [] : [
      rdapPromise.then(
        v => (v && !v.errorCode ? { tag: "rdap" as const, value: v } : null),
        () => null,
      ),
    ]),
    whoisPromise.then(
      v => ({ tag: "whois" as const, value: v }),
      () => null,
    ),
    // Yisi started early (when fallback gate already open)
    ...(useFallbackEarly ? [
      yisiEarlyPromise.then(
        v => (v ? { tag: "yisi_early" as const, value: v } : null),
        () => null,
      ),
    ] : []),
    // Progressive fallback (always included for domain queries)
    progressiveFallbackRacer.then(
      v => (v ? { tag: "yisi_progressive" as const, value: v } : null),
      () => null,
    ),
  ];

  const first = await firstNonNull(taggedRacers);

  // Signal the progressive fallback that native (RDAP/WHOIS/yisi_early) already
  // produced a result — it will skip the third-party API calls when it checks in.
  if (first !== null) nativeWon = true;

  // ── Settle remaining promises depending on what won ───────────────────────
  let rdapSettled: PromiseSettledResult<Awaited<ReturnType<typeof lookupRdap>>>;
  let whoisSettled: PromiseSettledResult<Awaited<ReturnType<typeof getLookupWhois>>>;

  // If yisi/tianhu won the race (either early or progressive), return early.
  if (first?.tag === "yisi_early" || first?.tag === "yisi_progressive") {
    // Settle quietly in background for RDAP learning only
    if (!skipRdap) {
      Promise.allSettled([rdapPromise]).then(([r]) => {
        if (r.status === "fulfilled" && r.value && !r.value.errorCode) {
          markRdapSupported(tldSuffix).catch(() => {});
        } else if (r.status === "rejected") {
          const msg = (r.reason as Error)?.message ?? "";
          if (/no rdap server/i.test(msg)) markRdapSkipped(tldSuffix).catch(() => {});
        }
      });
    }
    if (first.tag === "yisi_progressive") {
      // Progressive hit = native path was slow → open fallback gate for next time
      forceTldFallback(domain).catch(() => {});
    }
    return first.value;
  }

  if (first?.tag === "rdap") {
    // RDAP finished first with good data — wait briefly for WHOIS raw merging
    rdapSettled = { status: "fulfilled", value: first.value };
    const whoisWithDeadline = await Promise.race([
      whoisPromise.then(v => v, () => null),
      new Promise<null>(resolve => setTimeout(() => resolve(null), WHOIS_MERGE_WAIT_MS)),
    ]);
    whoisSettled = whoisWithDeadline !== null
      ? { status: "fulfilled", value: whoisWithDeadline }
      : { status: "rejected", reason: new Error("WHOIS merge deadline") };
  } else if (first?.tag === "whois") {
    // WHOIS finished first — use it immediately, wait briefly for RDAP enrichment
    whoisSettled = { status: "fulfilled", value: first.value };
    if (skipRdap) {
      rdapSettled = { status: "rejected", reason: new Error("RDAP skipped for this TLD") };
    } else {
      const rdapWithDeadline = await Promise.race([
        rdapPromise.then(v => v, () => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), WHOIS_MERGE_WAIT_MS)),
      ]);
      rdapSettled = rdapWithDeadline !== null
        ? { status: "fulfilled", value: rdapWithDeadline }
        : { status: "rejected", reason: new Error("RDAP merge deadline") };
    }
  } else {
    // All native lookups failed — settle both definitively
    if (skipRdap) {
      rdapSettled = { status: "rejected", reason: new Error("RDAP skipped for this TLD") };
      whoisSettled = await whoisPromise.then(
        v => ({ status: "fulfilled" as const, value: v }),
        e => ({ status: "rejected" as const, reason: e }),
      );
    } else {
      [rdapSettled, whoisSettled] = await Promise.allSettled([rdapPromise, whoisPromise]);
    }
  }

  // ── Learn RDAP support status from this query ─────────────────────────────
  if (!skipRdap) {
    if (rdapSettled.status === "fulfilled" && rdapSettled.value && !rdapSettled.value.errorCode) {
      markRdapSupported(tldSuffix).catch(() => {});
    } else if (rdapSettled.status === "rejected") {
      const msg = (rdapSettled.reason as Error)?.message ?? "";
      if (/no rdap server/i.test(msg) || /not found/i.test(msg)) {
        markRdapSkipped(tldSuffix).catch(() => {});
      }
    }
  }

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

      recordTldNativeSuccess(domain).catch(() => {});
      return {
        time: elapsed(),
        status: true,
        cached: false,
        source: "rdap",
        result,
      };
    } catch {}
  }

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

  /**
   * Try yisi/tianhu as a last-resort fallback.
   * When useFallbackEarly was already true the early promise is already
   * settled — we await it cheaply rather than firing new requests.
   */
  async function tryYisiOrFail(
    error: string,
    registryUrl?: string,
  ): Promise<WhoisResult> {
    if (isDomainQuery) {
      if (useFallbackEarly) {
        // Already launched — just await the settled promise
        const earlyResult = await yisiEarlyPromise.catch(() => null);
        if (earlyResult) return earlyResult;
      } else {
        const useFallback = await isTldFallbackEnabled(domain);
        if (useFallback) {
          const [tianhuResult, yisiResult] = await Promise.all([
            lookupTianhu(domain).catch(() => null),
            lookupYisi(domain).catch(() => null),
          ]);
          if (tianhuResult) return tianhuResult;
          if (yisiResult) return yisiResult;
        } else {
          recordTldNativeFailure(domain).catch(() => {});
        }
      }
    }
    return failWithDns(error, registryUrl);
  }

  if (whoisRawData) {
    if (isIanaFallback(whoisRawData)) {
      return tryYisiOrFail("No WHOIS/RDAP server available for this TLD");
    }

    try {
      const result = await analyzeWhois(whoisRawData);

      const detectedWhoisError = detectWhoisError(whoisRawData);
      if (detectedWhoisError || isEmptyResult(result)) {
        if (detectedWhoisError && isNotRegisteredWhoisResponse(detectedWhoisError)) {
          // Check yisi/tianhu even for "not found" responses — some WHOIS servers
          // return "not found" for reserved/premium domains that third parties know about.
          if (useFallbackEarly) {
            const earlyResult = await yisiEarlyPromise.catch(() => null);
            if (earlyResult) return earlyResult;
          } else if (isDomainQuery && await isTldFallbackEnabled(domain)) {
            const [tianhuResult, yisiResult] = await Promise.all([
              lookupTianhu(domain).catch(() => null),
              lookupYisi(domain).catch(() => null),
            ]);
            if (tianhuResult) return tianhuResult;
            if (yisiResult) return yisiResult;
          }
          return {
            time: elapsed(),
            status: false,
            cached: false,
            error: detectedWhoisError,
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
        return tryYisiOrFail(detectedWhoisError || "Empty WHOIS response");
      }

      if (whoisData?.server) {
        result.whoisServer = pickStr(result.whoisServer, whoisData.server);
      }
      if (rdapRaw) result.rawRdapContent = rdapRaw;

      recordTldNativeSuccess(domain).catch(() => {});
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
