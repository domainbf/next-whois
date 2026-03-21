import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { getDbReady } from "@/lib/db";

const RESET_EXPIRES_MINUTES = 60;
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:5000";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@x.rw";
const RESEND_KEY = process.env.RESEND_API_KEY;

async function sendResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!RESEND_KEY) {
    console.warn("[forgot-password] RESEND_API_KEY not set, skipping email send");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: "重置你的 NiC.RW 密码",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px">密码重置请求</h2>
          <p style="color:#555;margin:0 0 24px;font-size:14px;line-height:1.6">
            我们收到了你的密码重置请求。点击下方按钮设置新密码，该链接 ${RESET_EXPIRES_MINUTES} 分钟内有效。
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#0070f3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
            重置密码
          </a>
          <p style="color:#999;margin:24px 0 0;font-size:12px;line-height:1.6">
            如果你没有申请重置密码，请忽略此邮件，你的密码不会发生变化。
            <br/>链接地址：${resetUrl}
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[forgot-password] Resend error:", body);
    throw new Error("邮件发送失败");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "请输入邮箱地址" });
  }

  const cleanEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "邮箱格式不正确" });
  }

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  const { rows } = await db.query(
    `SELECT id FROM users WHERE email=$1 LIMIT 1`,
    [cleanEmail],
  );

  if (!rows[0]) {
    return res.status(200).json({ ok: true });
  }

  const userId = rows[0].id;

  await db.query(
    `UPDATE password_reset_tokens SET used=true WHERE user_id=$1 AND used=false`,
    [userId],
  );

  const tokenId = randomBytes(8).toString("hex");
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1,$2,$3,$4)`,
    [tokenId, userId, rawToken, expiresAt],
  );

  const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}`;

  try {
    await sendResetEmail(cleanEmail, resetUrl);
  } catch (e) {
    console.error("[forgot-password] Failed to send email:", e);
    return res.status(500).json({ error: "邮件发送失败，请稍后重试" });
  }

  return res.status(200).json({ ok: true });
}
