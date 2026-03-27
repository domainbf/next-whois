import type { NextApiRequest, NextApiResponse } from "next";
import { many, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(await isDbReady())) return res.status(200).json({ entries: [] });
  try {
    const entries = await many(
      `SELECT id, entry_date::text as entry_date, type, zh, en, version
       FROM changelog_entries ORDER BY entry_date DESC, created_at DESC`,
    );
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ entries });
  } catch {
    return res.status(200).json({ entries: [] });
  }
}
