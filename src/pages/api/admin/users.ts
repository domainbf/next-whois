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

      let q = `SELECT id, email, name, created_at FROM users`;
      const params: any[] = [];
      if (search) {
        params.push(`%${search}%`);
        q += ` WHERE email ILIKE $1 OR name ILIKE $1`;
      }
      q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const users = await many(pool, q, params);

      const countQ = search
        ? `SELECT COUNT(*) AS count FROM users WHERE email ILIKE $1 OR name ILIKE $1`
        : `SELECT COUNT(*) AS count FROM users`;
      const countParams = search ? [`%${search}%`] : [];
      const countRow = await many<{ count: string }>(pool, countQ, countParams);
      const total = parseInt(countRow[0]?.count ?? "0");

      return res.json({ users, total });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    try {
      await run(pool, "DELETE FROM users WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
