import type { NextApiRequest, NextApiResponse } from "next";
import { lookupWhoisWithCache } from "@/lib/whois/lookup";
import { WhoisAnalyzeResult, initialWhoisAnalyzeResult } from "@/lib/whois/types";
import { DnsProbeResult } from "@/lib/whois/dns-check";
import { run, isDbReady, one } from "@/lib/db-query";
import { randomBytes } from "crypto";
import { rateLimit, getClientIp } from "@/lib/server/rate-limit";
import { getCnReservedSldInfo } from "@/lib/whois/cn-reserved-sld";
import { enforceApiKey } from "@/lib/access-key";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { scoreDomain, shouldAlertAdmin } from "@/lib/domain-value";
import { sendEmail, highValueAlertHtml, getSiteLabel } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { checkHotPrefix } from "@/lib/server/hot-prefix-cache";
import { analyzeDomainWithAi } from "@/lib/server/domain-value-ai";

export const config = {
  maxDuration: 30,
};

// Rate limit: 40 requests per 60 s per IP
const RATE_LIMIT        = 40;
const RATE_WINDOW_MS    = 60_000;
// Maximum accepted query length (domain names: 253 chars per RFC 1035)
const MAX_QUERY_LENGTH  = 300;

type Data = {
  status: boolean;
  time: number;
  cached?: boolean;
  cachedAt?: number;
  cacheTtl?: number;
  source?: "rdap" | "whois";
  result?: WhoisAnalyzeResult;
  error?: string;
  dnsProbe?: DnsProbeResult;
  registryUrl?: string;
};

/** Detect query type from the raw query string (mirrors client-side detectQueryType). */
function detectQueryType(query: string): "domain" | "ipv4" | "ipv6" | "asn" | "cidr" {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(query)) return "ipv4";
  if (/^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(query) || /::/.test(query) && /[0-9a-fA-F:]/.test(query)) return "ipv6";
  if (/^(AS|as)\d+$/.test(query)) return "asn";
  if (/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(query)) return "cidr";
  return "domain";
}

function deriveRegStatus(
  result: WhoisAnalyzeResult,
  dnsProbe?: DnsProbeResult,
): string | null {
  if (result.expirationDate && result.expirationDate !== "Unknown") return "registered";
  if (result.registrar && result.registrar !== "Unknown") return "registered";
  if (result.status?.some(s => s.status?.toLowerCase().includes("active"))) return "registered";
  if (dnsProbe?.registrationStatus === "unregistered") return "unregistered";
  if (dnsProbe?.registrationStatus === "registered") return "registered";
  return null;
}

function computeValueTier(
  query: string,
  queryType: string,
  regStatus: string | null,
): "high" | "valuable" | "normal" {
  if (queryType !== "domain" || regStatus !== "unregistered") return "normal";
  const result = scoreDomain(query, queryType);
  if (!result) return "normal";
  if (result.score >= 55) return "high";
  if (result.score >= 35) return "valuable";
  return "normal";
}

