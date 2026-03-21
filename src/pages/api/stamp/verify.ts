import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampsDB } from "@/lib/data-store";
import { getDbReady } from "@/lib/db";
import dns from "dns/promises";

const UDP_RESOLVERS = [
  { name: "Google DNS", ip: "8.8.8.8", proto: "udp" as const },
  { name: "Cloudflare", ip: "1.1.1.1", proto: "udp" as const },
  { name: "Quad9", ip: "9.9.9.9", proto: "udp" as const },
  { name: "系统DNS", ip: "", proto: "udp" as const },
];

const DOH_RESOLVERS = [
  {
    name: "Google DoH",
    proto: "doh" as const,
    url: (host: string) => `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=TXT`,
  },
  {
    name: "Cloudflare DoH",
    proto: "doh" as const,
    url: (host: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`,
  },
];

const QUERY_TIMEOUT_MS = 5000;

async function queryUDP(
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
        }
        return dns.resolveTxt(host);
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
      error:
        err.code === "ENODATA" || err.code === "ENOTFOUND" || err.code === "ESERVFAIL"
          ? "no_record"
          : err.message === "timeout"
          ? "timeout"
          : "dns_error",
    };
  }
}

async function queryDoH(
  urlFn: (host: string) => string,
  host: string,
  timeoutMs: number
): Promise<{ records: string[]; latencyMs: number; error?: string }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(urlFn(host), {
      headers: { Accept: "application/dns-json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const records: string[] = ((data.Answer as any[]) || [])
      .filter((a) => a.type === 16)
      .map((a) =>
        String(a.data)
          .replace(/^"+|"+$/g, "")
          .replace(/" "/g, "")
      );
    return { records, latencyMs: Date.now() - start };
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError" || err.message === "timeout";
    return {
      records: [],
      latencyMs: Date.now() - start,
      error: isTimeout ? "timeout" : "dns_error",
    };
  }
}

interface ResolverResult {
  name: string;
  proto: string;
  latencyMs: number;
  found: boolean;
  records: string[];
  error: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const db = await getDbReady();

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

  const [udpResults, dohResults] = await Promise.all([
    Promise.all(
      UDP_RESOLVERS.map(async (r): Promise<ResolverResult> => {
        const { records, latencyMs, error } = await queryUDP(txtHost, r.ip, QUERY_TIMEOUT_MS);
        return {
          name: r.name,
          proto: r.proto,
          latencyMs,
          found: records.includes(expectedValue),
          records: records.slice(0, 5),
          error: error ?? null,
        };
      })
    ),
    Promise.all(
      DOH_RESOLVERS.map(async (r): Promise<ResolverResult> => {
        const { records, latencyMs, error } = await queryDoH(r.url, txtHost, QUERY_TIMEOUT_MS);
        return {
          name: r.name,
          proto: r.proto,
          latencyMs,
          found: records.includes(expectedValue),
          records: records.slice(0, 5),
          error: error ?? null,
        };
      })
    ),
  ]);

  const allResults = [...udpResults, ...dohResults];
  const verified = allResults.some((r) => r.found);
  const allDnsError = allResults.every(
    (r) => r.error === "dns_error" || r.error === "timeout"
  );

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
    return res.status(200).json({
      verified: true,
      resolvers: allResults,
      txtRecord: txtHost,
    });
  }

  return res.status(200).json({
    verified: false,
    dnsError: allDnsError,
    resolvers: allResults,
    expected: expectedValue,
  });
}
