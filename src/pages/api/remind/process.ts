import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { sendEmail, reminderHtml, phaseEventHtml } from "@/lib/email";
import {
  computeLifecycle,
  fmtDate,
  GRACE_KEY,
  REDEMPTION_KEY,
  PENDING_KEY,
} from "@/lib/lifecycle";

const THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "Database unavailable" });

    const { data: remindersRaw } = await supabase
      .from("reminders")
      .select("id, domain, email, expiration_date, cancel_token")
      .eq("active", true)
      .not("expiration_date", "is", null);

    const reminderIds = (remindersRaw ?? []).map((r) => r.id);
    const { data: logsRaw } = reminderIds.length > 0
      ? await supabase.from("reminder_logs").select("reminder_id, days_before").in("reminder_id", reminderIds)
      : { data: [] };

    const logsByReminder: Record<string, number[]> = {};
    for (const log of logsRaw ?? []) {
      if (!logsByReminder[log.reminder_id]) logsByReminder[log.reminder_id] = [];
      logsByReminder[log.reminder_id].push(log.days_before);
    }

    const reminders = (remindersRaw ?? []).map((r) => ({
      ...r,
      sent_keys: logsByReminder[r.id] ?? [],
    }));

    const results = { sent: 0, expired: 0, skipped: 0 };

    for (const reminder of reminders) {
      try {
        const lc = computeLifecycle(reminder.domain, reminder.expiration_date);
        if (!lc) { results.skipped++; continue; }

        const now = new Date();
        const { phase, expiry, graceEnd, redemptionEnd, dropDate, cfg } = lc;
        const msPerDay = 86_400_000;
        const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
        const sentKeys: number[] = reminder.sent_keys;

        // ── Auto-deactivate when domain is fully past any recovery window ───
        const totalPostExpiry = cfg.grace + cfg.redemption + cfg.pendingDelete;
        const pastRecovery = (now.getTime() - expiry.getTime()) / msPerDay > (totalPostExpiry + 30);
        if (pastRecovery || phase === "dropped") {
          await supabase.from("reminders").update({
            active: false,
            cancelled_at: now.toISOString(),
            cancel_reason: "domain_dropped_or_expired",
          }).eq("id", reminder.id);
          results.expired++;
          continue;
        }

        let didSend = false;

        // ── Phase-event reminders ─────────────────────────────────────────
        // Grace entered — only if this TLD has a grace period
        if (phase === "grace" && cfg.grace > 0 && !sentKeys.includes(GRACE_KEY)) {
          const logId = randomBytes(8).toString("hex");
          await sendEmail({
            to: reminder.email,
            subject: `⏰ ${reminder.domain} 已进入宽限期，请尽快续费`,
            html: phaseEventHtml({
              domain: reminder.domain,
              phase: "grace",
              expirationDate: reminder.expiration_date,
              graceEnd: fmtDate(graceEnd),
              cancelToken: reminder.cancel_token,
            }),
          });
          await supabase.from("reminder_logs").upsert(
            { id: logId, reminder_id: reminder.id, days_before: GRACE_KEY },
            { onConflict: "reminder_id,days_before", ignoreDuplicates: true }
          );
          results.sent++;
          didSend = true;
        }

        // Redemption entered — only if this TLD has a redemption period
        if (!didSend && phase === "redemption" && cfg.redemption > 0 && !sentKeys.includes(REDEMPTION_KEY)) {
          const logId = randomBytes(8).toString("hex");
          await sendEmail({
            to: reminder.email,
            subject: `🚨 ${reminder.domain} 已进入赎回期，赎回费用较高`,
            html: phaseEventHtml({
              domain: reminder.domain,
              phase: "redemption",
              expirationDate: reminder.expiration_date,
              redemptionEnd: fmtDate(redemptionEnd),
              dropDate: fmtDate(dropDate),
              cancelToken: reminder.cancel_token,
            }),
          });
          await supabase.from("reminder_logs").upsert(
            { id: logId, reminder_id: reminder.id, days_before: REDEMPTION_KEY },
            { onConflict: "reminder_id,days_before", ignoreDuplicates: true }
          );
          results.sent++;
          didSend = true;
        }

        // Pending delete entered — only if this TLD has a pendingDelete period
        if (!didSend && phase === "pendingDelete" && cfg.pendingDelete > 0 && !sentKeys.includes(PENDING_KEY)) {
          const logId = randomBytes(8).toString("hex");
          await sendEmail({
            to: reminder.email,
            subject: `❌ ${reminder.domain} 即将被删除，域名进入待删除期`,
            html: phaseEventHtml({
              domain: reminder.domain,
              phase: "pendingDelete",
              expirationDate: reminder.expiration_date,
              dropDate: fmtDate(dropDate),
              cancelToken: reminder.cancel_token,
            }),
          });
          await supabase.from("reminder_logs").upsert(
            { id: logId, reminder_id: reminder.id, days_before: PENDING_KEY },
            { onConflict: "reminder_id,days_before", ignoreDuplicates: true }
          );
          results.sent++;
          didSend = true;
        }

        // ── Pre-expiry day reminders (only while domain is still active) ──
        if (!didSend && phase === "active") {
          for (const threshold of THRESHOLDS) {
            if (daysToExpiry <= threshold && !sentKeys.includes(threshold)) {
              const logId = randomBytes(8).toString("hex");
              const urgencyLabel =
                daysToExpiry <= 1 ? "🔴 紧急" :
                daysToExpiry <= 5 ? "🔴 紧急" :
                daysToExpiry <= 10 ? "🟠 临近" : "📅";

              await sendEmail({
                to: reminder.email,
                subject: `${urgencyLabel} ${reminder.domain} 将在 ${daysToExpiry} 天后到期`,
                html: reminderHtml({
                  domain: reminder.domain,
                  expirationDate: reminder.expiration_date,
                  daysLeft: daysToExpiry,
                  cancelToken: reminder.cancel_token,
                }),
              });
              await supabase.from("reminder_logs").upsert(
                { id: logId, reminder_id: reminder.id, days_before: threshold },
                { onConflict: "reminder_id,days_before", ignoreDuplicates: true }
              );
              results.sent++;
              break;
            }
          }
        }

        // ── Auto-deactivate if all pre-expiry thresholds sent and expired ─
        const allPreExpirySent = THRESHOLDS.every((t) => sentKeys.includes(t));
        if (allPreExpirySent && phase !== "active") {
          // All day reminders sent and domain is past expiry — keep active for
          // phase events; deactivate only after dropped phase check above.
        }
      } catch (reminderErr: any) {
        console.error("[remind/process] Error processing reminder", reminder.id, reminderErr.message);
        results.skipped++;
      }
    }

    return res.status(200).json({ ok: true, processed: reminders.length, ...results });
  } catch (err: any) {
    console.error("[remind/process] Fatal error:", err);
    return res.status(500).json({ error: "处理失败，请稍后重试" });
  }
}
