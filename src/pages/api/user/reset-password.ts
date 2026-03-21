import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, password } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "无效的重置链接" });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "密码至少 8 位" });
  }

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  const { rows } = await db.query(
    `SELECT id, user_id, expires_at, used
     FROM password_reset_tokens
     WHERE token=$1 LIMIT 1`,
    [token],
  );

  const record = rows[0];
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

  await db.query(
    `UPDATE users SET password_hash=$1 WHERE id=$2`,
    [newHash, record.user_id],
  );

  await db.query(
    `UPDATE password_reset_tokens SET used=true WHERE id=$1`,
    [record.id],
  );

  return res.status(200).json({ ok: true });
}
