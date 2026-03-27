import type { NextApiRequest, NextApiResponse } from "next";
import { many, isDbReady } from "@/lib/db-query";

const _cache = new Map<string, { stamps: any[]; ts: number }>();
const CACHE_TTL = 60_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).json({ error: "Missing domain" });

  const cached = _cache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return res.status(200).json({ stamps: cached.stamps });
  }

  if (!(await isDbReady())) return res.status(200).json({ stamps: [] });

  try {
    const rows = await many(
      `SELECT id, tag_name, tag_style, card_theme, link, nickname, description, verified_at
       FROM stamps WHERE domain = $1 AND verified = true
       ORDER BY verified_at DESC`,
      [domain],
    );
    const stamps = rows.map((r) => ({
      id: r.id, tagName: r.tag_name, tagStyle: r.tag_style,
      cardTheme: r.card_theme || "app",
      link: r.link, nickname: r.nickname, description: r.description,
      verifiedAt: r.verified_at,
    }));
    _cache.set(domain, { stamps, ts: Date.now() });
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return res.status(200).json({ stamps });
  } catch (err: any) {
    console.error("[stamp/check] error:", err);
    return res.status(500).json({ error: "查询失败，请稍后重试", stamps: [] });
  }
}
