import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimit, getClientIp } from "@/lib/server/rate-limit";
import { enforceApiKey } from "@/lib/access-key";

export const config = { maxDuration: 20 };

const RL_LIMIT  = 30;
const RL_WINDOW = 60_000;

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/;
const ASN_RE = /^as?(\d+)$/i;

async function resolveHostname(host: string): Promise<string | null> {
  // Use DoH to avoid UDP port 53 blocks in serverless environments
  const url = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`;
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const answer = (data.Answer as any[] | undefined)?.find((a: any) => a.type === 1);
    if (answer?.data) return answer.data as string;
    // fallback: try AAAA
    const url6 = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=AAAA`;
    const r6 = await fetch(url6, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) });
    if (!r6.ok) return null;
    const data6 = await r6.json();
    const answer6 = (data6.Answer as any[] | undefined)?.find((a: any) => a.type === 28);
    return answer6?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchIpApi(ip: string): Promise<any> {
  const fields = "status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
  const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}&lang=zh-CN`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NextWhois/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ip-api.com returned ${res.status}`);
  return res.json();
}

async function fetchRdapIp(ip: string): Promise<any> {
  const endpoints = [
    `https://rdap.arin.net/registry/ip/${ip}`,
    `https://rdap.db.ripe.net/ip/${ip}`,
    `https://rdap.apnic.net/ip/${ip}`,
  ];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/rdap+json", "User-Agent": "NextWhois/1.0" },
        signal: AbortSignal.timeout(7000),
      });
      if (r.ok) return r.json();
    } catch {}
  }
  return null;
}

async function fetchRdapAsn(asn: number): Promise<any> {
  const endpoints = [
    `https://rdap.arin.net/registry/autnum/${asn}`,
    `https://rdap.db.ripe.net/autnum/${asn}`,
    `https://rdap.apnic.net/autnum/${asn}`,
    `https://rdap.lacnic.net/rdap/autnum/${asn}`,
    `https://rdap.afrinic.net/rdap/autnum/${asn}`,
  ];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/rdap+json", "User-Agent": "NextWhois/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return r.json();
    } catch {}
  }
  return null;
}

function extractRdapInfo(rdap: any): Record<string, string> {
  if (!rdap) return {};
  const info: Record<string, string> = {};
  if (rdap.name) info.name = rdap.name;
  if (rdap.handle) info.handle = rdap.handle;
  if (rdap.type) info.type = rdap.type;
  if (rdap.startAutnum) info.startAutnum = String(rdap.startAutnum);
  if (rdap.endAutnum) info.endAutnum = String(rdap.endAutnum);
  if (rdap.startAddress) info.startAddress = rdap.startAddress;
  if (rdap.endAddress) info.endAddress = rdap.endAddress;
  if (rdap.ipVersion) info.ipVersion = rdap.ipVersion;
  const entities: any[] = rdap.entities || [];
  for (const e of entities) {
    if (e.roles?.includes("registrant") || e.roles?.includes("administrative")) {
      const vcard = e.vcardArray?.[1] || [];
      for (const item of vcard) {
        if (item[0] === "fn") info.contact_name = item[3];
        if (item[0] === "org") info.contact_org = item[3];
        if (item[0] === "email") info.contact_email = item[3];
      }
    }
  }
  const remarks: any[] = rdap.remarks || [];
  for (const r of remarks) {
    if (r.description) info.description = Array.isArray(r.description) ? r.description.join(" ") : r.description;
  }
  return info;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { allowed } = rateLimit(getClientIp(req), RL_LIMIT, RL_WINDOW);
  if (!allowed) return res.status(429).json({ error: "Too many requests" });
  if (!await enforceApiKey(req, res)) return;

  let query = (req.query.q as string | undefined)?.trim();
  if (!query) return res.status(400).json({ error: "q parameter is required" });

  res.setHeader("Cache-Control", "no-store");

  const asnMatch = query.match(ASN_RE);
  if (asnMatch) {
    const asn = parseInt(asnMatch[1]);
    try {
      const rdap = await fetchRdapAsn(asn);
      const info = extractRdapInfo(rdap);
      return res.json({ type: "asn", asn, rdap: info, raw: rdap });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  let ip = query;
  let resolvedFrom: string | null = null;
  if (!IP_RE.test(query) && !IPV6_RE.test(query)) {
    const resolved = await resolveHostname(query);
    if (!resolved) return res.status(400).json({ error: "无法解析主机名，请输入有效的 IP 地址或主机名" });
    resolvedFrom = query;
    ip = resolved;
  }

  try {
    const [ipData, rdap] = await Promise.allSettled([
      fetchIpApi(ip),
      fetchRdapIp(ip),
    ]);

    const geo = ipData.status === "fulfilled" ? ipData.value : null;
    const rdapData = rdap.status === "fulfilled" ? rdap.value : null;
    const rdapInfo = extractRdapInfo(rdapData);

    if (geo?.status === "fail") {
      return res.status(400).json({ error: geo.message || "IP 查询失败" });
    }

    const flagEmoji = geo?.countryCode
      ? geo.countryCode.toUpperCase().split("").map((c: string) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("")
      : null;

    return res.json({
      type: IPV6_RE.test(ip) ? "ipv6" : "ipv4",
      query: ip,
      resolvedFrom,
      flag: flagEmoji,
      country: geo?.country ?? null,
      countryCode: geo?.countryCode ?? null,
      region: geo?.regionName ?? null,
      city: geo?.city ?? null,
      district: geo?.district ?? null,
      zip: geo?.zip ?? null,
      timezone: geo?.timezone ?? null,
      offset: geo?.offset ?? null,
      currency: geo?.currency ?? null,
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      isp: geo?.isp ?? null,
      org: geo?.org ?? null,
      as: geo?.as ?? null,
      asname: geo?.asname ?? null,
      reverse: geo?.reverse ?? null,
      mobile: geo?.mobile ?? null,
      proxy: geo?.proxy ?? null,
      hosting: geo?.hosting ?? null,
      rdap: rdapInfo,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "查询失败" });
  }
}
