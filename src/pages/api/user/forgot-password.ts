import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { one, run, isDbReady } from "@/lib/db-query";
import { sendEmail, passwordResetHtml, getSiteLabel } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const RESET_EXPIRES_MINUTES = 60;
const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:5000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = await checkRateLimit(`${ip}:forgot`, 3, 10 * 60_000);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请10分钟后再试" });

  const { email } = req.body;
  if (!email || typeof email !== "string")
    return res.status(400).json({ error: "请输入邮箱地址" });

  const cleanEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    return res.status(400).json({ error: "邮箱格式不正确" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  const user = await one<{ id: string }>("SELECT id FROM users WHERE email = $1", [cleanEmail]);
  // Always return ok to prevent email enumeration
  if (!user) return res.status(200).json({ ok: true });

  await run(
    "UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false",
    [user.id],
  );

  const tokenId = randomBytes(8).toString("hex");
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000).toISOString();

  try {
    await run(
      "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)",
      [tokenId, user.id, rawToken, expiresAt],
    );
  } catch (err: any) {
    console.error("[forgot-password] token insert error:", err.message);
    return res.status(500).json({ error: "操作失败，请稍后重试" });
  }

  const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}`;
  const siteName = await getSiteLabel().catch(() => "X.RW");
  try {
    await sendEmail({
      to: cleanEmail,
      subject: `重置你的 ${siteName} 密码`,
      html: passwordResetHtml({ resetUrl, siteName }),
    });
  } catch (e) {
    console.error("[forgot-password] Failed to send email:", e);
    return res.status(500).json({ error: "邮件发送失败，请稍后重试" });
  }

  return res.status(200).json({ ok: true });
}
