import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const steps: { step: string; ok: boolean; detail?: string }[] = [];

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  steps.push({
    step: "Supabase config",
    ok: !!(supabaseUrl && supabaseKey),
    detail: supabaseUrl
      ? `SUPABASE_URL → ${supabaseUrl}`
      : "Missing SUPABASE_URL and/or SUPABASE_SERVICE_KEY",
  });

  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ ok: false, steps });

  const supabase = getSupabase();
  steps.push({ step: "Client created", ok: !!supabase });
  if (!supabase) return res.status(500).json({ ok: false, steps });

  const tables = ["stamps", "reminders", "reminder_logs"];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    const missing = error?.code === "PGRST205";
    steps.push({
      step: `Table: ${table}`,
      ok: !missing,
      detail: missing
        ? `Table not found — run schema SQL in Supabase Dashboard → SQL Editor`
        : error
        ? `Error: ${error.message}`
        : "exists",
    });
  }

  const testId = `test_${randomBytes(4).toString("hex")}`;
  const { error: insertErr } = await supabase.from("stamps").insert({
    id: testId,
    domain: "setup-test.example",
    tag_name: "Setup Test",
    tag_style: "personal",
    nickname: "setup-bot",
    email: "setup@test.internal",
    verify_token: "test-token",
    verified: false,
  });
  steps.push({ step: "Write test (INSERT)", ok: !insertErr, detail: insertErr?.message });

  if (!insertErr) {
    const { data: readData, error: readErr } = await supabase
      .from("stamps").select("id").eq("id", testId).maybeSingle();
    steps.push({ step: "Read test (SELECT)", ok: !!readData && !readErr, detail: readData ? "round-trip OK" : readErr?.message ?? "record not found" });

    const { error: delErr } = await supabase.from("stamps").delete().eq("id", testId);
    steps.push({ step: "Cleanup (DELETE)", ok: !delErr, detail: delErr?.message });
  }

  const allOk = steps.every((s) => s.ok);
  return res.status(allOk ? 200 : 500).json({ ok: allOk, steps });
}
