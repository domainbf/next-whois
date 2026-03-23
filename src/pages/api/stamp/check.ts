import type { NextApiRequest, NextApiResponse } from "next";
import { many, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).json({ error: "Missing domain" });

  if (!(await isDbReady())) return res.status(200).json({ stamps: [] });

  try {
    const rows = await many(
      `SELECT id, tag_name, tag_style, link, nickname, description, verified_at
       FROM stamps WHERE domain = $1 AND verified = true
       ORDER BY verified_at DESC`,
      [domain],
    );
    return res.status(200).json({
      stamps: rows.map((r) => ({
        id: r.id, tagName: r.tag_name, tagStyle: r.tag_style,
        link: r.link, nickname: r.nickname, description: r.description,
        verifiedAt: r.verified_at,
      })),
    });
  } catch (err: any) {
    console.error("[stamp/check] error:", err);
    return res.status(500).json({ error: "查询失败，请稍后重试", stamps: [] });
  }
}
