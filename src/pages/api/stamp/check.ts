import type { NextApiRequest, NextApiResponse } from "next";
import { readData, StampsDB, StampRecord } from "@/lib/data-store";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).json({ error: "Missing domain" });

  try {
    const db = await getDbReady();
    if (db) {
      const { rows } = await db.query(
        `SELECT id, tag_name, tag_style, link, nickname, verified_at
         FROM stamps WHERE domain=$1 AND verified=true ORDER BY verified_at DESC`,
        [domain]
      );
      return res.status(200).json({
        stamps: rows.map((r) => ({
          id: r.id, tagName: r.tag_name, tagStyle: r.tag_style,
          link: r.link, nickname: r.nickname, verifiedAt: r.verified_at,
        })),
      });
    }

    const fileDb = readData<StampsDB>("stamps.json", {});
    const records = (fileDb[domain] || []).filter((r: StampRecord) => r.verified);
    return res.status(200).json({
      stamps: records.map((r) => ({
        id: r.id, tagName: r.tagName, tagStyle: r.tagStyle,
        link: r.link, nickname: r.nickname, verifiedAt: r.verifiedAt,
      })),
    });
  } catch (err: any) {
    console.error("[stamp/check] DB error:", err);
    return res.status(500).json({ error: "查询失败，请稍后重试", stamps: [] });
  }
}
