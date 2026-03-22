import type { NextApiRequest, NextApiResponse } from "next";
import dns from "dns/promises";

export const config = { maxDuration: 20 };

const RECORD_TYPES = ["A", "AAAA", "MX", "NS", "CNAME", "TXT", "SOA"] as const;
type RecordType = typeof RECORD_TYPES[number];

const RESOLVERS = [
  { name: "Google DNS",  ip: "8.8.8.8" },
  { name: "Cloudflare",  ip: "1.1.1.1" },
  { name: "Quad9",       ip: "9.9.9.9" },
  { name: "OpenDNS",     ip: "208.67.222.222" },
];

async function resolveByType(resolver: dns.Resolver, name: string, type: RecordType): Promise<any> {
  switch (type) {
    case "A":     return resolver.resolve4(name, { ttl: true });
    case "AAAA":  return resolver.resolve6(name, { ttl: true });
    case "MX":    return resolver.resolveMx(name);
    case "NS":    return resolver.resolveNs(name);
    case "CNAME": return resolver.resolveCname(name);
    case "TXT":   return (await resolver.resolveTxt(name)).map(chunks => chunks.join(""));
    case "SOA":   return [await resolver.resolveSoa(name)];
  }
}

async function queryRecord(
  ip: string, name: string, type: RecordType, timeoutMs = 8000
): Promise<{ records: any[]; latencyMs: number }> {
  const resolver = new dns.Resolver();
  resolver.setServers([ip]);
  const t0 = Date.now();
  const raw = await Promise.race([
    resolveByType(resolver, name, type),
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), timeoutMs)
    ),
  ]);
  return { records: raw ?? [], latencyMs: Date.now() - t0 };
}

function normalizeToStrings(type: RecordType, records: any[]): string[] {
  return records.map(r => {
    if (typeof r === "string") return r;
    if (type === "MX") return `${r.priority} ${r.exchange}`;
    if (type === "A" || type === "AAAA") return r.address ?? String(r);
    if (type === "SOA") return `${r.nsname} ${r.hostmaster} ${r.serial} refresh=${r.refresh} retry=${r.retry} expire=${r.expire} minttl=${r.minttl}`;
    return JSON.stringify(r);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name = (req.query.name as string | undefined)?.trim().toLowerCase();
  const typeRaw = ((req.query.type as string) || "A").toUpperCase();

  if (!name) return res.status(400).json({ error: "name parameter is required" });
  if (!RECORD_TYPES.includes(typeRaw as RecordType)) {
    return res.status(400).json({ error: `Unsupported type. Supported: ${RECORD_TYPES.join(", ")}` });
  }
  const type = typeRaw as RecordType;

  const t0 = Date.now();

  const settled = await Promise.allSettled(
    RESOLVERS.map(async (r): Promise<{
      name: string; records: any[]; flat: string[]; latencyMs: number; error?: string;
    }> => {
      const rt0 = Date.now();
      try {
        const { records, latencyMs } = await queryRecord(r.ip, name, type);
        const flat = normalizeToStrings(type, records);
        return { name: r.name, records, flat, latencyMs };
      } catch (e: any) {
        const code = e?.code ?? "";
        const error =
          code === "ETIMEOUT" || e?.message === "timeout" ? "timeout" :
          code === "ENODATA" || code === "ENOTFOUND"       ? "no_record" :
          code === "ESERVFAIL"                              ? "servfail" :
          code === "ECONNREFUSED"                           ? "udp_blocked" :
          (e?.message || "unknown");
        return { name: r.name, records: [], flat: [], latencyMs: Date.now() - rt0, error };
      }
    })
  );

  const resolvers = settled.map((r, i) =>
    r.status === "fulfilled" ? r.value
      : { name: RESOLVERS[i].name, records: [], flat: [], latencyMs: 0, error: "rejected" }
  );

  const seenFlat = new Set<string>();
  const allFlat: string[] = [];
  const allRaw: any[] = [];
  for (const r of resolvers) {
    for (let i = 0; i < r.flat.length; i++) {
      const f = r.flat[i];
      if (!seenFlat.has(f)) {
        seenFlat.add(f);
        allFlat.push(f);
        allRaw.push(r.records[i]);
      }
    }
  }

  if (type === "MX") {
    allRaw.sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0));
    allFlat.splice(0, allFlat.length, ...normalizeToStrings("MX", allRaw));
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    name, type,
    found: allFlat.length > 0,
    records: allRaw,
    flat: allFlat,
    resolvers,
    latencyMs: Date.now() - t0,
  });
}
