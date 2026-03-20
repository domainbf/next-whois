import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).send("Missing token");

  const db = getDb();
  if (!db) return res.status(500).send("Database unavailable");

  const { rows } = await db.query(
    `UPDATE reminders SET active=false, cancelled_at=NOW(), cancel_reason='user_cancel'
     WHERE cancel_token=$1 AND active=true RETURNING domain, email`,
    [token]
  );

  if (!rows[0]) {
    return res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
        <h2>🔍 未找到订阅</h2>
        <p style="color:#6b7280">该订阅已取消或不存在。</p>
      </body></html>
    `);
  }

  return res.status(200).send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
      <div style="max-width:400px;margin:0 auto">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h2 style="color:#111827">已取消订阅</h2>
        <p style="color:#6b7280">您已成功取消 <strong>${rows[0].domain}</strong> 的域名到期提醒。</p>
        <p style="color:#9ca3af;font-size:13px">${rows[0].email} 将不再收到相关提醒邮件。</p>
        <a href="/" style="display:inline-block;margin-top:24px;background:#0ea5e9;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px">返回 Next Whois</a>
      </div>
    </body></html>
  `);
}
