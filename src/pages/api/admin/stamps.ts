import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { many, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const pool = await getDbReady();

  if (req.method === "GET") {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
      const offset = parseInt(String(req.query.offset || "0"));

      let q = `SELECT s.*, u.email AS user_email FROM stamps s LEFT JOIN users u ON u.id = s.user_id`;
      const params: any[] = [];
      if (search) {
        params.push(`%${search}%`);
        q += ` WHERE s.domain ILIKE $1 OR s.tag_name ILIKE $1 OR u.email ILIKE $1`;
      }
      q += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const stamps = await many(pool, q, params);

      const countQ = search
        ? `SELECT COUNT(*) AS count FROM stamps s LEFT JOIN users u ON u.id = s.user_id WHERE s.domain ILIKE $1 OR s.tag_name ILIKE $1 OR u.email ILIKE $1`
        : `SELECT COUNT(*) AS count FROM stamps`;
      const countParams = search ? [`%${search}%`] : [];
      const countRow = await many<{ count: string }>(pool, countQ, countParams);
      const total = parseInt(countRow[0]?.count ?? "0");

      return res.json({ stamps, total });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    const { verified } = req.body;
    try {
      if (verified === true) {
        await run(pool,
          `UPDATE stamps SET verified = true, verified_at = NOW() WHERE id = $1`, [id]
        );
      } else if (verified === false) {
        await run(pool,
          `UPDATE stamps SET verified = false, verified_at = NULL WHERE id = $1`, [id]
        );
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    try {
      await run(pool, "DELETE FROM stamps WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
