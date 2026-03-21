import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    const { rows } = await db.query(
      `SELECT id, domain, expiration_date, active, created_at, cancel_token
       FROM reminders WHERE email=$1 ORDER BY created_at DESC`,
      [session.user.email]
    );
    return res.status(200).json({ subscriptions: rows });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });
    await db.query(
      `UPDATE reminders SET active=false, cancelled_at=NOW(), cancel_reason='user_dashboard'
       WHERE id=$1 AND email=$2`,
      [id, session.user.email]
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
