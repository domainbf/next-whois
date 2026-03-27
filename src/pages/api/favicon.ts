import type { NextApiRequest, NextApiResponse } from "next";

const _cache = new Map<string, { buf: Buffer; contentType: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).end();

  const cached = _cache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.setHeader("Content-Type", cached.contentType);
    return res.end(cached.buf);
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!r.ok) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get("content-type") || "image/png";
    _cache.set(domain, { buf, contentType, ts: Date.now() });
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.setHeader("Content-Type", contentType);
    return res.end(buf);
  } catch {
    return res.status(404).end();
  }
}
