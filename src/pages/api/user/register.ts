import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "邮箱和密码不能为空" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "邮箱格式不正确" });
  if (String(password).length < 8)
    return res.status(400).json({ error: "密码至少 8 位" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用，请稍后重试" });

  const cleanEmail = String(email).toLowerCase().trim();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: "该邮箱已注册" });

  const id = randomBytes(8).toString("hex");
  const passwordHash = await hash(String(password), 12);
  const cleanName = name ? String(name).trim().slice(0, 50) || null : null;

  const { error } = await supabase.from("users").insert({
    id,
    email: cleanEmail,
    password_hash: passwordHash,
    name: cleanName,
  });

  if (error) {
    console.error("[register] insert error:", error.message);
    return res.status(500).json({ error: "注册失败，请稍后重试" });
  }

  return res.status(201).json({ ok: true });
}
