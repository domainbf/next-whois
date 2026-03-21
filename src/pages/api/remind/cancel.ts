import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "Missing token" });

  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "Database unavailable" });

    const { data: existing } = await supabase
      .from("reminders")
      .select("id, domain, email")
      .eq("cancel_token", token)
      .eq("active", true)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: "not_found" });
    }

    await supabase
      .from("reminders")
      .update({ active: false, cancelled_at: new Date().toISOString(), cancel_reason: "user_cancel" })
      .eq("id", existing.id);

    return res.status(200).json({ ok: true, domain: existing.domain, email: existing.email });
  } catch (err: any) {
    console.error("[remind/cancel] DB error:", err);
    return res.status(500).json({ error: "取消失败，请稍后重试" });
  }
}
