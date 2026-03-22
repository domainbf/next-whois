import type { NextApiRequest, NextApiResponse } from "next";
import dns from "dns/promises";

export const config = { maxDuration: 20 };

const RECORD_TYPES = ["A", "AAAA", "MX", "NS", "CNAME", "TXT", "SOA"] as const;
type RecordType = typeof RECORD_TYPES[number];

const TYPE_NUM: Record<RecordType, number> = { A: 1, AAAA: 28, MX: 15, NS: 2, CNAME: 5, TXT: 16, SOA: 6 };

const UDP_RESOLVERS = [
  { name: "Google DNS",  ip: "8.8.8.8", kind: "udp" as const },
  { name: "Cloudflare",  ip: "1.1.1.1", kind: "udp" as const },
  { name: "Quad9",       ip: "9.9.9.9", kind: "udp" as const },
  { name: "OpenDNS",     ip: "208.67.222.222", kind: "udp" as const },
];

const DOH_RESOLVERS = [
  { name: "Cloudflare DoH", url: "https://cloudflare-dns.com/dns-query", kind: "doh" as const },
  { name: "Google DoH",     url: "https://dns.google/resolve",            kind: "doh" as const },
];

// ─── UDP resolver ───────────────────────────────────────────────────────────

async function resolveUdp(ip: string, name: string, type: RecordType): Promise<any[]> {
  const resolver = new dns.Resolver();
  resolver.setServers([ip]);
  switch (type) {
    case "A":     return (await resolver.resolve4(name, { ttl: true })).map((r: any) => r.address ?? r);
    case "AAAA":  return (await resolver.resolve6(name, { ttl: true })).map((r: any) => r.address ?? r);
    case "MX":    return resolver.resolveMx(name);
    case "NS":    return resolver.resolveNs(name);
    case "CNAME": return resolver.resolveCname(name);
    case "TXT":   return (await resolver.resolveTxt(name)).map((chunks: string[]) => chunks.join(""));
    case "SOA":   return [await resolver.resolveSoa(name)];
  }
}

// ─── DoH resolver (DNS over HTTPS) ──────────────────────────────────────────

function parseDoHData(data: string, type: RecordType): any {
  const d = data.trim();
  switch (type) {
    case "A":
    case "AAAA":
      return d;
    case "NS":
    case "CNAME":
      return d.replace(/\.$/, "");
    case "MX": {
      const sp = d.indexOf(" ");
      if (sp < 0) return { priority: 10, exchange: d.replace(/\.$/, "") };
      return { priority: parseInt(d.slice(0, sp)), exchange: d.slice(sp + 1).replace(/\.$/, "") };
    }
    case "TXT":
      // DoH may return "part1""part2" or "full string"
      return d.replace(/^"/, "").replace(/"$/, "").replace(/""/g, "");
    case "SOA": {
      const parts = d.split(/\s+/);
      return {
        nsname:     (parts[0] ?? "").replace(/\.$/, ""),
        hostmaster: (parts[1] ?? "").replace(/\.$/, ""),
        serial:  parseInt(parts[2] ?? "0"),
        refresh: parseInt(parts[3] ?? "0"),
        retry:   parseInt(parts[4] ?? "0"),
        expire:  parseInt(parts[5] ?? "0"),
        minttl:  parseInt(parts[6] ?? "0"),
      };
    }
  }
}

