import type { NextApiRequest, NextApiResponse } from "next";
import { lookupWhoisWithCache } from "@/lib/whois/lookup";
import { WhoisAnalyzeResult } from "@/lib/whois/types";
import { DnsProbeResult } from "@/lib/whois/dns-check";
import { run, isDbReady } from "@/lib/db-query";
import { randomBytes } from "crypto";
import { rateLimit, getClientIp } from "@/lib/server/rate-limit";

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
  source?: "rdap" | "whois";
  result?: WhoisAnalyzeResult;
  error?: string;
  dnsProbe?: DnsProbeResult;
  registryUrl?: string;
};

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

async function saveAnonymousSearchRecord(
  query: string,
  result: WhoisAnalyzeResult,
  dnsProbe?: DnsProbeResult,
): Promise<void> {
  if (!(await isDbReady())) return;
  try {
    const id = randomBytes(8).toString("hex");
    const queryType = result.cidr && result.cidr !== "Unknown" ? "ip" : "domain";
    const regStatus = deriveRegStatus(result, dnsProbe);

    await run(
      `INSERT INTO search_history
         (id, user_id, query, query_type, reg_status, expiration_date, remaining_days)
       VALUES ($1, NULL, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        id,
        query.toLowerCase().trim(),
        queryType,
        regStatus,
        result.expirationDate && result.expirationDate !== "Unknown" ? result.expirationDate : null,
        result.remainingDays ?? null,
      ],
    );
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

  const { time, status, result, error, cached, source, dnsProbe, registryUrl } =
    await lookupWhoisWithCache(trimmed);
  if (!status) {
    return res.status(500).json({ time, status, error, dnsProbe, registryUrl });
  }

  if (result && !cached) {
    saveAnonymousSearchRecord(trimmed, result, dnsProbe).catch(() => {});
  }

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ time, status, result, cached, source, dnsProbe, registryUrl });
}
