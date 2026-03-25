/**
 * GET /api/user/dashboard
 * Combined endpoint: subscriptions + stamps in one round-trip.
 *
 * Optimizations vs. two separate endpoints:
 *  • Single serverless function cold-start
 *  • Single session validation
 *  • reminders + stamps + lifecycle_overrides all fetched in parallel
 *  • Then reminder_logs fetched once (depends on reminder IDs)
 *  • Cache-Control: private so browser serves stale instantly & refreshes behind the scenes
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { many, one, isDbReady } from "@/lib/db-query";
import { computeLifecycle } from "@/lib/lifecycle";
import { loadLifecycleOverrides } from "@/lib/server/lifecycle-overrides";

const THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  const email = session.user.email;

  try {
    // ── Phase 1: four DB queries in parallel ─────────────────────────────────
    const [rows, stampsRows, overrides, userRow] = await Promise.all([
      many<{
        id: string; domain: string; expiration_date: string | null;
        active: boolean; cancel_token: string | null; created_at: string;
        days_before: number | null;
      }>(
        `SELECT id, domain, expiration_date, active, cancel_token, created_at, days_before
         FROM reminders WHERE email = $1 ORDER BY created_at DESC`,
        [email],
      ),
      many<{
        id: string; domain: string; tag_name: string; tag_style: string;
        link: string; description: string; nickname: string;
        verified: boolean; verified_at: string | null; created_at: string;
      }>(
        `SELECT id, domain, tag_name, tag_style, link, description, nickname,
                verified, verified_at, created_at
         FROM stamps WHERE email = $1 ORDER BY created_at DESC`,
        [email],
      ),
      loadLifecycleOverrides(),
      // DB-authoritative access flag — heals stale JWTs without re-login
      one<{ subscription_access: boolean; subscription_expires_at: string | null }>(
        "SELECT subscription_access, subscription_expires_at FROM users WHERE email = $1",
        [email],
      ),
    ]);

    // ── Phase 2: fetch reminder_logs (depends on reminder IDs) ──────────────
    const ids = rows.map(r => r.id);
    const logs = ids.length > 0
      ? await many<{ reminder_id: string; days_before: number; sent_at: string }>(
          `SELECT reminder_id, days_before, sent_at FROM reminder_logs
           WHERE reminder_id = ANY($1::varchar[])`,
          [ids],
        )
      : [];

    // ── Phase 3: pure JS processing ─────────────────────────────────────────
    const logsByReminder: Record<string, { days_before: number; sent_at: string }[]> = {};
    for (const log of logs) {
      if (!logsByReminder[log.reminder_id]) logsByReminder[log.reminder_id] = [];
      logsByReminder[log.reminder_id].push(log);
    }

    const nowMs = Date.now();
    const subscriptions = rows.map((r) => {
      const lc = r.expiration_date
        ? computeLifecycle(r.domain, r.expiration_date, undefined, overrides)
        : null;

      const reminderLogs = logsByReminder[r.id] ?? [];
      const sentKeys = reminderLogs.map(l => l.days_before);
      const lastLog = reminderLogs.length > 0
        ? reminderLogs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
        : null;

      const daysToExpiry = lc?.daysToExpiry ?? null;
      let nextReminderAt: string | null = null;
      let nextReminderDays: number | null = null;
      if (r.expiration_date && daysToExpiry !== null && daysToExpiry > 0) {
        for (const t of THRESHOLDS) {
          if (daysToExpiry > t && !sentKeys.includes(t)) {
            const d = new Date(r.expiration_date);
            d.setDate(d.getDate() - t);
            nextReminderAt = d.toISOString();
            nextReminderDays = t;
            break;
          }
        }
      }

      return {
        ...r,
        drop_date: lc ? lc.dropDate.toISOString() : null,
        grace_end: lc ? lc.graceEnd.toISOString() : null,
        redemption_end: lc ? lc.redemptionEnd.toISOString() : null,
        phase: lc?.phase ?? null,
        days_to_expiry: lc?.daysToExpiry ?? null,
        days_to_drop: lc ? Math.ceil((lc.dropDate.getTime() - nowMs) / 86_400_000) : null,
        tld_confidence: lc?.cfg.confidence ?? null,
        sent_keys: sentKeys,
        last_reminded_at: lastLog?.sent_at ?? null,
        next_reminder_at: nextReminderAt,
        next_reminder_days: nextReminderDays,
      };
    });

    // DB-authoritative access flag — always trust DB over stale JWT
    const subscriptionAccess = userRow?.subscription_access ?? false;
    const subscriptionExpiresAt = userRow?.subscription_expires_at ?? null;

    // User-specific; allow browser to serve stale while quietly revalidating
    res.setHeader("Cache-Control", "private, max-age=0, stale-while-revalidate=60");
    return res.status(200).json({ subscriptions, stamps: stampsRows, subscriptionAccess, subscriptionExpiresAt });
  } catch (err: any) {
    console.error("[dashboard] GET error:", err.message);
    return res.status(500).json({ error: "获取数据失败" });
  }
}
