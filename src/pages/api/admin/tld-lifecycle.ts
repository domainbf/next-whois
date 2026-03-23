import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin";
import { many, one, run, isDbReady } from "@/lib/db-query";
import { invalidateLifecycleOverridesCache } from "@/lib/server/lifecycle-overrides";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  // GET — list all custom overrides
  if (req.method === "GET") {
    try {
      const rows = await many(
        `SELECT id, tld, grace, redemption, pending_delete, registry, notes, created_at, updated_at
         FROM tld_lifecycle_overrides ORDER BY tld`,
      );
      return res.status(200).json({ overrides: rows, total: rows.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create new override
  if (req.method === "POST") {
    const { tld, grace, redemption, pending_delete, registry, notes } = req.body;
    if (!tld || typeof tld !== "string") return res.status(400).json({ error: "tld required" });
    const g = Number(grace) || 0;
    const r = Number(redemption) || 0;
    const p = Number(pending_delete) || 0;
    const id = randomBytes(8).toString("hex");
    try {
      await run(
        `INSERT INTO tld_lifecycle_overrides (id, tld, grace, redemption, pending_delete, registry, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, tld.toLowerCase().trim(), g, r, p, registry || null, notes || null],
      );
      invalidateLifecycleOverridesCache();
      const row = await one(
        `SELECT id, tld, grace, redemption, pending_delete, registry, notes, created_at, updated_at
         FROM tld_lifecycle_overrides WHERE id = $1`,
        [id],
      );
      return res.status(201).json({ override: row });
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "该 TLD 已有规则，请编辑现有记录" });
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH — update override
  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    const { grace, redemption, pending_delete, registry, notes } = req.body;
    try {
      await run(
        `UPDATE tld_lifecycle_overrides
         SET grace = $1, redemption = $2, pending_delete = $3, registry = $4, notes = $5, updated_at = NOW()
         WHERE id = $6`,
        [Number(grace) || 0, Number(redemption) || 0, Number(pending_delete) || 0,
         registry || null, notes || null, id as string],
      );
      invalidateLifecycleOverridesCache();
      const row = await one(
        `SELECT id, tld, grace, redemption, pending_delete, registry, notes, created_at, updated_at
         FROM tld_lifecycle_overrides WHERE id = $1`,
        [id as string],
      );
      return res.status(200).json({ override: row });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — remove override (resets TLD to hardcoded default)
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    try {
      await run(`DELETE FROM tld_lifecycle_overrides WHERE id = $1`, [id as string]);
      invalidateLifecycleOverridesCache();
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
