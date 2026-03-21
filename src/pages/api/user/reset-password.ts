import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, password } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "无效的重置链接" });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "密码至少 8 位" });
  }

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用" });

  const { data: record } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used")
    .eq("token", token)
    .maybeSingle();

  if (!record) {
    return res.status(400).json({ error: "重置链接无效或已过期" });
  }
  if (record.used) {
    return res.status(400).json({ error: "该重置链接已被使用，请重新申请" });
  }
  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: "重置链接已过期，请重新申请" });
  }

  const newHash = await hash(String(password), 12);

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", record.user_id);

  if (updateError) {
    console.error("[reset-password] update error:", updateError.message);
    return res.status(500).json({ error: "重置失败，请稍后重试" });
  }

  await supabase
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("id", record.id);

  return res.status(200).json({ ok: true });
}
