import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("reminders")
      .select("id, domain, expiration_date, active, created_at, cancel_token")
      .eq("email", session.user.email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[subscriptions] GET error:", error.message);
      return res.status(500).json({ error: "获取数据失败" });
    }
    return res.status(200).json({ subscriptions: data });
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { expiration_date } = req.body;
    if (!expiration_date) return res.status(400).json({ error: "expiration_date required" });

    const parsed = new Date(expiration_date);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: "Invalid date" });

    const { error } = await supabase
      .from("reminders")
      .update({ expiration_date: parsed.toISOString() })
      .eq("id", id as string)
      .eq("email", session.user.email);

    if (error) {
      console.error("[subscriptions] PATCH error:", error.message);
      return res.status(500).json({ error: "更新失败" });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { error } = await supabase
      .from("reminders")
      .update({
        active: false,
        cancelled_at: new Date().toISOString(),
        cancel_reason: "user_dashboard",
      })
      .eq("id", id as string)
      .eq("email", session.user.email);

    if (error) {
      console.error("[subscriptions] DELETE error:", error.message);
      return res.status(500).json({ error: "取消失败" });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
