import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampsDB } from "@/lib/data-store";
import { getDb } from "@/lib/db";
import dns from "dns/promises";

const RESOLVERS = [
  { name: "Google DNS", ip: "8.8.8.8" },
  { name: "系统DNS", ip: "" },
];

const QUERY_TIMEOUT_MS = 5000;

async function queryResolver(
  host: string,
  resolverIp: string,
  timeoutMs: number
): Promise<{ records: string[]; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      (async () => {
        if (resolverIp) {
          const resolver = new dns.Resolver();
          resolver.setServers([resolverIp]);
          return resolver.resolveTxt(host);
        } else {
          return dns.resolveTxt(host);
        }
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
    return { records: result.flat(), latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      records: [],
      latencyMs: Date.now() - start,
      error: err.code === "ENODATA" || err.code === "ENOTFOUND"
        ? "no_record"
        : err.message === "timeout"
        ? "timeout"
        : "dns_error",
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const db = getDb();

  let verifyToken: string | null = null;

  if (db) {
    const { rows } = await db.query(
      `SELECT verify_token, verified FROM stamps WHERE id=$1 AND domain=$2`,
      [id, cleanDomain]
    );
    if (!rows[0]) return res.status(404).json({ error: "Stamp not found" });
    if (rows[0].verified) return res.status(200).json({ verified: true, already: true });
    verifyToken = rows[0].verify_token;
  } else {
    const fileDb = readData<StampsDB>("stamps.json", {});
    const record = (fileDb[cleanDomain] || []).find((r) => r.id === id);
    if (!record) return res.status(404).json({ error: "Stamp not found" });
    if (record.verified) return res.status(200).json({ verified: true, already: true });
    verifyToken = record.verifyToken;
  }

  const expectedValue = `next-whois-verify=${verifyToken}`;
  const txtHost = `_next-whois.${cleanDomain}`;

  const queryResults = await Promise.all(
    RESOLVERS.map(async (r) => {
      const { records, latencyMs, error } = await queryResolver(txtHost, r.ip, QUERY_TIMEOUT_MS);
      const matched = records.includes(expectedValue);
      return {
        name: r.name,
        ip: r.ip || "system",
        latencyMs,
        found: matched,
        records: records.slice(0, 5),
        error: error ?? null,
      };
    })
  );

  const verified = queryResults.some((r) => r.found);
  const allDnsError = queryResults.every((r) => r.error === "dns_error" || r.error === "timeout");
  const allFound = queryResults.map((r) => r.records).flat();

  if (verified) {
    const verifiedAt = new Date().toISOString();
    if (db) {
      await db.query(`UPDATE stamps SET verified=true, verified_at=$1 WHERE id=$2`, [verifiedAt, id]);
    } else {
      const fileDb = readData<StampsDB>("stamps.json", {});
      const record = (fileDb[cleanDomain] || []).find((r) => r.id === id);
      if (record) { record.verified = true; record.verifiedAt = verifiedAt; }
      writeData("stamps.json", fileDb);
    }
    return res.status(200).json({ verified: true, resolvers: queryResults });
  }

  return res.status(200).json({
    verified: false,
    dnsError: allDnsError,
    resolvers: queryResults,
    expected: expectedValue,
    found: allFound,
  });
}
