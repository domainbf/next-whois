import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import dns from "dns/promises";

// ─── Resolvers ───────────────────────────────────────────────────────────────

const UDP_RESOLVERS = [
  { name: "Google DNS",   ip: "8.8.8.8" },
  { name: "Cloudflare",  ip: "1.1.1.1" },
  { name: "Quad9",       ip: "9.9.9.9" },
  { name: "OpenDNS",     ip: "208.67.222.222" },
  { name: "System DNS",  ip: "" },
] as const;

const DOH_RESOLVERS = [
  {
    name: "Google DoH",
    url: (h: string) => `https://dns.google/resolve?name=${encodeURIComponent(h)}&type=TXT`,
  },
  {
    name: "Cloudflare DoH",
    url: (h: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(h)}&type=TXT`,
  },
  {
    name: "Quad9 DoH",
    url: (h: string) => `https://dns.quad9.net:5053/dns-query?name=${encodeURIComponent(h)}&type=TXT`,
  },
  {
    name: "NextDNS DoH",
    url: (h: string) => `https://dns.nextdns.io/dns-query?name=${encodeURIComponent(h)}&type=TXT`,
  },
] as const;

const UDP_TIMEOUT_MS  = 7000;
const DOH_TIMEOUT_MS  = 9000;
const HTTP_TIMEOUT_MS = 8000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeRecord(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, "")  // strip surrounding quotes
    .replace(/"\s*"/g, "")    // join multi-chunk DoH " " separators
    .trim();
}

function tokenMatch(records: string[], expected: string): { found: boolean; exactMatch: boolean; nearMatch: boolean; matchedRecord: string | null } {
  for (const r of records) {
    const norm = normalizeRecord(r);
    if (norm === expected) return { found: true, exactMatch: true, nearMatch: false, matchedRecord: norm };
    if (norm.includes(expected)) return { found: true, exactMatch: false, nearMatch: true, matchedRecord: norm };
  }
  return { found: false, exactMatch: false, nearMatch: false, matchedRecord: null };
}

async function queryUDP(
  host: string, resolverIp: string, timeoutMs: number
): Promise<{ records: string[]; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const raw = await Promise.race([
      (async () => {
        if (resolverIp) {
          const r = new dns.Resolver();
          r.setServers([resolverIp]);
          return r.resolveTxt(host);
        }
        return dns.resolveTxt(host);
      })(),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), timeoutMs)
      ),
    ]);
    // Join chunks per record — crucial for multi-part TXT records
    const records = raw.map(parts => parts.join(""));
    return { records, latencyMs: Date.now() - start };
  } catch (err: any) {
    const code = err.code ?? "";
    const error =
      code === "ETIMEOUT" || err.message === "timeout" ? "timeout" :
      code === "ENODATA" || code === "ENOTFOUND"       ? "no_record" :
      code === "ESERVFAIL" || code === "EREFUSED"      ? "servfail" :
      code === "ECONNREFUSED"                           ? "udp_blocked" :
                                                          "dns_error";
    return { records: [], latencyMs: Date.now() - start, error };
  }
}

async function queryDoH(
  urlFn: (h: string) => string, host: string, timeoutMs: number
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
    const rcode: number = data.Status ?? 0;
    if (rcode !== 0) {
      // NXDOMAIN=3, SERVFAIL=2, REFUSED=5
      return { records: [], latencyMs: Date.now() - start, error: rcode === 3 ? "no_record" : "servfail" };
    }
    const records: string[] = ((data.Answer as any[]) || [])
      .filter((a: any) => a.type === 16)
      .map((a: any) => normalizeRecord(String(a.data)));
    return { records, latencyMs: Date.now() - start };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      records: [],
      latencyMs: Date.now() - start,
      error: err.name === "AbortError" ? "timeout" : "dns_error",
    };
  }
}

