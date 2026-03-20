import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, ReminderRecord, RemindersDB } from "@/lib/data-store";
import { getDb } from "@/lib/db";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { domain, email, daysBefore, expirationDate } = req.body;
  if (!domain || !email || !expirationDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const cleanEmail = String(email).trim();
  const id = randomBytes(8).toString("hex");
  const days = Number(daysBefore) || 30;

  const db = getDb();
  if (db) {
    const { rows: existing } = await db.query(
      `SELECT id FROM reminders WHERE domain=$1 AND email=$2`,
      [cleanDomain, cleanEmail]
    );
    if (existing[0]) {
      await db.query(
        `UPDATE reminders SET days_before=$1, expiration_date=$2 WHERE id=$3`,
        [days, String(expirationDate), existing[0].id]
      );
      await sendConfirmationEmail(cleanEmail, cleanDomain, String(expirationDate), days);
      return res.status(200).json({ updated: true, id: existing[0].id });
    }
    await db.query(
      `INSERT INTO reminders (id, domain, email, days_before, expiration_date) VALUES ($1,$2,$3,$4,$5)`,
      [id, cleanDomain, cleanEmail, days, String(expirationDate)]
    );
    await sendConfirmationEmail(cleanEmail, cleanDomain, String(expirationDate), days);
    return res.status(200).json({ id });
  }

  const fileDb = readData<RemindersDB>("reminders.json", []);
  const existing = fileDb.find((r) => r.domain === cleanDomain && r.email === cleanEmail);
  if (existing) {
    existing.daysBefore = days;
    existing.expirationDate = String(expirationDate);
    writeData("reminders.json", fileDb);
    return res.status(200).json({ updated: true, id: existing.id });
  }
  const record: ReminderRecord = {
    id, domain: cleanDomain, email: cleanEmail,
    daysBefore: days, expirationDate: String(expirationDate),
    createdAt: new Date().toISOString(),
  };
  fileDb.push(record);
  writeData("reminders.json", fileDb);
  return res.status(200).json({ id });
}

async function sendConfirmationEmail(
  email: string, domain: string, expirationDate: string, daysBefore: number,
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@nextwhois.app";
  const expiryDate = new Date(expirationDate).toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
  });
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `✅ 域历提醒已设置 · ${domain}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#0ea5e9">域历提醒已设置</h2>
            <p>您已成功为 <strong>${domain}</strong> 设置到期提醒。</p>
            <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#0369a1">📅 到期日期：<strong>${expiryDate}</strong></p>
              <p style="margin:8px 0 0;color:#0369a1">⏰ 提前提醒：<strong>${daysBefore} 天</strong></p>
            </div>
            <p style="color:#6b7280;font-size:14px">我们将在到期前 ${daysBefore} 天向此邮箱发送提醒邮件，请注意查收。</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px">Next Whois · 域名信息查询工具</p>
          </div>
        `,
      }),
    });
  } catch {}
}
