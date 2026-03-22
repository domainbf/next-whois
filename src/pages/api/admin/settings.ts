import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { many, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const pool = await getDbReady();
      const rows = await many<{ key: string; value: string }>(
        pool, "SELECT key, value FROM site_settings", []
      );
      const settings: Record<string, string> = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return res.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    } catch {
      return res.json({ settings: DEFAULT_SETTINGS });
    }
  }

  if (req.method === "PUT") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const body = req.body as Partial<SiteSettings>;
    try {
      const pool = await getDbReady();
      const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];
      for (const key of allowed) {
        if (key in body) {
          await run(pool,
            `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, String(body[key] ?? "")]
          );
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed" });
}
