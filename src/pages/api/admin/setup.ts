import type { NextApiRequest, NextApiResponse } from "next";
import { getDb, runMigrations } from "@/lib/db";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const steps: { step: string; ok: boolean; detail?: string }[] = [];

  // 1. Detect which env var is being used
  const urlSource =
    process.env.DATABASE_URL ? "DATABASE_URL" :
    process.env.POSTGRES_URL_NON_POOLING ? "POSTGRES_URL_NON_POOLING" :
    process.env.POSTGRES_URL ? "POSTGRES_URL (pooler)" :
    null;

  steps.push({
    step: "Database URL",
    ok: !!urlSource,
    detail: urlSource ?? "None found. Add DATABASE_URL or connect Supabase via Vercel integration.",
  });
  if (!urlSource) return res.status(500).json({ ok: false, steps });

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
      const { rows } = await db.query(`SELECT to_regclass($1) AS t`, [`public.${table}`]);
      const exists = !!rows[0]?.t;
      steps.push({ step: `Table: ${table}`, ok: exists, detail: exists ? "exists" : "not found after migration" });
    } catch (err: any) {
      steps.push({ step: `Table: ${table}`, ok: false, detail: err.message });
    }
  }

  // 6. Write test — insert a temporary stamp record
  const testId = `test_${randomBytes(4).toString("hex")}`;
  try {
    await db.query(
      `INSERT INTO stamps (id, domain, tag_name, tag_style, nickname, email, verify_token, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
      [testId, "setup-test.example", "Setup Test", "personal", "setup-bot", "setup@test.internal", "test-token"]
    );
    steps.push({ step: "Write test (INSERT)", ok: true });
  } catch (err: any) {
    steps.push({ step: "Write test (INSERT)", ok: false, detail: err.message });
  }

  // 7. Read test — select the record we just inserted
  try {
    const { rows } = await db.query(`SELECT id FROM stamps WHERE id=$1`, [testId]);
    steps.push({ step: "Read test (SELECT)", ok: rows.length === 1, detail: rows.length === 1 ? "round-trip OK" : "record not found" });
  } catch (err: any) {
    steps.push({ step: "Read test (SELECT)", ok: false, detail: err.message });
  }

  // 8. Cleanup
  try {
    await db.query(`DELETE FROM stamps WHERE id=$1`, [testId]);
    steps.push({ step: "Cleanup (DELETE)", ok: true });
  } catch (err: any) {
    steps.push({ step: "Cleanup (DELETE)", ok: false, detail: err.message });
  }

  const allOk = steps.every((s) => s.ok);
  return res.status(allOk ? 200 : 500).json({ ok: allOk, steps });
}
