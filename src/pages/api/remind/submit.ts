import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, subscriptionConfirmHtml } from "@/lib/email";
import { computeLifecycle, fmtDate } from "@/lib/lifecycle";
import { one, run, isDbReady } from "@/lib/db-query";

const REMINDER_THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = checkRateLimit(ip, 5);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请稍后再试" });

  const { domain, email, expirationDate, phaseAlerts } = req.body;
  if (!domain || !email) return res.status(400).json({ error: "Missing required fields" });

  const flags = {
    grace:         phaseAlerts?.grace         !== false,
    redemption:    phaseAlerts?.redemption    !== false,
    pendingDelete: phaseAlerts?.pendingDelete !== false,
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "邮箱格式不正确" });

  if (!(await isDbReady())) return res.status(500).json({ error: "Database unavailable" });

  const cleanDomain  = String(domain).toLowerCase().trim();
  const cleanEmail   = String(email).trim();
  const expDate      = expirationDate ? String(expirationDate) : null;
  const cancelToken  = randomBytes(20).toString("hex");
  const id           = randomBytes(8).toString("hex");

  let reminderId: string;
  let cancelTok: string;

  try {
    const existing = await one<{ id: string; cancel_token: string; active: boolean }>(
      "SELECT id, cancel_token, active FROM reminders WHERE domain = $1 AND email = $2",
      [cleanDomain, cleanEmail],
    );

    if (existing) {
      reminderId = existing.id;
      cancelTok  = existing.cancel_token || cancelToken;
      await run(
        `UPDATE reminders
         SET expiration_date = $1, active = true, cancelled_at = NULL,
             cancel_reason = NULL, cancel_token = $2, phase_flags = $3
         WHERE id = $4`,
        [expDate, cancelTok, JSON.stringify(flags), reminderId],
      );
      await run("DELETE FROM reminder_logs WHERE reminder_id = $1", [reminderId]);
    } else {
      reminderId = id;
      cancelTok  = cancelToken;
      await run(
        `INSERT INTO reminders (id, domain, email, expiration_date, active, cancel_token, phase_flags)
         VALUES ($1, $2, $3, $4, true, $5, $6)`,
        [reminderId, cleanDomain, cleanEmail, expDate, cancelTok, JSON.stringify(flags)],
      );
    }
  } catch (dbErr: any) {
    console.error("[remind/submit] DB error:", dbErr);
    return res.status(500).json({ error: "数据库写入失败，请稍后重试" });
  }

  const lc = computeLifecycle(cleanDomain, expDate);
  const lifecycleInfo = lc ? {
    phase:           lc.phase,
    graceEnd:        fmtDate(lc.graceEnd),
    redemptionEnd:   fmtDate(lc.redemptionEnd),
    dropDate:        fmtDate(lc.dropDate),
    hasGrace:        lc.cfg.grace > 0,
    hasRedemption:   lc.cfg.redemption > 0,
    hasPendingDelete: lc.cfg.pendingDelete > 0,
    registry:        lc.cfg.registry,
  } : undefined;

  await sendEmail({
    to: cleanEmail,
    subject: `✅ 域名订阅已设置 · ${cleanDomain}`,
    html: subscriptionConfirmHtml({
      domain: cleanDomain,
      expirationDate: expDate,
      cancelToken: cancelTok,
      thresholds: REMINDER_THRESHOLDS,
      lifecycle: lifecycleInfo,
    }),
  });

  return res.status(200).json({ id: reminderId, thresholds: REMINDER_THRESHOLDS });
}

export { sendEmail };
