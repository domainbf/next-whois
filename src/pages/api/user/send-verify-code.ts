import type { NextApiRequest, NextApiResponse } from "next";
import { setRedisValue, getRedisValue } from "@/lib/server/redis";
import { sendEmail, verifyCodeHtml } from "@/lib/email";
import { isDbReady, one } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)))
    return res.status(400).json({ error: "邮箱格式不正确" });

  const cleanEmail = String(email).toLowerCase().trim();

  if (await isDbReady()) {
    const existing = await one("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existing) return res.status(409).json({ error: "该邮箱已注册" });
  }

  const rateLimitKey = `verify:rate:${cleanEmail}`;
  const recentlySent = await getRedisValue(rateLimitKey);
  if (recentlySent) return res.status(429).json({ error: "请稍等 60 秒后再重新发送" });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const storeKey = `verify:register:${cleanEmail}`;
  await setRedisValue(storeKey, code, 600);
  await setRedisValue(rateLimitKey, "1", 60);

  await sendEmail({
    to: cleanEmail,
    subject: `${code} 是你的 Next WHOIS 注册验证码`,
    html: verifyCodeHtml({ code, email: cleanEmail }),
  });

  return res.status(200).json({ ok: true });
}
