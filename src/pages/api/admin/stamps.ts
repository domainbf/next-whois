import type { NextApiRequest, NextApiResponse } from "next";
import { many, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
      const offset = parseInt(String(req.query.offset || "0"));

      let q = `SELECT id, domain, tag_name, tag_style, link, description, nickname, email, verified, verified_at, created_at FROM stamps`;
      const params: any[] = [];
      if (search) {
        params.push(`%${search}%`);
        q += ` WHERE domain ILIKE $1 OR tag_name ILIKE $1 OR email ILIKE $1`;
      }
      q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const stamps = await many(q, params);

      const countQ = search
        ? `SELECT COUNT(*) AS count FROM stamps WHERE domain ILIKE $1 OR tag_name ILIKE $1 OR email ILIKE $1`
        : `SELECT COUNT(*) AS count FROM stamps`;
      const countParams = search ? [`%${search}%`] : [];
      const countRows = await many<{ count: string }>(countQ, countParams);
      const total = parseInt(countRows[0]?.count ?? "0");

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
        await run(`UPDATE stamps SET verified = true, verified_at = NOW() WHERE id = $1`, [id]);
      } else if (verified === false) {
        await run(`UPDATE stamps SET verified = false, verified_at = NULL WHERE id = $1`, [id]);
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
      await run("DELETE FROM stamps WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
