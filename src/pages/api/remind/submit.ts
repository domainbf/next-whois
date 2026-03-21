import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, subscriptionConfirmHtml } from "@/lib/email";

const REMINDER_THRESHOLDS = [60, 30, 10, 5, 1];

const LIFECYCLE_CFG: Record<string, { grace: number; redemption: number; pendingDelete: number }> = {
  com: { grace: 45, redemption: 30, pendingDelete: 5 },
  net: { grace: 45, redemption: 30, pendingDelete: 5 },
  org: { grace: 45, redemption: 30, pendingDelete: 5 },
  info: { grace: 45, redemption: 30, pendingDelete: 5 },
  biz: { grace: 45, redemption: 30, pendingDelete: 5 },
  io:  { grace: 30, redemption: 30, pendingDelete: 5 },
  co:  { grace: 45, redemption: 30, pendingDelete: 5 },
  app: { grace: 45, redemption: 30, pendingDelete: 5 },
  dev: { grace: 45, redemption: 30, pendingDelete: 5 },
  ai:  { grace: 30, redemption: 30, pendingDelete: 5 },
};

function getLifecycleInfo(domain: string, expirationDate: string | null) {
  if (!expirationDate) return undefined;
  const expiry = new Date(expirationDate);
  if (isNaN(expiry.getTime())) return undefined;
  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  const cfg = LIFECYCLE_CFG[tld] ?? { grace: 45, redemption: 30, pendingDelete: 5 };
  const ms = (d: number) => d * 86_400_000;
  const graceEnd = new Date(expiry.getTime() + ms(cfg.grace));
  const redemptionEnd = new Date(graceEnd.getTime() + ms(cfg.redemption));
  const dropDate = new Date(redemptionEnd.getTime() + ms(cfg.pendingDelete));
  const now = new Date();
  let phase: string;
  if (now < expiry) phase = "active";
  else if (now < graceEnd) phase = "grace";
  else if (now < redemptionEnd) phase = "redemption";
  else if (now < dropDate) phase = "pendingDelete";
  else phase = "dropped";
  const fmt = (d: Date) => d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  return { phase, graceEnd: fmt(graceEnd), redemptionEnd: fmt(redemptionEnd), dropDate: fmt(dropDate) };
}

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

  const lifecycle = getLifecycleInfo(cleanDomain, expDate);

  await sendEmail({
    to: cleanEmail,
    subject: `✅ 域名订阅已设置 · ${cleanDomain}`,
    html: subscriptionConfirmHtml({
      domain: cleanDomain,
      expirationDate: expDate,
      cancelToken: cancelTok,
      thresholds: REMINDER_THRESHOLDS,
      lifecycle,
    }),
  });

  return res.status(200).json({ id: reminderId, thresholds: REMINDER_THRESHOLDS });
}

// Re-export sendEmail so remind/process.ts can still import it from here
export { sendEmail };
