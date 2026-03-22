import type { NextApiRequest, NextApiResponse } from "next";
import { lookupWhoisWithCache } from "@/lib/whois/lookup";
import { WhoisAnalyzeResult } from "@/lib/whois/types";
import { DnsProbeResult } from "@/lib/whois/dns-check";
import { run, isDbReady } from "@/lib/db-query";
import { randomBytes } from "crypto";

export const config = {
  maxDuration: 30,
};

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

async function saveAnonymousSearchRecord(
  query: string,
  result: WhoisAnalyzeResult,
): Promise<void> {
  if (!(await isDbReady())) return;
  try {
    const id = randomBytes(8).toString("hex");
    const queryType = result.domain ? "domain" : "ip";
    const regStatus = result.expirationDate && result.expirationDate !== "Unknown"
      ? "registered"
      : result.status?.some(s => s.status?.toLowerCase().includes("active")) ? "registered"
      : null;

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
        result.expirationDate !== "Unknown" ? result.expirationDate : null,
        result.remainingDays ?? null,
      ],
    );
  } catch {}
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const query = req.query.query || req.query.q;

  if (!query || typeof query !== "string" || query.length === 0) {
    return res
      .status(400)
      .json({ time: -1, status: false, error: "Query is required" });
  }

  const { time, status, result, error, cached, source, dnsProbe, registryUrl } =
    await lookupWhoisWithCache(query);
  if (!status) {
    return res.status(500).json({ time, status, error, dnsProbe, registryUrl });
  }

  if (result && !cached) {
    saveAnonymousSearchRecord(query, result).catch(() => {});
  }

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ time, status, result, cached, source, dnsProbe, registryUrl });
}
