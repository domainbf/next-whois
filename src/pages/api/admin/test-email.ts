import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, adminNotifyHtml, getSiteLabel } from "@/lib/email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await requireAdmin(req, res);
  if (!session) return;

  const to = session.user?.email;
  if (!to) return res.status(400).json({ error: "No admin email found" });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(503).json({ error: "RESEND_API_KEY 未配置" });

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@x.rw";
  const siteName = await getSiteLabel().catch(() => "X.RW");

  try {
    await sendEmail({
      to,
      subject: `✅ ${siteName} 邮件测试`,
      html: adminNotifyHtml({
        subject: "邮件系统工作正常",
        body: `您好，这是来自 ${siteName} 管理后台的测试邮件。<br><br>
          <strong>发件人：</strong><code>${fromEmail}</code><br>
          <strong>收件人：</strong><code>${to}</code><br>
          <strong>发送时间：</strong>${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}<br><br>
          Resend API 配置正常，所有邮件功能（欢迎邮件、密码重置、域名到期提醒）均已就绪。`,
        siteName,
      }),
    });
    return res.status(200).json({ ok: true, to });
  } catch (err: any) {
    console.error("[admin/test-email] error:", err.message);
    return res.status(500).json({ error: err.message || "发送失败" });
  }
}
