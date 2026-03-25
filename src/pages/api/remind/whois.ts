import type { NextApiRequest, NextApiResponse } from "next";
import { lookupWhoisWithCache } from "@/lib/whois/lookup";

const RATE_WINDOW = 60_000;
const RATE_LIMIT   = 10;
const ipMap = new Map<string, { count: number; resetAt: number }>();

function rateCheck(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ status: false });

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "unknown";
  if (!rateCheck(ip)) return res.status(429).json({ status: false, error: "Too many requests" });

  const q = req.query.query;
  if (!q || typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ status: false, error: "Query is required" });
  }
  const domain = q.trim().toLowerCase().slice(0, 253);

  try {
    const result = await lookupWhoisWithCache(domain);
    if (!result.status || !result.result) {
      return res.status(500).json({ status: false, error: result.error ?? "Lookup failed" });
    }
    const r = result.result;
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({
      status: true,
      source: result.source,
      result: {
        domain: r.domain,
        registrar: r.registrar,
        creationDate: r.creationDate,
        updatedDate: r.updatedDate,
        expirationDate: r.expirationDate,
        remainingDays: r.remainingDays,
        domainAge: r.domainAge,
        nameServers: r.nameServers,
        status: r.status,
        dnssec: r.dnssec,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ status: false, error: String(err?.message ?? "Internal error") });
  }
}
