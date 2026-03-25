import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import {
  sendEmail, reminderHtml, phaseEventHtml,
  dropApproachingHtml, domainDroppedHtml, getSiteLabel,
} from "@/lib/email";
import {
  computeLifecycle,
  fmtDate,
  GRACE_KEY,
  REDEMPTION_KEY,
  PENDING_KEY,
} from "@/lib/lifecycle";
import { many, run, isDbReady } from "@/lib/db-query";
import { loadLifecycleOverrides } from "@/lib/server/lifecycle-overrides";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { isAdmin } from "@/lib/admin";

const DEFAULT_THRESHOLDS = [60, 30, 10, 5, 1];
const DROP_SOON_KEY = -4;   // 7 days before drop date
const DROPPED_KEY   = -5;   // domain just became available

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  // Auth: accept CRON_SECRET (from Vercel cron) OR an admin session (from the dashboard UI)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    const legacyHeader = req.headers["x-cron-secret"] as string | undefined;
    const querySecret = req.query.secret as string | undefined;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const provided = bearerToken || legacyHeader || querySecret;
    if (provided !== cronSecret) {
      // Fall back to admin session auth
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
  }

  if (!(await isDbReady())) return res.status(500).json({ error: "Database unavailable" });

  const siteName = await getSiteLabel().catch(() => "X.RW");

  try {
    // Load admin-configured TLD lifecycle overrides once for the whole batch
    const overrides = await loadLifecycleOverrides();

    const remindersRaw = await many<{
      id: string; domain: string; email: string;
      expiration_date: string | null; cancel_token: string; phase_flags: string | null; thresholds_json: string | null;
    }>(
      `SELECT id, domain, email, expiration_date, cancel_token, phase_flags, thresholds_json
       FROM reminders WHERE active = true AND expiration_date IS NOT NULL`,
    );

    const reminderIds = remindersRaw.map((r) => r.id);
    const logsRaw = reminderIds.length > 0
      ? await many<{ reminder_id: string; days_before: number }>(
          `SELECT reminder_id, days_before FROM reminder_logs WHERE reminder_id = ANY($1::varchar[])`,
          [reminderIds],
        )
      : [];

    const logsByReminder: Record<string, number[]> = {};
    for (const log of logsRaw) {
      if (!logsByReminder[log.reminder_id]) logsByReminder[log.reminder_id] = [];
      logsByReminder[log.reminder_id].push(log.days_before);
    }

    const reminders = remindersRaw.map((r) => ({
      ...r,
      sent_keys: logsByReminder[r.id] ?? [],
    }));

    const results = { sent: 0, expired: 0, skipped: 0 };

    for (const reminder of reminders) {
      try {
        const lc = computeLifecycle(reminder.domain, reminder.expiration_date, undefined, overrides);
        if (!lc) { results.skipped++; continue; }

        const now = new Date();
        const { phase, expiry, graceEnd, redemptionEnd, dropDate, cfg } = lc;
        const msPerDay = 86_400_000;
        const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
        const daysToDropDate = Math.ceil((dropDate.getTime() - now.getTime()) / msPerDay);
        const sentKeys: number[] = reminder.sent_keys;

        // Parse phase flags and thresholds early (needed by all branches below)
        let phaseFlags = { grace: true, redemption: true, pendingDelete: true, dropSoon: true, dropped: true };
        try {
          if (reminder.phase_flags) phaseFlags = { ...phaseFlags, ...JSON.parse(reminder.phase_flags) };
        } catch { /* keep defaults */ }

        let thresholds = DEFAULT_THRESHOLDS;
        try {
          if (reminder.thresholds_json) {
            const parsed = JSON.parse(reminder.thresholds_json);
            if (Array.isArray(parsed) && parsed.length > 0) thresholds = parsed;
          }
        } catch { /* keep defaults */ }

        const upsertLog = async (daysKey: number) => {
          const logId = randomBytes(8).toString("hex");
          await run(
            `INSERT INTO reminder_logs (id, reminder_id, days_before)
             VALUES ($1, $2, $3)
             ON CONFLICT (reminder_id, days_before) DO NOTHING`,
            [logId, reminder.id, daysKey],
          );
        };

        // ── Domain dropped: send notification then deactivate ─────────────────
        if (phase === "dropped") {
          if (phaseFlags.dropped && !sentKeys.includes(DROPPED_KEY)) {
            await sendEmail({
              to: reminder.email,
              subject: `✅ ${reminder.domain} 已释放，现在可以注册了`,
              html: domainDroppedHtml({
                domain: reminder.domain,
                expirationDate: reminder.expiration_date,
                cancelToken: reminder.cancel_token,
                siteName,
              }),
            });
            await upsertLog(DROPPED_KEY);
            results.sent++;
          }
          // Deactivate after notifying
          await run(
            `UPDATE reminders
             SET active = false, cancelled_at = $1, cancel_reason = 'domain_dropped_or_expired'
             WHERE id = $2`,
            [now.toISOString(), reminder.id],
          );
          results.expired++;
          continue;
        }

        // ── Past full recovery window (safety fallback) ───────────────────────
        const totalPostExpiry = cfg.grace + cfg.redemption + cfg.pendingDelete;
        const pastRecovery = (now.getTime() - expiry.getTime()) / msPerDay > (totalPostExpiry + 30);
        if (pastRecovery) {
          await run(
            `UPDATE reminders
             SET active = false, cancelled_at = $1, cancel_reason = 'domain_dropped_or_expired'
             WHERE id = $2`,
            [now.toISOString(), reminder.id],
          );
          results.expired++;
          continue;
        }

        let didSend = false;

        // ── Grace phase notification ──────────────────────────────────────────
        if (phaseFlags.grace && phase === "grace" && cfg.grace > 0 && !sentKeys.includes(GRACE_KEY)) {
          await sendEmail({
            to: reminder.email,
            subject: `⏰ ${reminder.domain} 已进入宽限期，请尽快续费`,
            html: phaseEventHtml({
              domain: reminder.domain,
              phase: "grace",
              expirationDate: reminder.expiration_date,
              graceEnd: fmtDate(graceEnd),
              cancelToken: reminder.cancel_token,
              siteName,
            }),
          });
          await upsertLog(GRACE_KEY);
          results.sent++;
          didSend = true;
        }

        // ── Redemption phase notification ─────────────────────────────────────
        if (!didSend && phaseFlags.redemption && phase === "redemption" && cfg.redemption > 0 && !sentKeys.includes(REDEMPTION_KEY)) {
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
              siteName,
            }),
          });
          await upsertLog(REDEMPTION_KEY);
          results.sent++;
          didSend = true;
        }

        // ── Pending-delete phase notification ─────────────────────────────────
        if (!didSend && phaseFlags.pendingDelete && phase === "pendingDelete" && cfg.pendingDelete > 0 && !sentKeys.includes(PENDING_KEY)) {
          await sendEmail({
            to: reminder.email,
            subject: `❌ ${reminder.domain} 即将被删除，域名进入待删除期`,
            html: phaseEventHtml({
              domain: reminder.domain,
              phase: "pendingDelete",
              expirationDate: reminder.expiration_date,
              dropDate: fmtDate(dropDate),
              cancelToken: reminder.cancel_token,
              siteName,
            }),
          });
          await upsertLog(PENDING_KEY);
          results.sent++;
          didSend = true;
        }

        // ── Drop approaching: 7 days before drop date ─────────────────────────
        if (!didSend && phaseFlags.dropSoon && phase === "pendingDelete" && daysToDropDate <= 7 && !sentKeys.includes(DROP_SOON_KEY)) {
          await sendEmail({
            to: reminder.email,
            subject: `⚡ ${reminder.domain} 将在 ${daysToDropDate} 天后可抢注`,
            html: dropApproachingHtml({
              domain: reminder.domain,
              expirationDate: reminder.expiration_date,
              dropDate: fmtDate(dropDate),
              daysToDropDate,
              cancelToken: reminder.cancel_token,
              siteName,
            }),
          });
          await upsertLog(DROP_SOON_KEY);
          results.sent++;
          didSend = true;
        }

        // ── Active phase: days-to-expiry thresholds ───────────────────────────
        if (!didSend && phase === "active") {
          for (const threshold of thresholds) {
            if (daysToExpiry <= threshold && !sentKeys.includes(threshold)) {
              const urgencyLabel =
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
                  siteName,
                }),
              });
              await upsertLog(threshold);
              results.sent++;
              break;
            }
          }
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
