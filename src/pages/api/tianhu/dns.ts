import type { NextApiRequest, NextApiResponse } from "next";

const TIANHU_BASE = "https://api.tian.hu";
const TIMEOUT_MS = 10000;

export type TianhuDnsRecord = {
  type: string;
  entries: string[];
  ttl: number;
};

function parseEntries(raw: string): string[] {
  return raw
    .split(/<\/br>|<br\s*\/?>/gi)
    .map((s) => s.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { domain } = req.query;
  if (!domain || typeof domain !== "string") {
    return res.status(400).json({ error: "missing domain" });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${TIANHU_BASE}/dns/${encodeURIComponent(domain)}`, {
      signal: ctrl.signal,
      headers: { "lang": "zh" },
    });
    if (!r.ok) return res.status(200).json({ records: [] });
    const json = await r.json();
    if (json.code !== 200 || !Array.isArray(json.data)) {
      return res.status(200).json({ records: [] });
    }
    const records: TianhuDnsRecord[] = json.data.map(
      (item: { type: string; entries: string; ttl: number }) => ({
        type: item.type,
        entries: parseEntries(item.entries || ""),
        ttl: item.ttl,
      }),
    );
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ records });
  } catch {
    return res.status(200).json({ records: [] });
  } finally {
    clearTimeout(timer);
  }
}
