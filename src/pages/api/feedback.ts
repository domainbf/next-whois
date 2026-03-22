import type { NextApiRequest, NextApiResponse } from "next";
import { sendEmail } from "@/lib/email";

const ISSUE_LABELS: Record<string, string> = {
  inaccurate: "数据不准确",
  incomplete: "数据不完整",
  outdated: "数据已过期",
  parse_error: "解析错误",
  other: "其他",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { query, queryType, issueTypes, description, email } = req.body;

  if (!query || typeof query !== "string") return res.status(400).json({ error: "缺少查询目标" });
  if (!Array.isArray(issueTypes) || issueTypes.length === 0) return res.status(400).json({ error: "请选择问题类型" });

  const adminEmail = process.env.FEEDBACK_EMAIL || process.env.RESEND_FROM_EMAIL || "noreply@x.rw";
  const issueLabels = (issueTypes as string[]).map((k) => ISSUE_LABELS[k] ?? k).join("、");
  const ts = new Date().toISOString();

  const html = `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
  <div style="background:#0ea5e9;padding:20px 24px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">用户反馈 · Next WHOIS</p>
    <p style="margin:4px 0 0;font-size:13px;color:#bae6fd">${ts}</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:90px">查询目标</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${query}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">查询类型</td><td style="padding:6px 0">${queryType || "domain"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">问题类型</td><td style="padding:6px 0;color:#dc2626;font-weight:600">${issueLabels}</td></tr>
      ${description ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">补充说明</td><td style="padding:6px 0;white-space:pre-wrap">${description.slice(0, 500)}</td></tr>` : ""}
      ${email ? `<tr><td style="padding:6px 0;color:#64748b">联系邮箱</td><td style="padding:6px 0">${email}</td></tr>` : ""}
    </table>
  </div>
</div>`;

  await sendEmail({ to: adminEmail, subject: `[反馈] ${query} — ${issueLabels}`, html });

  return res.status(200).json({ ok: true });
}
