import type { NextApiRequest, NextApiResponse } from "next";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

const ISSUE_LABELS: Record<string, string> = {
  inaccurate: "数据不准确",
  incomplete: "数据不完整",
  outdated:   "数据已过期",
  parse_error:"解析错误",
  other:      "其他",
};

const VALID_ISSUE_KEYS = new Set(Object.keys(ISSUE_LABELS));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // ── Rate limit: 3 submissions per IP per minute ──────────────────────────
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"
  ).split(",")[0].trim();

  const rl = checkRateLimit(ip, 3);
  if (!rl.ok) {
    return res.status(429).json({ error: "提交过于频繁，请稍后再试" });
  }

  const { query, queryType, issueTypes, description, email, _hp, _t } = req.body;

  // ── Honeypot: bots fill hidden fields, real users don't ──────────────────
  if (_hp && String(_hp).trim().length > 0) {
    // Silently accept to not reveal detection
    return res.status(200).json({ ok: true });
  }

  // ── Timing: reject if submitted in under 2 seconds (likely a bot) ────────
  const submittedAt = Number(_t) || 0;
  const elapsed = Date.now() - submittedAt;
  if (submittedAt > 0 && elapsed < 2000) {
    return res.status(200).json({ ok: true });
  }

  // ── Basic validation ─────────────────────────────────────────────────────
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "缺少查询目标" });
  }
  if (!Array.isArray(issueTypes) || issueTypes.length === 0) {
    return res.status(400).json({ error: "请选择问题类型" });
  }

  const validatedIssues = (issueTypes as string[]).filter((k) => VALID_ISSUE_KEYS.has(k));
  if (validatedIssues.length === 0) {
    return res.status(400).json({ error: "无效的问题类型" });
  }

  const cleanQuery       = String(query).trim().slice(0, 253);
  const cleanDescription = description ? String(description).trim().slice(0, 500) : "";
  const cleanEmail       = email ? String(email).trim().slice(0, 254) : "";
  const issueLabels      = validatedIssues.map((k) => ISSUE_LABELS[k]).join("、");
  const ts               = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const html = `
<div style="font-family:Inter,sans-serif;max-width:580px;margin:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
  <div style="background:#0ea5e9;padding:20px 24px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">用户反馈 · Next WHOIS</p>
    <p style="margin:4px 0 0;font-size:12px;color:#bae6fd">${ts}（北京时间）</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6">
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 0;color:#64748b;width:90px;font-weight:500">查询目标</td>
        <td style="padding:8px 0;font-weight:700;font-family:monospace;color:#0f172a">${cleanQuery}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 0;color:#64748b;font-weight:500">查询类型</td>
        <td style="padding:8px 0;color:#0f172a">${queryType || "domain"}</td>
      </tr>
      <tr style="${cleanDescription ? "border-bottom:1px solid #f1f5f9" : ""}">
        <td style="padding:8px 0;color:#64748b;font-weight:500">问题类型</td>
        <td style="padding:8px 0;color:#dc2626;font-weight:700">${issueLabels}</td>
      </tr>
      ${cleanDescription ? `
      <tr style="${cleanEmail ? "border-bottom:1px solid #f1f5f9" : ""}">
        <td style="padding:8px 0;color:#64748b;font-weight:500;vertical-align:top">补充说明</td>
        <td style="padding:8px 0;color:#0f172a;white-space:pre-wrap">${cleanDescription}</td>
      </tr>` : ""}
      ${cleanEmail ? `
      <tr>
        <td style="padding:8px 0;color:#64748b;font-weight:500">联系邮箱</td>
        <td style="padding:8px 0"><a href="mailto:${cleanEmail}" style="color:#0ea5e9">${cleanEmail}</a></td>
      </tr>` : ""}
    </table>
  </div>
  <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
    IP: ${ip} · 来源：Next WHOIS 反馈系统
  </div>
</div>`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[反馈] ${cleanQuery} — ${issueLabels}`,
    html,
  });

  return res.status(200).json({ ok: true });
}
