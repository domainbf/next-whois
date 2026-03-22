import type { NextApiRequest, NextApiResponse } from "next";
import { one, isDbReady } from "@/lib/db-query";
import { sendEmail } from "@/lib/email";

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmailHtml({
  domain,
  fileContent,
  verifyUrl,
}: {
  domain: string;
  fileContent: string;
  verifyUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DNS 验证超时</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1);">
    <div style="background:#ef4444;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">⚠️ DNS 验证超时</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;">您的域名 <strong>${domain}</strong> DNS 验证已超时，请改用<strong>文件验证</strong>方式。</p>
      <h3 style="color:#374151;">文件验证步骤</h3>
      <ol style="color:#374151;font-size:14px;line-height:1.8;">
        <li>在域名根目录创建文件：<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/.well-known/next-whois-verify.txt</code></li>
        <li>文件内容（一行）：<br>
          <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto;">${fileContent}</pre>
        </li>
        <li>完成后返回验证页面重新验证。</li>
      </ol>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          返回验证页面
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Next Whois · 如不需要此邮件请忽略</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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
  const appBase = (appUrl && String(appUrl).startsWith("http")) ? appUrl : (process.env.NEXT_PUBLIC_APP_URL || "https://x.rw");
  const verifyUrl = `${appBase}/stamp?domain=${encodeURIComponent(domain)}`;

  await sendEmail({
    to: email,
    subject: `⚠️ DNS 验证超时 · ${domain} — 请改用文件验证`,
    html: buildEmailHtml({ domain, fileContent, verifyUrl }),
  });

  return res.status(200).json({ sent: true, to: email });
}
