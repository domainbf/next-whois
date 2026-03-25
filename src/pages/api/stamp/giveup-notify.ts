import type { NextApiRequest, NextApiResponse } from "next";
import { one, isDbReady } from "@/lib/db-query";
import { sendEmail, stampVerifyTimeoutHtml, getSiteLabel } from "@/lib/email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain, appUrl } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  if (!(await isDbReady())) return res.status(503).json({ error: "Database unavailable" });

  const stamp = await one<{ email: string; verify_token: string; verified: boolean }>(
    "SELECT email, verify_token, verified FROM stamps WHERE id = $1 AND domain = $2",
    [id, String(domain).toLowerCase().trim()],
  );

  if (!stamp) return res.status(404).json({ error: "Stamp not found" });
  if (stamp.verified) return res.status(200).json({ skipped: true, reason: "already_verified" });

  const { email, verify_token } = stamp;
  const fileContent = `next-whois-verify=${verify_token}`;
  const appBase = (appUrl && String(appUrl).startsWith("http"))
    ? appUrl
    : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw");
  const verifyUrl = `${appBase}/stamp?domain=${encodeURIComponent(domain)}`;

  const siteName = await getSiteLabel().catch(() => "X.RW");

  await sendEmail({
    to: email,
    subject: `⚠️ DNS 验证超时 · ${domain} — 请改用文件验证`,
    html: stampVerifyTimeoutHtml({ domain, fileContent, verifyUrl, siteName }),
  });

  return res.status(200).json({ sent: true, to: email });
}