async function checkHttpFile(
  domain: string, expectedValue: string
): Promise<{ found: boolean; latencyMs: number; error: string | null; url: string; nearMatch: boolean }> {
  // Try HTTPS first, fall back to HTTP
  for (const scheme of ["https", "http"] as const) {
    const url = `${scheme}://${domain}/.well-known/next-whois-verify.txt`;
    const start = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
      clearTimeout(timer);
      if (!res.ok) {
        if (scheme === "https") continue; // try http
        return { found: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}`, url, nearMatch: false };
      }
      const body = (await res.text()).trim();
      const found = body === expectedValue || body.includes(expectedValue);
      const nearMatch = !found && body.length > 0 && body.includes("next-whois-verify");
      return { found, latencyMs: Date.now() - start, error: null, url, nearMatch };
    } catch (err: any) {
      clearTimeout(timer);
      if (scheme === "https") continue;
      return {
        found: false,
        latencyMs: Date.now() - start,
        error: err.name === "AbortError" ? "timeout" : "fetch_error",
        url,
        nearMatch: false,
      };
    }
  }
  return { found: false, latencyMs: 0, error: "unreachable", url: `https://${domain}/.well-known/next-whois-verify.txt`, nearMatch: false };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResolverResult {
  name: string;
  proto: "udp" | "doh";
  latencyMs: number;
  found: boolean;
  nearMatch: boolean;
  records: string[];
  error: string | null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库未配置，品牌认领功能暂不可用" });

  // Admin override: ADMIN_VERIFY_SECRET in env
  if (req.body.adminSecret && process.env.ADMIN_VERIFY_SECRET &&
      req.body.adminSecret === process.env.ADMIN_VERIFY_SECRET) {
    await supabase.from("stamps").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", id);
    return res.status(200).json({ verified: true, adminOverride: true });
  }

  const { data: stamp } = await supabase
    .from("stamps")
    .select("verify_token, verified")
    .eq("id", id)
    .eq("domain", cleanDomain)
    .maybeSingle();

  if (!stamp) return res.status(404).json({ error: "Stamp not found" });
  if (stamp.verified) return res.status(200).json({ verified: true, already: true });

  const verifyToken  = stamp.verify_token;
  const expectedValue = `next-whois-verify=${verifyToken}`;
  const txtHost      = `_next-whois.${cleanDomain}`;

  // Run all checks in parallel
  const [udpResults, dohResults, httpResult] = await Promise.all([
    Promise.all(
      UDP_RESOLVERS.map(async (r): Promise<ResolverResult> => {
        const { records, latencyMs, error } = await queryUDP(txtHost, r.ip, UDP_TIMEOUT_MS);
        const match = tokenMatch(records, expectedValue);
        return {
          name: r.name, proto: "udp", latencyMs,
          found: match.found, nearMatch: match.nearMatch,
          records: records.slice(0, 5),
          error: error ?? null,
        };
      })
    ),
    Promise.all(
      DOH_RESOLVERS.map(async (r): Promise<ResolverResult> => {
        const { records, latencyMs, error } = await queryDoH(r.url, txtHost, DOH_TIMEOUT_MS);
        const match = tokenMatch(records, expectedValue);
        return {
          name: r.name, proto: "doh", latencyMs,
          found: match.found, nearMatch: match.nearMatch,
          records: records.slice(0, 5),
          error: error ?? null,
        };
      })
    ),
    checkHttpFile(cleanDomain, expectedValue),
  ]);

  const allResolverResults = [...udpResults, ...dohResults];
  const dnsVerified = allResolverResults.some(r => r.found);
  const verified    = dnsVerified || httpResult.found;

  // DNS health diagnosis
  const udpBlocked = udpResults.every(r => r.error === "udp_blocked" || r.error === "timeout");
  const anyNearMatch = allResolverResults.some(r => r.nearMatch) || httpResult.nearMatch;
  const anyRecordFound = allResolverResults.some(r => r.records.length > 0);
  const allDnsError = allResolverResults.every(r =>
    r.error === "dns_error" || r.error === "timeout" || r.error === "servfail" || r.error === "udp_blocked"
  );

  if (verified) {
    await supabase.from("stamps").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", id);
    return res.status(200).json({
      verified: true,
      resolvers: allResolverResults,
      httpCheck: httpResult,
      txtRecord: txtHost,
    });
  }

  return res.status(200).json({
    verified: false,
    dnsError: allDnsError,
    udpBlocked,
    anyNearMatch,        // record found but token mismatch
    anyRecordFound,      // any TXT records at all at this hostname
    resolvers: allResolverResults,
    httpCheck: httpResult,
    expected: expectedValue,
  });
}