async function resolveDoH(url: string, name: string, type: RecordType): Promise<any[]> {
  const typeNum = TYPE_NUM[type];
  const endpoint = `${url}?name=${encodeURIComponent(name)}&type=${typeNum}`;
  const headers: Record<string, string> = url.includes("cloudflare") ? { Accept: "application/dns-json" } : {};

  const resp = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(6000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  // Status 3 = NXDOMAIN
  if (json.Status === 3) throw Object.assign(new Error("NXDOMAIN"), { code: "ENOTFOUND" });
  if (json.Status !== 0) throw new Error(`DNS Status ${json.Status}`);

  const answers: any[] = json.Answer ?? [];
  return answers
    .filter((a: any) => a.type === typeNum)
    .map((a: any) => parseDoHData(a.data, type));
}

// ─── Flatten helper ──────────────────────────────────────────────────────────

function normalizeToString(type: RecordType, raw: any): string {
  if (typeof raw === "string") return raw;
  if (type === "MX")  return `${raw.priority} ${raw.exchange}`;
  if (type === "SOA") return `${raw.nsname} ${raw.hostmaster} ${raw.serial} refresh=${raw.refresh} retry=${raw.retry} expire=${raw.expire} minttl=${raw.minttl}`;
  return JSON.stringify(raw);
}

// ─── Main query ──────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name = (req.query.name as string | undefined)?.trim().toLowerCase();
  const typeRaw = ((req.query.type as string) || "A").toUpperCase();

  if (!name) return res.status(400).json({ error: "name parameter is required" });
  if (!RECORD_TYPES.includes(typeRaw as RecordType))
    return res.status(400).json({ error: `Unsupported type. Supported: ${RECORD_TYPES.join(", ")}` });
  const type = typeRaw as RecordType;

  const t0 = Date.now();
  const UDP_TIMEOUT = 2500;
  const DOH_TIMEOUT = 6000;

  type ResolverResult = {
    name: string; kind: "udp" | "doh";
    records: any[]; flat: string[]; latencyMs: number; error?: string;
  };

  const udpJobs = UDP_RESOLVERS.map(async (r): Promise<ResolverResult> => {
    const rt0 = Date.now();
    try {
      const records = await Promise.race([
        resolveUdp(r.ip, name, type),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), UDP_TIMEOUT)
        ),
      ]);
      const flat = records.map(rec => normalizeToString(type, rec));
      return { name: r.name, kind: r.kind, records, flat, latencyMs: Date.now() - rt0 };
    } catch (e: any) {
      const code = e?.code ?? "";
      const error =
        code === "ETIMEOUT" || e?.message === "timeout" ? "timeout" :
        code === "ENODATA" || code === "ENOTFOUND"       ? "no_record" :
        code === "ESERVFAIL"                              ? "servfail" :
        code === "ECONNREFUSED"                           ? "udp_blocked" :
        (e?.message || "unknown");
      return { name: r.name, kind: r.kind, records: [], flat: [], latencyMs: Date.now() - rt0, error };
    }
  });

  const dohJobs = DOH_RESOLVERS.map(async (r): Promise<ResolverResult> => {
    const rt0 = Date.now();
    try {
      const records = await Promise.race([
        resolveDoH(r.url, name, type),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), DOH_TIMEOUT)
        ),
      ]);
      const flat = records.map(rec => normalizeToString(type, rec));
      return { name: r.name, kind: r.kind, records, flat, latencyMs: Date.now() - rt0 };
    } catch (e: any) {
      const code = e?.code ?? "";
      const error =
        code === "ETIMEOUT" || e?.message === "timeout" ? "timeout" :
        code === "ENOTFOUND" || e?.message === "NXDOMAIN" ? "no_record" :
        (e?.message || "unknown");
      return { name: r.name, kind: r.kind, records: [], flat: [], latencyMs: Date.now() - rt0, error };
    }
  });

  const allSettled = await Promise.allSettled([...udpJobs, ...dohJobs]);

  const resolvers: ResolverResult[] = allSettled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const src = [...UDP_RESOLVERS, ...DOH_RESOLVERS][i];
    return { name: src.name, kind: src.kind, records: [], flat: [], latencyMs: 0, error: "rejected" };
  });

  // Merge & deduplicate across all resolvers
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

  // Sort MX by priority
  if (type === "MX") {
    const paired = allRaw.map((r, i) => ({ r, f: allFlat[i] }));
    paired.sort((a, b) => (a.r?.priority ?? 0) - (b.r?.priority ?? 0));
    allRaw.splice(0, allRaw.length, ...paired.map(p => p.r));
    allFlat.splice(0, allFlat.length, ...paired.map(p => p.f));
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