async function maybeSendHighValueAlert(
  query: string,
  queryType: string,
  regStatus: string,
  checkedByEmail?: string | null,
) {
  const scoreResult = scoreDomain(query, queryType);
  const [hotPrefixMatch] = await Promise.all([
    checkHotPrefix(query.substring(0, query.lastIndexOf(".")) || query).catch(() => null),
  ]);

  const shouldAlert = shouldAlertAdmin(query, queryType, regStatus) || !!hotPrefixMatch;
  if (!shouldAlert) return;

  const recent = await one<{ count: string }>(
    `SELECT COUNT(*) AS count FROM search_history
     WHERE query = $1 AND reg_status = 'unregistered'
     AND created_at >= NOW() - INTERVAL '24 hours'`,
    [query],
  );
  if (parseInt(recent?.count ?? "0") > 1) return; // already alerted recently

  if (!scoreResult) return;

  // Fetch AI summary for high-value domains (fire-and-forget timeout guard)
  let aiSummary: string | null = null;
  if (scoreResult.score >= 55 || hotPrefixMatch) {
    try {
      const aiResult = await Promise.race([
        analyzeDomainWithAi(query),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]) as Awaited<ReturnType<typeof analyzeDomainWithAi>> | null;
      if (aiResult && typeof aiResult === "object" && "summary" in aiResult) {
        aiSummary = (aiResult as { summary?: string }).summary ?? null;
      }
    } catch {
      // AI unavailable — proceed without it
    }
  }

  const siteName = await getSiteLabel().catch(() => "X.RW");
  const html = highValueAlertHtml({
    domain: query,
    score: scoreResult.score,
    tier: scoreResult.tier,
    reasons: scoreResult.reasons,
    isAlertKeyword: scoreResult.isAlertKeyword,
    isNumericOnly: scoreResult.isNumericOnly,
    checkedBy: checkedByEmail ?? null,
    breakdown: scoreResult.breakdown,
    hotPrefix: hotPrefixMatch ? {
      prefix: hotPrefixMatch.prefix.prefix,
      category: hotPrefixMatch.prefix.category,
      weight: hotPrefixMatch.prefix.weight,
      matchType: hotPrefixMatch.matchType,
      saleExamples: hotPrefixMatch.prefix.sale_examples,
      notes: hotPrefixMatch.prefix.notes,
    } : null,
    aiSummary,
    siteName,
  });

  const subjectPrefix = hotPrefixMatch
    ? `🔥 热门前缀可用`
    : scoreResult.isAlertKeyword
    ? "⚡ 特殊关键词可用"
    : "💎 高价值域名可用";

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${subjectPrefix}：${query}（评分 ${scoreResult.score}${hotPrefixMatch ? ` · 前缀:${hotPrefixMatch.prefix.prefix}` : ""}）`,
    html,
  }).catch(err => console.error("[high-value-alert]", err.message));
}


async function saveSearchRecord(
  query: string,
  result: WhoisAnalyzeResult,
  dnsProbe?: DnsProbeResult,
  userId?: string | null,
  checkedByEmail?: string | null,
): Promise<void> {
  if (!(await isDbReady())) return;
  try {
    const cleanQuery = query.toLowerCase().trim();
    const queryType  = detectQueryType(cleanQuery);
    const regStatus  = deriveRegStatus(result, dnsProbe);
    const valueTier  = computeValueTier(cleanQuery, queryType, regStatus);
    const expDate    = result.expirationDate && result.expirationDate !== "Unknown" ? result.expirationDate : null;
    const remDays    = result.remainingDays ?? null;

    // Fire high-value alert for ALL users (logged-in and anonymous)
    if (regStatus === "unregistered") {
      maybeSendHighValueAlert(cleanQuery, queryType, regStatus, checkedByEmail).catch(() => {});
    }

    if (userId) {
      // For logged-in users: upsert — delete old record for this user+query, insert fresh
      await run(
        `DELETE FROM search_history WHERE user_id = $1 AND LOWER(query) = $2`,
        [userId, cleanQuery],
      );
      await run(
        `INSERT INTO search_history
           (id, user_id, query, query_type, reg_status, expiration_date, remaining_days, value_tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomBytes(8).toString("hex"), userId, cleanQuery, queryType, regStatus, expDate, remDays, valueTier],
      );
    } else {
      // For anonymous users: upsert — delete old record for same query, insert fresh, trim to limit
      await run(
        `DELETE FROM search_history WHERE user_id IS NULL AND LOWER(query) = $1`,
        [cleanQuery],
      );
      await run(
        `INSERT INTO search_history
           (id, user_id, query, query_type, reg_status, expiration_date, remaining_days, value_tier)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)`,
        [randomBytes(8).toString("hex"), cleanQuery, queryType, regStatus, expDate, remDays, valueTier],
      );
    }
  } catch {}
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  // Only allow GET and HEAD
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ time: -1, status: false, error: "Method not allowed" });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const { allowed, remaining, resetMs } = rateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetMs / 1_000)));
  if (!allowed) {
    return res.status(429).json({ time: -1, status: false, error: "Too many requests — please slow down" });
  }

  // API key enforcement (when enabled in admin)
  const keyOk = await enforceApiKey(req, res, "api");
  if (!keyOk) return;

  // Input validation
  const query = req.query.query || req.query.q;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ time: -1, status: false, error: "Query is required" });
  }
  const trimmed = query.trim();
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return res
      .status(400)
      .json({ time: -1, status: false, error: `Query too long (max ${MAX_QUERY_LENGTH} chars)` });
  }
  // Reject obviously non-sensical characters (null bytes, control chars)
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(trimmed)) {
    return res.status(400).json({ time: -1, status: false, error: "Invalid characters in query" });
  }

  // Get current user session (non-blocking — we still serve the result even if session fails)
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const session = await getServerSession(req, res, authOptions);
    userId    = (session?.user as any)?.id    ?? null;
    userEmail = (session?.user as any)?.email ?? null;
  } catch {}

  // ── CN Reserved SLD short-circuit ─────────────────────────────────────────
  // Province, functional, and system-reserved .cn second-level domains are
  // managed by CNNIC and are never directly registerable. Skip the WHOIS/RDAP
  // network query and return a synthetic "registry-reserved" result instantly.
  const cnReserved = getCnReservedSldInfo(trimmed);
  if (cnReserved) {
    const syntheticResult: WhoisAnalyzeResult = {
      ...initialWhoisAnalyzeResult,
      domain: trimmed,
      status: [{ status: "registry-reserved", url: "" }],
      rawWhoisContent: `[CN Reserved] ${cnReserved.descZh}`,
    };
    saveSearchRecord(trimmed, syntheticResult, undefined, userId, userEmail).catch(() => {});
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    return res.status(200).json({
      time: 0,
      status: true,
      cached: false,
      cacheTtl: 43_200,
      source: "whois" as const,
      result: syntheticResult,
    });
  }

  const { time, status, result, error, cached, cachedAt, cacheTtl, source, dnsProbe, registryUrl } =
    await lookupWhoisWithCache(trimmed);
  if (!status) {
    return res.status(500).json({ time, status, error, dnsProbe, registryUrl });
  }

  // Always save the search record — including cached results — so every query
  // (anonymous or logged-in, first-time or repeat) is recorded in the backend.
  if (result) {
    saveSearchRecord(trimmed, result, dnsProbe, userId, userEmail).catch(() => {});
  }

  // Set Cache-Control header to match the actual smart TTL so Vercel's
  // CDN edge cache also honours the same expiry windows as Redis.
  const sMaxAge = cacheTtl && cacheTtl > 0 ? cacheTtl : 3600;
  const swr     = Math.min(sMaxAge * 4, 86_400);
  res.setHeader("Cache-Control", `s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  return res.status(200).json({ time, status, result, cached, cachedAt, cacheTtl, source, dnsProbe, registryUrl });
}
