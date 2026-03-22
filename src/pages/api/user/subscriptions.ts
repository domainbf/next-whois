import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { many, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    try {
      const rows = await many(
        `SELECT id, domain, expiration_date, active, created_at, cancel_token
         FROM reminders WHERE email = $1 ORDER BY created_at DESC`,
        [session.user.email],
      );
      return res.status(200).json({ subscriptions: rows });
    } catch (err: any) {
      console.error("[subscriptions] GET error:", err.message);
      return res.status(500).json({ error: "获取数据失败" });
    }
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { expiration_date } = req.body;
    if (!expiration_date) return res.status(400).json({ error: "expiration_date required" });

    const parsed = new Date(expiration_date);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: "Invalid date" });

    try {
      await run(
        "UPDATE reminders SET expiration_date = $1 WHERE id = $2 AND email = $3",
        [parsed.toISOString(), id as string, session.user.email],
      );
    } catch (err: any) {
      console.error("[subscriptions] PATCH error:", err.message);
      return res.status(500).json({ error: "更新失败" });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    try {
      await run(
        `UPDATE reminders
         SET active = false, cancelled_at = $1, cancel_reason = 'user_dashboard'
         WHERE id = $2 AND email = $3`,
        [new Date().toISOString(), id as string, session.user.email],
      );
    } catch (err: any) {
      console.error("[subscriptions] DELETE error:", err.message);
      return res.status(500).json({ error: "取消失败" });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
