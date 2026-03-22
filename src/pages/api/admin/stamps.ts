import type { NextApiRequest, NextApiResponse } from "next";
import { many, one, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const filter = typeof req.query.filter === "string" ? req.query.filter : "all";
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
      const offset = parseInt(String(req.query.offset || "0"));

      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(domain ILIKE $${params.length} OR tag_name ILIKE $${params.length} OR email ILIKE $${params.length} OR nickname ILIKE $${params.length})`);
      }
      if (filter === "verified") conditions.push("verified = true");
      if (filter === "pending") conditions.push("verified = false");

      const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
      const q = `SELECT id, domain, tag_name, tag_style, link, description, nickname, email, verified, verified_at, created_at
                 FROM stamps${where}
                 ORDER BY created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      const stamps = await many(q, params);

      const countParams = params.slice(0, params.length - 2);
      const countRow = await one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM stamps${where}`,
        countParams.length ? countParams : undefined
      );
      const total = parseInt(countRow?.count ?? "0");

      const [verifiedCount, pendingCount] = await Promise.all([
        one<{ count: string }>("SELECT COUNT(*) AS count FROM stamps WHERE verified = true"),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM stamps WHERE verified = false"),
      ]);

      return res.json({
        stamps, total,
        verifiedCount: parseInt(verifiedCount?.count ?? "0"),
        pendingCount: parseInt(pendingCount?.count ?? "0"),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    const { verified, tag_name, tag_style, link, description } = req.body;
    try {
      if (verified === true) {
        await run(`UPDATE stamps SET verified = true, verified_at = NOW() WHERE id = $1`, [id]);
      } else if (verified === false) {
        await run(`UPDATE stamps SET verified = false, verified_at = NULL WHERE id = $1`, [id]);
      }
      if (tag_name !== undefined || tag_style !== undefined || link !== undefined || description !== undefined) {
        const sets: string[] = [];
        const params: any[] = [];
        if (tag_name !== undefined) { params.push(tag_name || null); sets.push(`tag_name = $${params.length}`); }
        if (tag_style !== undefined) { params.push(tag_style || null); sets.push(`tag_style = $${params.length}`); }
        if (link !== undefined) { params.push(link || null); sets.push(`link = $${params.length}`); }
        if (description !== undefined) { params.push(description || null); sets.push(`description = $${params.length}`); }
        if (sets.length) {
          params.push(id);
          await run(`UPDATE stamps SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        }
      }
      const updated = await one("SELECT * FROM stamps WHERE id = $1", [id]);
      return res.json({ ok: true, stamp: updated });
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
