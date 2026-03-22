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

      let q = `SELECT id, query, query_type, issue_types, description, email, created_at FROM feedback`;
      const params: any[] = [];
      if (search) {
        params.push(`%${search}%`);
        q += ` WHERE query ILIKE $1 OR email ILIKE $1 OR description ILIKE $1`;
      }
      q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const rows = await many(q, params);

      const countQ = search
        ? `SELECT COUNT(*) AS count FROM feedback WHERE query ILIKE $1 OR email ILIKE $1 OR description ILIKE $1`
        : `SELECT COUNT(*) AS count FROM feedback`;
      const countParams = search ? [`%${search}%`] : [];
      const countRows = await many<{ count: string }>(countQ, countParams);
      const total = parseInt(countRows[0]?.count ?? "0");

      return res.json({ feedback: rows, total });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    try {
      await run("DELETE FROM feedback WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
