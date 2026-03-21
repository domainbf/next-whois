import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "Missing token" });

  try {
    const db = await getDbReady();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { rows } = await db.query(
      `UPDATE reminders SET active=false, cancelled_at=NOW(), cancel_reason='user_cancel'
       WHERE cancel_token=$1 AND active=true RETURNING domain, email`,
      [token]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.status(200).json({ ok: true, domain: rows[0].domain, email: rows[0].email });
  } catch (err: any) {
    console.error("[remind/cancel] DB error:", err);
    return res.status(500).json({ error: "取消失败，请稍后重试" });
  }
}
