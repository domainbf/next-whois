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
        conditions.push(`(domain ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }
      if (filter === "active") conditions.push("active = true");
      if (filter === "inactive") conditions.push("active = false");

      const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
      const q = `SELECT id, domain, email, expiration_date, active, days_before, cancel_reason, cancelled_at, phase_flags, created_at
                 FROM reminders${where}
                 ORDER BY created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      const reminders = await many(q, params);

      const countParams = params.slice(0, params.length - 2);
      const countRow = await one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM reminders${where}`,
        countParams.length ? countParams : undefined
      );
      const total = parseInt(countRow?.count ?? "0");

      const [activeCount, inactiveCount] = await Promise.all([
        one<{ count: string }>("SELECT COUNT(*) AS count FROM reminders WHERE active = true"),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM reminders WHERE active = false"),
      ]);

      return res.json({
        reminders, total,
        activeCount: parseInt(activeCount?.count ?? "0"),
        inactiveCount: parseInt(inactiveCount?.count ?? "0"),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    const { active } = req.body as { active?: boolean };
    try {
      if (active === false) {
        await run("UPDATE reminders SET active = false, cancelled_at = NOW(), cancel_reason = '管理员停用' WHERE id = $1", [id]);
      } else if (active === true) {
        await run("UPDATE reminders SET active = true, cancelled_at = NULL, cancel_reason = NULL WHERE id = $1", [id]);
      }
      const updated = await one("SELECT * FROM reminders WHERE id = $1", [id]);
      return res.json({ ok: true, reminder: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    try {
      await run("DELETE FROM reminders WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
