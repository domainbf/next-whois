import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendEmail, confirmationHtml } from "./submit";

const THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = await getDbReady();
  if (!db) return res.status(500).json({ error: "Database unavailable" });

  try {
    const { rows: reminders } = await db.query(`
      SELECT r.id, r.domain, r.email, r.expiration_date, r.cancel_token,
             COALESCE(json_agg(rl.days_before) FILTER (WHERE rl.days_before IS NOT NULL), '[]') AS sent_thresholds
      FROM reminders r
      LEFT JOIN reminder_logs rl ON rl.reminder_id = r.id
      WHERE r.active = true AND r.expiration_date IS NOT NULL
      GROUP BY r.id
    `);

    const results = { sent: 0, expired: 0, skipped: 0 };

    for (const reminder of reminders) {
      try {
        const expiry = new Date(reminder.expiration_date);
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
        const sentThresholds: number[] = Array.isArray(reminder.sent_thresholds) ? reminder.sent_thresholds : [];

        if (daysLeft < -45) {
          await db.query(
            `UPDATE reminders SET active=false, cancelled_at=NOW(), cancel_reason='redemption_or_deleted' WHERE id=$1`,
            [reminder.id]
          );
          results.expired++;
          continue;
        }

        for (const threshold of THRESHOLDS) {
          if (daysLeft <= threshold && !sentThresholds.includes(threshold)) {
            const logId = randomBytes(8).toString("hex");
            const expiryStr = expiry.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
            const urgencyLabel = daysLeft <= 0 ? "⚠️ 已到期" : daysLeft <= 5 ? "🔴 紧急" : daysLeft <= 10 ? "🟠 临近" : "📅";

            await sendEmail({
              to: reminder.email,
              subject: `${urgencyLabel} ${reminder.domain} 将在 ${daysLeft <= 0 ? "今天" : `${daysLeft} 天后`}到期`,
              html: reminderHtml({
                domain: reminder.domain,
                daysLeft,
                expiryStr,
                threshold,
                cancelToken: reminder.cancel_token,
              }),
            });

            await db.query(
              `INSERT INTO reminder_logs (id, reminder_id, days_before) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
              [logId, reminder.id, threshold]
            );

            results.sent++;
            break;
          }
        }

        const allSent = THRESHOLDS.every((t) => sentThresholds.includes(t));
        if (allSent && daysLeft <= 0) {
          await db.query(
            `UPDATE reminders SET active=false, cancelled_at=NOW(), cancel_reason='all_reminders_sent_and_expired' WHERE id=$1`,
            [reminder.id]
          );
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

function reminderHtml({
  domain, daysLeft, expiryStr, threshold, cancelToken,
}: { domain: string; daysLeft: number; expiryStr: string; threshold: number; cancelToken: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://nextwhois.app";
  const cancelUrl = `${baseUrl}/remind/cancel?token=${cancelToken}`;
  const domainUrl = `${baseUrl}/${domain}`;
  const urgencyBg = daysLeft <= 5 ? "#fef2f2" : daysLeft <= 10 ? "#fff7ed" : "#f0f9ff";
  const urgencyColor = daysLeft <= 5 ? "#dc2626" : daysLeft <= 10 ? "#ea580c" : "#0369a1";
  const msg = daysLeft <= 0
    ? "您的域名已到期，请尽快续费以避免丢失！"
    : `您的域名将在 <strong>${daysLeft} 天后</strong>（${expiryStr}）到期，请及时续费。`;

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0ea5e9;margin-bottom:4px">域名到期提醒</h2>
      <p style="color:#6b7280;font-size:14px;margin-top:0">Next Whois 域名订阅服务</p>
      <div style="background:${urgencyBg};border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid ${urgencyColor}">
        <p style="margin:0;font-size:16px;font-weight:700;color:${urgencyColor}">${domain}</p>
        <p style="margin:8px 0 0;font-size:13px;color:${urgencyColor}">${msg}</p>
        <p style="margin:6px 0 0;font-size:12px;color:${urgencyColor}">📅 到期日期：${expiryStr}</p>
      </div>
      <a href="${domainUrl}" style="display:inline-block;background:#0ea5e9;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin-right:8px">
        查看域名详情
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:11px;color:#9ca3af">
        这是您在 Next Whois 订阅的第 <strong>${threshold}</strong> 天提醒。<br/>
        不想再收到提醒？<a href="${cancelUrl}" style="color:#0ea5e9">一键取消订阅</a>
      </p>
    </div>
  `;
}
