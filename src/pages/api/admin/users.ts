import type { NextApiRequest, NextApiResponse } from "next";
import { many, one, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

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
        conditions.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`);
      }
      if (filter === "active") conditions.push("disabled = false");
      if (filter === "disabled") conditions.push("disabled = true");

      const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
      const q = `SELECT id, email, name, created_at, updated_at, disabled, admin_notes
                 FROM users${where}
                 ORDER BY created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const users = await many(q, params);

      const countParams = params.slice(0, params.length - 2);
      const countRow = await one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM users${where}`,
        countParams.length ? countParams : undefined
      );
      const total = parseInt(countRow?.count ?? "0");

      const [disabledRow, activeRow] = await Promise.all([
        one<{ count: string }>("SELECT COUNT(*) AS count FROM users WHERE disabled = true"),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM users WHERE disabled = false"),
      ]);
      const disabledCount = parseInt(disabledRow?.count ?? "0");
      const activeCount = parseInt(activeRow?.count ?? "0");

      return res.json({ users, total, disabled: disabledCount, activeCount });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

    const { name, email, admin_notes, disabled } = req.body as {
      name?: string; email?: string; admin_notes?: string; disabled?: boolean;
    };

    try {
      const existing = await one<{ email: string }>("SELECT email FROM users WHERE id = $1", [id]);
      if (!existing) return res.status(404).json({ error: "用户不存在" });
      if (existing.email === ADMIN_EMAIL) return res.status(403).json({ error: "无法修改创始人账户" });

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) { params.push(name || null); updates.push(`name = $${params.length}`); }
      if (email !== undefined) { params.push(email.toLowerCase().trim()); updates.push(`email = $${params.length}`); }
      if (admin_notes !== undefined) { params.push(admin_notes || null); updates.push(`admin_notes = $${params.length}`); }
      if (disabled !== undefined) { params.push(Boolean(disabled)); updates.push(`disabled = $${params.length}`); }

      if (updates.length === 0) return res.status(400).json({ error: "无可更新字段" });
      updates.push(`updated_at = NOW()`);

      params.push(id);
      await run(`UPDATE users SET ${updates.join(", ")} WHERE id = $${params.length}`, params);

      const updated = await one("SELECT id, email, name, created_at, updated_at, disabled, admin_notes FROM users WHERE id = $1", [id]);
      return res.json({ ok: true, user: updated });
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "该邮箱已被其他账户使用" });
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });
    try {
      const existing = await one<{ email: string }>("SELECT email FROM users WHERE id = $1", [id]);
      if (existing?.email === ADMIN_EMAIL) return res.status(403).json({ error: "无法删除创始人账户" });
      await run("DELETE FROM users WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
