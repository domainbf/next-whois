import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "PATCH") {
    const { name } = req.body;
    if (name === undefined) return res.status(400).json({ error: "name required" });

    const trimmed = String(name).trim().slice(0, 50);

    const { error } = await supabase
      .from("users")
      .update({ name: trimmed || null })
      .eq("email", session.user.email);

    if (error) {
      console.error("[profile] PATCH error:", error.message);
      return res.status(500).json({ error: "更新失败" });
    }
    return res.status(200).json({ ok: true, name: trimmed || null });
  }

  return res.status(405).end();
}
