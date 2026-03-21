import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { sendEmail } from "@/pages/api/remind/submit";

export const config = { maxDuration: 15 };

function buildEmailHtml({
  domain,
  fileContent,
  verifyUrl,
}: {
  domain: string;
  fileContent: string;
  verifyUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>域名验证提示</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">⚠️ DNS 验证未成功</p>
          <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${domain}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
            我们已在 <strong>约 53 分钟</strong>内自动检测 <strong>7 次</strong>，仍未检测到你的 DNS TXT 记录。
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
            这通常是因为你的域名后缀（TLD）不支持标准 DNS TXT 查询，或 DNS 传播延迟超出预期。<br/>
            你可以改用 <strong>文件验证</strong>——无需等待 DNS 传播，几秒内即可完成。
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">步骤 1 — 创建文件</p>
              <p style="margin:0 0 8px;font-size:13px;color:#333;">在你的网站根目录创建以下文件：</p>
              <p style="margin:0;padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:12px;color:#7c3aed;word-break:break-all;">/.well-known/next-whois-verify.txt</p>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">步骤 2 — 文件内容</p>
              <p style="margin:0 0 8px;font-size:13px;color:#333;">将以下内容写入文件（仅此一行即可）：</p>
              <p style="margin:0;padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:12px;color:#059669;word-break:break-all;">${fileContent}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">步骤 3 — 确认可访问</p>
              <p style="margin:0 0 8px;font-size:13px;color:#333;">确保以下 URL 可公开访问：</p>
              <p style="margin:0;padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:12px;color:#0284c7;word-break:break-all;">https://${domain}/.well-known/next-whois-verify.txt</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td align="center">
              <a href="${verifyUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;">
                回到验证页面 →
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#aaa;text-align:center;">点击按钮后切换到「文件验证（快速）」标签完成验证</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
            NiC.RW / X.RW · 域名品牌认领服务
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain, appUrl } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const { rows } = await db.query(
    `SELECT email, verify_token, verified FROM stamps WHERE id=$1 AND domain=$2`,
    [id, String(domain).toLowerCase().trim()]
  );
  if (!rows[0]) return res.status(404).json({ error: "Stamp not found" });
  if (rows[0].verified) return res.status(200).json({ skipped: true, reason: "already_verified" });

  const { email, verify_token } = rows[0];
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
