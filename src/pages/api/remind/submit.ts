import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

const REMINDER_THRESHOLDS = [60, 30, 10, 5, 1];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = checkRateLimit(ip, 5);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请稍后再试" });

  const { domain, email, expirationDate } = req.body;
  if (!domain || !email) return res.status(400).json({ error: "Missing required fields" });

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
      }).eq("id", reminderId);
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
      });
    }
  } catch (dbErr: any) {
    console.error("[remind/submit] DB error:", dbErr);
    return res.status(500).json({ error: "数据库写入失败，请稍后重试" });
  }

  await sendEmail({
    to: cleanEmail,
    subject: `✅ 域名订阅已设置 · ${cleanDomain}`,
    html: confirmationHtml({ domain: cleanDomain, expirationDate: expDate, cancelToken: cancelTok, thresholds: REMINDER_THRESHOLDS }),
  });

  return res.status(200).json({ id: reminderId, thresholds: REMINDER_THRESHOLDS });
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  const from = process.env.RESEND_FROM_EMAIL || "noreply@nextwhois.app";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("[sendEmail] Resend error:", resp.status, body);
    }
  } catch (err: any) {
    console.error("[sendEmail] Fetch error:", err.message);
  }
}

export function confirmationHtml({
  domain, expirationDate, cancelToken, thresholds,
}: { domain: string; expirationDate: string | null; cancelToken: string; thresholds: number[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://nextwhois.app";
  const cancelUrl = `${baseUrl}/remind/cancel?token=${cancelToken}`;
  const expiryStr = expirationDate
    ? new Date(expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0ea5e9;margin-bottom:4px">域名订阅已设置</h2>
      <p style="color:#6b7280;font-size:14px;margin-top:0">Next Whois 到期提醒服务</p>
      <div style="background:#f0f9ff;border-radius:10px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:15px;font-weight:600;color:#0369a1">${domain}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#0369a1">📅 到期日期：${expiryStr}</p>
      </div>
      <p style="font-size:13px;color:#374151">我们将在以下时间节点向您发送提醒邮件：</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
        ${thresholds.map(d => `<span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">提前 ${d} 天</span>`).join("")}
      </div>
      <p style="font-size:12px;color:#6b7280;margin-top:20px">
        直到域名续费、进入赎回期或您取消订阅后自动停止。
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
      <p style="font-size:11px;color:#9ca3af">
        不想再收到此提醒？<a href="${cancelUrl}" style="color:#0ea5e9">一键取消订阅</a>
      </p>
    </div>
  `;
}
