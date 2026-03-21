import type { NextApiRequest, NextApiResponse } from "next";
import { getDb, runMigrations } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const steps: { step: string; ok: boolean; detail?: string }[] = [];

  // 1. Check DATABASE_URL
  const hasUrl = !!process.env.DATABASE_URL;
  steps.push({ step: "DATABASE_URL configured", ok: hasUrl, detail: hasUrl ? "present" : "missing — add this environment variable on Vercel" });
  if (!hasUrl) return res.status(500).json({ ok: false, steps });

  // 2. Get pool
  const db = getDb();
  steps.push({ step: "Pool created", ok: !!db });
  if (!db) return res.status(500).json({ ok: false, steps });

  // 3. Test connectivity
  try {
    await db.query("SELECT 1");
    steps.push({ step: "Database connection", ok: true });
  } catch (err: any) {
    steps.push({ step: "Database connection", ok: false, detail: err.message });
    return res.status(500).json({ ok: false, steps });
  }

  // 4. Run migrations
  try {
    await runMigrations(db);
    steps.push({ step: "Schema migration (CREATE TABLE IF NOT EXISTS)", ok: true });
  } catch (err: any) {
    steps.push({ step: "Schema migration", ok: false, detail: err.message });
    return res.status(500).json({ ok: false, steps });
  }

  // 5. Verify tables exist
  const tables = ["stamps", "reminders", "reminder_logs"];
  for (const table of tables) {
    try {
      const { rows } = await db.query(
        `SELECT to_regclass($1) AS exists`,
        [`public.${table}`]
      );
      const exists = !!rows[0]?.exists;
      steps.push({ step: `Table: ${table}`, ok: exists, detail: exists ? "exists" : "not found" });
    } catch (err: any) {
      steps.push({ step: `Table: ${table}`, ok: false, detail: err.message });
    }
  }

  const allOk = steps.every((s) => s.ok);
  return res.status(allOk ? 200 : 500).json({ ok: allOk, steps });
}
