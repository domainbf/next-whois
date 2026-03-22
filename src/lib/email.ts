/**
 * Shared email helpers — send via Resend, consistent HTML template.
 */

const PRIMARY = "#0ea5e9";
const PRIMARY_DARK = "#0284c7";
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Next Whois</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:${FONT}">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo bar -->
        <tr>
          <td style="padding-bottom:24px;text-align:center">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#0f172a">NEXT&thinsp;<span style="color:${PRIMARY}">WHOIS</span></span>
          </td>
        </tr>

        <!-- Main card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 8px 0;text-align:center">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7">
              此邮件由 <a href="https://x.rw" style="color:${PRIMARY};text-decoration:none">Next Whois</a> 自动发送，请勿直接回复。<br/>
              © ${new Date().getFullYear()} X.RW · WHOIS Lookup Service
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Coloured pill tag */
function pill(text: string, bg = "#e0f2fe", color = "#0369a1") {
  return `<span style="display:inline-block;background:${bg};color:${color};padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;margin:3px 3px 3px 0">${text}</span>`;
}

/** Section inside the card */
function section(html: string) {
  return `<div style="padding:28px 32px">${html}</div>`;
}

function divider() {
  return `<div style="height:1px;background:#f1f5f9;margin:0 32px"></div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Welcome email (sent on registration)
// ──────────────────────────────────────────────────────────────────────────────
export function welcomeHtml({ name, email }: { name?: string | null; email: string }): string {
  const greeting = name ? `你好，${name}！` : "你好！";
  return emailLayout(`
    <!-- Header gradient band -->
    <div style="background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);padding:32px 32px 28px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase">欢迎加入</p>
      <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px">${greeting}</h1>
    </div>

    ${section(`
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.75">
        您的 Next Whois 账户已成功创建，现在可以使用所有功能：
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px">
        ${[
          ["🔍", "无限 WHOIS / RDAP 查询", "域名、IP、ASN、CIDR 全支持"],
          ["🔔", "域名到期订阅提醒", "多节点自动推送到您的邮箱"],
          ["🛡️", "品牌认领", "为您拥有的域名设置认证标签"],
          ["📊", "搜索历史", "随时回顾您的查询记录"],
        ].map(([icon, title, desc]) => `
          <tr>
            <td style="width:36px;padding:8px 12px 8px 0;vertical-align:top;font-size:18px">${icon}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">
              <p style="margin:0;font-size:13px;font-weight:600;color:#1e293b">${title}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">${desc}</p>
            </td>
          </tr>
        `).join("")}
      </table>
      <p style="margin:0;font-size:12px;color:#94a3b8">登录邮箱：<strong style="color:#334155;font-family:monospace">${email}</strong></p>
    `)}

    ${divider()}

    <div style="padding:20px 32px">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw"}"
        style="display:inline-block;background:${PRIMARY};color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.2px">
        开始查询 →
      </a>
    </div>
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Subscription confirmation email
// ──────────────────────────────────────────────────────────────────────────────
export interface SubscriptionEmailParams {
  domain: string;
  expirationDate: string | null;
  cancelToken: string;
  thresholds: number[];
  lifecycle?: {
    phase: string;
    graceEnd: string;
    redemptionEnd: string;
    dropDate: string;
    hasGrace?: boolean;
    hasRedemption?: boolean;
    hasPendingDelete?: boolean;
    registry?: string;
  };
}

export function subscriptionConfirmHtml(p: SubscriptionEmailParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw";
  const cancelUrl = `${baseUrl}/remind/cancel?token=${p.cancelToken}`;

  const expiryStr = p.expirationDate
    ? new Date(p.expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";

  const phaseInfo: Record<string, { label: string; color: string; bg: string; advice: string }> = {
    active:      { label: "有效期内", color: "#059669", bg: "#ecfdf5", advice: "域名状态正常，请留意到期提醒。" },
    grace:       { label: "宽限期", color: "#d97706", bg: "#fffbeb", advice: "域名已过期，仍可按正常续费价格续期，请尽快操作。" },
    redemption:  { label: "赎回期", color: "#ea580c", bg: "#fff7ed", advice: "域名进入赎回期，续费费用较高，请联系注册商赎回。" },
    pendingDelete: { label: "待删除", color: "#dc2626", bg: "#fef2f2", advice: "域名即将被注册局删除，通常无法再续期，请做好准备。" },
    dropped:     { label: "已删除", color: "#6b7280", bg: "#f9fafb", advice: "域名已被删除，即将重新开放注册。" },
  };
  const lc = p.lifecycle;
  const phase = phaseInfo[lc?.phase ?? "active"] ?? phaseInfo.active;

  return emailLayout(`
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:28px 32px 24px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase">域名订阅</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;font-family:monospace;letter-spacing:-0.5px">${p.domain}</h1>
    </div>

    <!-- Expiry info -->
    ${section(`
      <table cellpadding="0" cellspacing="0" style="width:100%;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;overflow:hidden">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase">过期日期</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1e293b;font-family:monospace">${expiryStr}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:${phase.bg}">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${phase.color};text-transform:uppercase">当前状态 · ${phase.label}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#475569;line-height:1.6">${phase.advice}</p>
          </td>
        </tr>
        ${lc ? `
        <tr>
          <td style="padding:14px 20px;border-top:1px solid #e2e8f0">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase">生命周期时间表</p>
            <table cellpadding="0" cellspacing="0" style="width:100%">
              ${[
                ["宽限期结束", lc.graceEnd, "#d97706"],
                ["赎回期结束", lc.redemptionEnd, "#ea580c"],
                ["预计释放时间", lc.dropDate, "#dc2626"],
              ].map(([label, date, color]) => `
                <tr>
                  <td style="padding:3px 0;font-size:12px;color:#64748b">${label}</td>
                  <td style="padding:3px 0;font-size:12px;font-weight:600;color:${color};font-family:monospace;text-align:right">${date}</td>
                </tr>
              `).join("")}
            </table>
          </td>
        </tr>` : ""}
      </table>
    `)}

    ${divider()}

    ${section(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1e293b">📅 到期前提醒节点</p>
      <p style="margin:0 0 10px;font-size:12px;color:#64748b;line-height:1.6">在以下时间节点自动发送邮件提醒：</p>
      <div>${p.thresholds.map(d => pill(`提前 ${d} 天`)).join("")}</div>
      ${lc && (lc.hasGrace || lc.hasRedemption || lc.hasPendingDelete) ? `
      <p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#1e293b">🔔 生命周期阶段提醒</p>
      <p style="margin:0 0 10px;font-size:12px;color:#64748b;line-height:1.6">当域名进入以下阶段时，额外发送提醒：</p>
      <div>
        ${lc.hasGrace ? pill("进入宽限期", "#fffbeb", "#d97706") : ""}
        ${lc.hasRedemption ? pill("进入赎回期", "#fff7ed", "#ea580c") : ""}
        ${lc.hasPendingDelete ? pill("进入待删除期", "#fef2f2", "#dc2626") : ""}
      </div>` : ""}
      <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;line-height:1.6">
        提醒将持续发送，直到域名续费成功或您手动取消订阅。
      </p>
    `)}

    ${divider()}

    <div style="padding:20px 32px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <a href="${baseUrl}/${p.domain}"
        style="display:inline-block;background:${PRIMARY};color:#fff;font-size:12px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none">
        查看域名 →
      </a>
      <a href="${cancelUrl}"
        style="display:inline-block;font-size:11px;color:#94a3b8;text-decoration:underline">
        取消订阅
      </a>
    </div>
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Reminder email (sent by cron when approaching expiry)
// ──────────────────────────────────────────────────────────────────────────────
export function reminderHtml({
  domain, expirationDate, daysLeft, cancelToken,
}: { domain: string; expirationDate: string | null; daysLeft: number; cancelToken: string }): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw";
  const cancelUrl = `${baseUrl}/remind/cancel?token=${cancelToken}`;
  const expiryStr = expirationDate
    ? new Date(expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "即将";
  const urgent = daysLeft <= 5;
  const headerBg = urgent
    ? "linear-gradient(135deg,#ef4444 0%,#dc2626 100%)"
    : daysLeft <= 15
    ? "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)"
    : "linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)";

  return emailLayout(`
    <div style="background:${headerBg};padding:28px 32px 24px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.75);text-transform:uppercase">
        ${urgent ? "⚠️ 紧急提醒" : "到期提醒"}
      </p>
      <h1 style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#fff;font-family:monospace">${domain}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,.85)">
        距离到期还有 <strong>${daysLeft}</strong> 天
      </p>
    </div>

    ${section(`
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <tr>
          <td style="padding:16px 20px">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase">过期日期</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#1e293b;font-family:monospace">${expiryStr}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.75">
        ${urgent
          ? "域名即将在 <strong>" + daysLeft + " 天</strong>后过期，请立即前往注册商续费，避免域名进入赎回期导致额外费用。"
          : "请提前续费您的域名，以免因过期导致服务中断。续期后请忽略本提醒。"}
      </p>
    `)}

    ${divider()}

    <div style="padding:20px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <a href="${baseUrl}/${domain}"
        style="display:inline-block;background:${urgent ? "#ef4444" : PRIMARY};color:#fff;font-size:12px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none">
        立即查询续费 →
      </a>
      <a href="${cancelUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">
        取消订阅
      </a>
    </div>
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase event reminder email (grace / redemption / pending-delete entered)
// ──────────────────────────────────────────────────────────────────────────────
export interface PhaseEventEmailParams {
  domain: string;
  phase: "grace" | "redemption" | "pendingDelete";
  expirationDate: string | null;
  graceEnd?: string;
  redemptionEnd?: string;
  dropDate?: string;
  cancelToken: string;
}

export function phaseEventHtml(p: PhaseEventEmailParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw";
  const cancelUrl = `${baseUrl}/remind/cancel?token=${p.cancelToken}`;
  const expiryStr = p.expirationDate
    ? new Date(p.expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";

  const phaseConfig = {
    grace: {
      headerBg: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
      icon: "⏰",
      label: "宽限期提醒",
      labelEn: "Grace Period Alert",
      badge: "宽限期",
      badgeColor: "#d97706",
      badgeBg: "#fffbeb",
      heading: `${p.domain} 已进入宽限期`,
      body: "域名已过期，但目前仍处于宽限期内，您可以按正常续费价格续期。请尽快联系您的注册商完成续费，以免进入赎回期产生额外费用。",
      urgency: "⚠️ 请尽快操作",
      nextLabel: "宽限期结束",
      nextDate: p.graceEnd,
      nextColor: "#d97706",
    },
    redemption: {
      headerBg: "linear-gradient(135deg,#f97316 0%,#ea580c 100%)",
      icon: "🚨",
      label: "赎回期提醒",
      labelEn: "Redemption Period Alert",
      badge: "赎回期",
      badgeColor: "#ea580c",
      badgeBg: "#fff7ed",
      heading: `${p.domain} 已进入赎回期`,
      body: "域名宽限期已结束，现处于赎回期。赎回费用通常为正常续费价格的 5–10 倍。请立即联系您的注册商申请赎回，否则域名将进入待删除状态并最终被释放。",
      urgency: "🚨 赎回费用较高，请立即操作",
      nextLabel: "赎回期结束",
      nextDate: p.redemptionEnd,
      nextColor: "#ea580c",
    },
    pendingDelete: {
      headerBg: "linear-gradient(135deg,#ef4444 0%,#dc2626 100%)",
      icon: "❌",
      label: "待删除提醒",
      labelEn: "Pending Delete Alert",
      badge: "待删除",
      badgeColor: "#dc2626",
      badgeBg: "#fef2f2",
      heading: `${p.domain} 即将被删除`,
      body: "域名已进入待删除状态，通常无法通过注册商续费或赎回。删除后域名将重新向公众开放注册。如有需要可在删除后抢注，或联系专业抢注服务。",
      urgency: "❌ 通常已无法续费",
      nextLabel: "预计释放时间",
      nextDate: p.dropDate,
      nextColor: "#dc2626",
    },
  }[p.phase];

  return emailLayout(`
    <div style="background:${phaseConfig.headerBg};padding:28px 32px 24px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.75);text-transform:uppercase">
        ${phaseConfig.icon} ${phaseConfig.label}
      </p>
      <h1 style="margin:8px 0 4px;font-size:20px;font-weight:800;color:#fff;font-family:monospace">${p.domain}</h1>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,.85)">域名生命周期状态变更通知</p>
    </div>

    ${section(`
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase">原过期日期</p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#1e293b;font-family:monospace">${expiryStr}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:${phaseConfig.badgeBg}">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${phaseConfig.badgeColor};text-transform:uppercase">
              当前状态 · ${phaseConfig.badge}
            </p>
            <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:#1e293b">${phaseConfig.heading}</p>
          </td>
        </tr>
        ${phaseConfig.nextDate ? `
        <tr>
          <td style="padding:12px 20px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase">
              ${phaseConfig.nextLabel}
            </p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:${phaseConfig.nextColor};font-family:monospace">
              ${phaseConfig.nextDate}
            </p>
          </td>
        </tr>` : ""}
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:#475569;line-height:1.75">${phaseConfig.body}</p>

      <div style="margin:16px 0 0;padding:12px 16px;background:#fafafa;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0;font-size:12px;font-weight:700;color:#64748b">${phaseConfig.urgency}</p>
      </div>
    `)}

    ${divider()}

    <div style="padding:20px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <a href="${baseUrl}/${p.domain}"
        style="display:inline-block;background:${PRIMARY};color:#fff;font-size:12px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none">
        查看域名详情 →
      </a>
      <a href="${cancelUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">取消订阅</a>
    </div>
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Password reset email
// ──────────────────────────────────────────────────────────────────────────────
export function passwordResetHtml({ resetUrl }: { resetUrl: string }): string {
  return emailLayout(`
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 32px 24px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase">安全操作</p>
      <h1 style="margin:8px 0 0;font-size:24px;font-weight:800;color:#fff">重置密码</h1>
    </div>

    ${section(`
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.75">
        我们收到了您的密码重置请求。点击下方按钮设置新密码，链接有效期为 <strong>60 分钟</strong>。
      </p>
      <a href="${resetUrl}"
        style="display:inline-block;background:#6366f1;color:#fff;font-size:13px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.2px">
        重置密码 →
      </a>
      <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;line-height:1.6">
        如非您本人操作，请忽略此邮件。您的账户安全不受影响。
      </p>
    `)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin test / notification email
// ──────────────────────────────────────────────────────────────────────────────
export function adminNotifyHtml({ subject, body }: { subject: string; body: string }): string {
  return emailLayout(`
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px 24px">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.5);text-transform:uppercase">管理员通知</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff">${subject}</h1>
    </div>
    ${section(`<p style="margin:0;font-size:14px;color:#475569;line-height:1.75">${body}</p>`)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Sending helper
// ──────────────────────────────────────────────────────────────────────────────
// Resend's built-in verified address — works without custom domain setup
const RESEND_FALLBACK_FROM = "onboarding@resend.dev";

export async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[sendEmail] RESEND_API_KEY not set — email skipped");
    return;
  }

  const configuredFrom = process.env.RESEND_FROM_EMAIL || "";

  // Try configured from address first; fall back to Resend's built-in verified domain
  const fromAddresses = configuredFrom
    ? [configuredFrom, RESEND_FALLBACK_FROM]
    : [RESEND_FALLBACK_FROM];

  for (const from of fromAddresses) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (resp.ok) return; // success
      const body = await resp.text().catch(() => "");
      // Domain not verified — retry with fallback
      if (resp.status === 403 && body.includes("not verified") && from !== RESEND_FALLBACK_FROM) {
        console.warn(`[sendEmail] Domain not verified for "${from}", retrying with ${RESEND_FALLBACK_FROM}`);
        continue;
      }
      console.error("[sendEmail] Resend error:", resp.status, body);
      return;
    } catch (err: any) {
      console.error("[sendEmail] fetch error:", err.message);
      return;
    }
  }
}
