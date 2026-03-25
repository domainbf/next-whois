import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin";
import { many, one, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  // GET — list all entries, newest first
  if (req.method === "GET") {
    try {
      const rows = await many(
        `SELECT id, entry_date::text as entry_date, type, zh, en, version, created_at
         FROM changelog_entries ORDER BY entry_date DESC, created_at DESC`,
      );
      return res.status(200).json({ entries: rows, total: rows.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create entry
  if (req.method === "POST") {
    const { entry_date, type, zh, en, version } = req.body;
    if (!entry_date || !zh?.trim()) return res.status(400).json({ error: "entry_date 和 zh 为必填" });
    const id = randomBytes(8).toString("hex");
    try {
      await run(
        `INSERT INTO changelog_entries (id, entry_date, type, zh, en, version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, entry_date, type || "new", zh.trim(), (en || "").trim(), version?.trim() || null],
      );
      const row = await one(
        `SELECT id, entry_date::text as entry_date, type, zh, en, version, created_at
         FROM changelog_entries WHERE id = $1`,
        [id],
      );
      return res.status(201).json({ entry: row });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — update entry
  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    const { entry_date, type, zh, en, version } = req.body;
    if (!entry_date || !zh?.trim()) return res.status(400).json({ error: "entry_date 和 zh 为必填" });
    try {
      await run(
        `UPDATE changelog_entries
         SET entry_date = $1, type = $2, zh = $3, en = $4, version = $5
         WHERE id = $6`,
        [entry_date, type || "new", zh.trim(), (en || "").trim(), version?.trim() || null, id as string],
      );
      const row = await one(
        `SELECT id, entry_date::text as entry_date, type, zh, en, version, created_at
         FROM changelog_entries WHERE id = $1`,
        [id as string],
      );
      return res.status(200).json({ entry: row });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — remove entry
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    try {
      await run(`DELETE FROM changelog_entries WHERE id = $1`, [id as string]);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
