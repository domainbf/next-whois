import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, subscriptionConfirmHtml } from "@/lib/email";
import { computeLifecycle, fmtDate } from "@/lib/lifecycle";

const REMINDER_THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = checkRateLimit(ip, 5);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请稍后再试" });

  const { domain, email, expirationDate, phaseAlerts } = req.body;
  if (!domain || !email) return res.status(400).json({ error: "Missing required fields" });

  // Normalise phase flags: default all to true if not provided
  const flags = {
    grace:         phaseAlerts?.grace         !== false,
    redemption:    phaseAlerts?.redemption    !== false,
    pendingDelete: phaseAlerts?.pendingDelete !== false,
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "邮箱格式不正确" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const cleanEmail = String(email).trim();
  const expDate = expirationDate ? String(expirationDate) : null;
  const cancelToken = randomBytes(20).toString("hex");
  const id = randomBytes(8).toString("hex");

  let reminderId: string;
  let cancelTok: string;

  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "Database unavailable" });

    const { data: existing } = await supabase
      .from("reminders")
      .select("id, cancel_token, active")
      .eq("domain", cleanDomain)
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      reminderId = existing.id;
      cancelTok = existing.cancel_token || cancelToken;
      await supabase.from("reminders").update({
        expiration_date: expDate,
        active: true,
        cancelled_at: null,
        cancel_reason: null,
        cancel_token: cancelTok,
        phase_flags: JSON.stringify(flags),
      }).eq("id", reminderId);
      // Clear existing logs so reminders restart fresh
      await supabase.from("reminder_logs").delete().eq("reminder_id", reminderId);
    } else {
      reminderId = id;
      cancelTok = cancelToken;
      await supabase.from("reminders").insert({
        id: reminderId,
        domain: cleanDomain,
        email: cleanEmail,
        expiration_date: expDate,
        active: true,
        cancel_token: cancelTok,
        phase_flags: JSON.stringify(flags),
      });
    }
  } catch (dbErr: any) {
    console.error("[remind/submit] DB error:", dbErr);
    return res.status(500).json({ error: "数据库写入失败，请稍后重试" });
  }

  // Compute lifecycle for confirmation email
  const lc = computeLifecycle(cleanDomain, expDate);
  const lifecycleInfo = lc ? {
    phase: lc.phase,
    graceEnd: fmtDate(lc.graceEnd),
    redemptionEnd: fmtDate(lc.redemptionEnd),
    dropDate: fmtDate(lc.dropDate),
    hasGrace: lc.cfg.grace > 0,
    hasRedemption: lc.cfg.redemption > 0,
    hasPendingDelete: lc.cfg.pendingDelete > 0,
    registry: lc.cfg.registry,
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
