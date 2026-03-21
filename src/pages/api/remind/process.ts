import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { sendEmail, reminderHtml } from "@/lib/email";

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
      sent_thresholds: logsByReminder[r.id] ?? [],
    }));

    const results = { sent: 0, expired: 0, skipped: 0 };

    for (const reminder of reminders) {
      try {
        const expiry = new Date(reminder.expiration_date);
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
        const sentThresholds: number[] = reminder.sent_thresholds;

        if (daysLeft < -45) {
          await supabase.from("reminders").update({
            active: false,
            cancelled_at: new Date().toISOString(),
            cancel_reason: "redemption_or_deleted",
          }).eq("id", reminder.id);
          results.expired++;
          continue;
        }

        for (const threshold of THRESHOLDS) {
          if (daysLeft <= threshold && !sentThresholds.includes(threshold)) {
            const logId = randomBytes(8).toString("hex");
            const urgencyLabel = daysLeft <= 0 ? "⚠️ 已到期" : daysLeft <= 5 ? "🔴 紧急" : daysLeft <= 10 ? "🟠 临近" : "📅";

            await sendEmail({
              to: reminder.email,
              subject: `${urgencyLabel} ${reminder.domain} 将在 ${daysLeft <= 0 ? "今天" : `${daysLeft} 天后`}到期`,
              html: reminderHtml({
                domain: reminder.domain,
                expirationDate: reminder.expiration_date,
                daysLeft,
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

        const allSent = THRESHOLDS.every((t) => sentThresholds.includes(t));
        if (allSent && daysLeft <= 0) {
          await supabase.from("reminders").update({
            active: false,
            cancelled_at: new Date().toISOString(),
            cancel_reason: "all_reminders_sent_and_expired",
          }).eq("id", reminder.id);
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
