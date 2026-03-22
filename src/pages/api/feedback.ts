import type { NextApiRequest, NextApiResponse } from "next";
import { sendEmail, feedbackHtml } from "@/lib/email";
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

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[反馈] ${cleanQuery} — ${issueLabels}`,
    html: feedbackHtml({
      query: cleanQuery,
      queryType: String(queryType || "domain"),
      issueLabels,
      description: cleanDescription || undefined,
      email: cleanEmail || undefined,
      ip,
      ts,
    }),
  });

  return res.status(200).json({ ok: true });
}
