/**
 * Shared email helpers — send via Resend, consistent HTML template.
 */

const PRIMARY    = "#7c3aed";   // violet-600
const PRIMARY_LT = "#8b5cf6";   // violet-500
const DARK       = "#0f172a";   // slate-900
const FONT       = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const BASE_URL   = () => process.env.NEXT_PUBLIC_BASE_URL || "https://x.rw";

// ── Shared primitives ────────────────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Next Whois</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:${FONT}">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f1f5f9">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

        <!-- Logo -->
        <tr>
          <td style="padding-bottom:20px;text-align:center">
            <span style="font-size:18px;font-weight:800;letter-spacing:-0.5px;color:${DARK}">
              NEXT&thinsp;<span style="color:${PRIMARY}">WHOIS</span>
            </span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.07)">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 8px 0;text-align:center">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.8">
              此邮件由 <a href="${BASE_URL()}" style="color:${PRIMARY};text-decoration:none">Next Whois</a> 自动发送，请勿直接回复。<br/>
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

/** Domain name displayed monospace */
function domainBadge(domain: string) {
  return `<span style="font-family:ui-monospace,'Fira Code',monospace;font-size:inherit;font-weight:800;letter-spacing:-0.3px">${domain}</span>`;
}

/** Coloured pill tag */
function pill(text: string, bg = "#ede9fe", color = "#5b21b6") {
  return `<span style="display:inline-block;background:${bg};color:${color};padding:3px 11px;border-radius:999px;font-size:12px;font-weight:600;margin:3px 3px 3px 0">${text}</span>`;
}

/** Key-value row inside an info block */
function kvRow(label: string, value: string, valueStyle = "") {
  return `<tr>
    <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:500;width:110px;vertical-align:top;border-bottom:1px solid #f1f5f9">${label}</td>
    <td style="padding:10px 0;font-size:13px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;${valueStyle}">${value}</td>
  </tr>`;
}

/** Card section with padding */
function section(html: string, pt = "28px", pr = "32px", pb = "28px", pl = "32px") {
  return `<div style="padding:${pt} ${pr} ${pb} ${pl}">${html}</div>`;
}

/** Thin divider */
function divider() {
  return `<div style="height:1px;background:#f1f5f9"></div>`;
}

/** Dark header band */
function darkHeader(label: string, title: string, sub = "") {
  return `<div style="background:${DARK};padding:28px 32px 24px;position:relative">
    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase">${label}</p>
    <h1 style="margin:8px 0 ${sub ? "6px" : "0"};font-size:22px;font-weight:800;color:#fff;line-height:1.3">${title}</h1>
    ${sub ? `<p style="margin:0;font-size:13px;color:rgba(255,255,255,.55)">${sub}</p>` : ""}
    <div style="position:absolute;top:0;right:0;width:80px;height:100%;background:linear-gradient(to left,rgba(124,58,237,.18),transparent);pointer-events:none"></div>
  </div>`;
}

/** Coloured header band (for urgent/phase alerts) */
function colorHeader(bg: string, label: string, title: string, sub = "") {
  return `<div style="background:${bg};padding:28px 32px 24px">
    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.65);text-transform:uppercase">${label}</p>
    <h1 style="margin:8px 0 ${sub ? "6px" : "0"};font-size:22px;font-weight:800;color:#fff;line-height:1.3">${title}</h1>
    ${sub ? `<p style="margin:0;font-size:13px;color:rgba(255,255,255,.75)">${sub}</p>` : ""}
  </div>`;
}

/** Primary CTA button */
function ctaBtn(href: string, label: string, color = PRIMARY) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;font-size:13px;font-weight:700;padding:12px 26px;border-radius:10px;text-decoration:none;letter-spacing:0.1px">${label} →</a>`;
}

/** Ghost / cancel link */
function ghostLink(href: string, label: string) {
  return `<a href="${href}" style="font-size:11px;color:#94a3b8;text-decoration:underline;text-underline-offset:3px">${label}</a>`;
}

// ── Footer action row (button + optional ghost link) ─────────────────────────
function actionRow(btnHref: string, btnLabel: string, cancelHref?: string, btnColor = PRIMARY) {
  return `<div style="padding:20px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    ${ctaBtn(btnHref, btnLabel, btnColor)}
    ${cancelHref ? ghostLink(cancelHref, "取消订阅") : ""}
  </div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Welcome email
// ──────────────────────────────────────────────────────────────────────────────
export function welcomeHtml({ name, email }: { name?: string | null; email: string }): string {
  const greeting = name ? `你好，${name}` : "你好";
  const features: [string, string, string][] = [
    ["🔍", "无限查询", "WHOIS / RDAP · 域名、IP、ASN、CIDR 全支持"],
    ["🔔", "到期订阅提醒", "多节点自动推送，不错过任何续费时间"],
    ["🛡️", "品牌认领", "为您拥有的域名设置认证标签"],
    ["📊", "搜索历史", "随时回顾查询记录"],
  ];

  return emailLayout(`
    ${darkHeader("欢迎加入", greeting + "！", "您的账号已成功创建")}

    ${section(`
      <p style="margin:0 0 20px;font-size:13px;color:#64748b;line-height:1.8">
        现在可以使用 Next Whois 的全部功能：
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        ${features.map(([icon, title, desc]) => `
          <tr>
            <td style="width:40px;padding:9px 12px 9px 0;vertical-align:middle;font-size:18px;line-height:1">${icon}</td>
            <td style="padding:9px 0;border-bottom:1px solid #f8fafc">
              <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b">${title}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">${desc}</p>
            </td>
          </tr>
        `).join("")}
      </table>
      <p style="margin:0;font-size:12px;color:#94a3b8">
        登录邮箱：<span style="font-family:monospace;color:#334155;font-weight:600">${email}</span>
      </p>
    `)}

    ${divider()}
    ${actionRow(`${BASE_URL()}`, "开始查询")}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Subscription confirmation email
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
  const cancelUrl = `${BASE_URL()}/remind/cancel?token=${p.cancelToken}`;

  const expiryStr = p.expirationDate
    ? new Date(p.expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";

  const phaseMap: Record<string, { label: string; color: string; bg: string; desc: string }> = {
    active:        { label: "有效期内",  color: "#059669", bg: "#ecfdf5", desc: "域名状态正常，到期前将自动发送提醒。" },
    grace:         { label: "宽限期",    color: "#d97706", bg: "#fffbeb", desc: "域名已过期，仍可按正常价格续费。" },
    redemption:    { label: "赎回期",    color: "#ea580c", bg: "#fff7ed", desc: "续费费用较高，请尽快联系注册商赎回。" },
    pendingDelete: { label: "待删除",    color: "#dc2626", bg: "#fef2f2", desc: "域名即将被注册局删除，通常无法再续费。" },
    dropped:       { label: "已删除",    color: "#6b7280", bg: "#f9fafb", desc: "域名已删除，即将重新开放注册。" },
  };
  const lc = p.lifecycle;
  const phase = phaseMap[lc?.phase ?? "active"] ?? phaseMap.active;

  return emailLayout(`
    ${darkHeader("域名订阅确认", domainBadge(p.domain), "我们将在到期前自动发送邮件提醒")}

    ${section(`
      <!-- Info block -->
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px">
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">过期日期</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#1e293b;font-family:ui-monospace,'Fira Code',monospace">${expiryStr}</p>
        </div>
        <div style="padding:12px 18px;background:${phase.bg}">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:${phase.color};text-transform:uppercase">当前状态 · ${phase.label}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#475569;line-height:1.7">${phase.desc}</p>
        </div>
        ${lc ? `
        <div style="padding:14px 18px;border-top:1px solid #e2e8f0">
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">生命周期时间表</p>
          <table cellpadding="0" cellspacing="0" style="width:100%">
            ${[
              ["宽限期结束",   lc.graceEnd,      "#d97706"],
              ["赎回期结束",   lc.redemptionEnd,  "#ea580c"],
              ["预计释放时间", lc.dropDate,       "#dc2626"],
            ].map(([l, d, c]) => `<tr>
              <td style="padding:4px 0;font-size:12px;color:#64748b">${l}</td>
              <td style="padding:4px 0;font-size:12px;font-weight:700;color:${c};font-family:monospace;text-align:right">${d}</td>
            </tr>`).join("")}
          </table>
        </div>` : ""}
      </div>

      <!-- Thresholds -->
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e293b">提醒节点</p>
      <div style="margin-bottom:${lc && (lc.hasGrace || lc.hasRedemption || lc.hasPendingDelete) ? "16px" : "0"}">
        ${p.thresholds.map(d => pill(`提前 ${d} 天`)).join("")}
      </div>
      ${lc && (lc.hasGrace || lc.hasRedemption || lc.hasPendingDelete) ? `
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e293b">生命周期阶段提醒</p>
      <div>
        ${lc.hasGrace      ? pill("进入宽限期", "#fffbeb", "#d97706") : ""}
        ${lc.hasRedemption ? pill("进入赎回期", "#fff7ed", "#ea580c") : ""}
        ${lc.hasPendingDelete ? pill("进入待删除期", "#fef2f2", "#dc2626") : ""}
      </div>` : ""}
    `)}

    ${divider()}
    ${actionRow(`${BASE_URL()}/${p.domain}`, "查看域名", cancelUrl)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Expiry reminder email
// ──────────────────────────────────────────────────────────────────────────────
export function reminderHtml({
  domain, expirationDate, daysLeft, cancelToken,
}: { domain: string; expirationDate: string | null; daysLeft: number; cancelToken: string }): string {
  const cancelUrl = `${BASE_URL()}/remind/cancel?token=${cancelToken}`;
  const expiryStr = expirationDate
    ? new Date(expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "即将到期";

  const urgent = daysLeft <= 5;
  const warn   = daysLeft <= 15;
  const hdrBg  = urgent ? "#dc2626" : warn ? "#d97706" : DARK;
  const hdrLabel = urgent ? "⚠ 紧急提醒" : "到期提醒";
  const btnColor = urgent ? "#dc2626" : warn ? "#d97706" : PRIMARY;

  const bodyText = urgent
    ? `域名将在 <strong>${daysLeft} 天</strong>内过期，请立即前往注册商续费，避免进入宽限期产生额外费用。`
    : `请尽快续费您的域名，以免服务因过期而中断。续费成功后可忽略此提醒。`;

  return emailLayout(`
    ${urgent || warn
      ? colorHeader(hdrBg, hdrLabel, domainBadge(domain), `距离到期还有 ${daysLeft} 天`)
      : darkHeader(hdrLabel, domainBadge(domain), `距离到期还有 ${daysLeft} 天`)}

    ${section(`
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:18px">
        <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">过期日期</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#1e293b;font-family:ui-monospace,'Fira Code',monospace">${expiryStr}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.8">${bodyText}</p>
    `)}

    ${divider()}
    ${actionRow(`${BASE_URL()}/${domain}`, "立即查看", cancelUrl, btnColor)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Phase event email (grace / redemption / pending-delete entered)
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
  const cancelUrl = `${BASE_URL()}/remind/cancel?token=${p.cancelToken}`;
  const expiryStr = p.expirationDate
    ? new Date(p.expirationDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";

  const cfg = {
    grace: {
      bg: "#d97706", label: "宽限期提醒",
      badge: "宽限期",  badgeColor: "#d97706", badgeBg: "#fffbeb",
      body: "域名已过期但仍处于宽限期，可按正常价格续费。请尽快联系注册商，以免进入赎回期产生额外费用。",
      urgency: "⚠ 请尽快续费", urgencyColor: "#92400e", urgencyBg: "#fffbeb",
      nextLabel: "宽限期结束", nextDate: p.graceEnd, nextColor: "#d97706",
    },
    redemption: {
      bg: "#ea580c", label: "赎回期提醒",
      badge: "赎回期",  badgeColor: "#ea580c", badgeBg: "#fff7ed",
      body: "宽限期已结束，域名进入赎回期。赎回费用通常为正常价格的 5–10 倍，请立即联系注册商申请赎回。",
      urgency: "🚨 高额赎回费，请立即操作", urgencyColor: "#9a3412", urgencyBg: "#fff7ed",
      nextLabel: "赎回期结束", nextDate: p.redemptionEnd, nextColor: "#ea580c",
    },
    pendingDelete: {
      bg: "#dc2626", label: "待删除提醒",
      badge: "待删除",  badgeColor: "#dc2626", badgeBg: "#fef2f2",
      body: "域名已进入待删除状态，通常无法再续费或赎回。删除后域名将重新向公众开放注册，如有需要可关注抢注时机。",
      urgency: "❌ 通常已无法续费", urgencyColor: "#991b1b", urgencyBg: "#fef2f2",
      nextLabel: "预计释放时间", nextDate: p.dropDate, nextColor: "#dc2626",
    },
  }[p.phase];

  return emailLayout(`
    ${colorHeader(cfg.bg, cfg.label, domainBadge(p.domain), "域名生命周期状态变更通知")}

    ${section(`
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:18px">
        <div style="padding:12px 18px;border-bottom:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">原过期日期</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#1e293b;font-family:monospace">${expiryStr}</p>
        </div>
        <div style="padding:12px 18px;background:${cfg.badgeBg}">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:${cfg.badgeColor};text-transform:uppercase">当前状态 · ${cfg.badge}</p>
        </div>
        ${cfg.nextDate ? `
        <div style="padding:12px 18px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">${cfg.nextLabel}</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:${cfg.nextColor};font-family:monospace">${cfg.nextDate}</p>
        </div>` : ""}
      </div>

      <p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.8">${cfg.body}</p>

      <div style="padding:12px 16px;background:${cfg.urgencyBg};border:1px solid ${cfg.badgeBg};border-radius:8px">
        <p style="margin:0;font-size:12px;font-weight:700;color:${cfg.urgencyColor}">${cfg.urgency}</p>
      </div>
    `)}

    ${divider()}
    ${actionRow(`${BASE_URL()}/${p.domain}`, "查看域名详情", cancelUrl, cfg.bg)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Password reset email
// ──────────────────────────────────────────────────────────────────────────────
export function passwordResetHtml({ resetUrl }: { resetUrl: string }): string {
  return emailLayout(`
    ${darkHeader("账户安全", "重置您的密码")}

    ${section(`
      <p style="margin:0 0 22px;font-size:13px;color:#64748b;line-height:1.8">
        我们收到了您的密码重置请求。点击下方按钮设置新密码，链接在 <strong style="color:#1e293b">60 分钟</strong>内有效。
      </p>
      ${ctaBtn(resetUrl, "重置密码", PRIMARY)}
      <div style="margin:22px 0 0;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7">
          如果按钮无法点击，请复制以下链接到浏览器地址栏：<br/>
          <a href="${resetUrl}" style="color:${PRIMARY};font-size:11px;word-break:break-all">${resetUrl}</a>
        </p>
      </div>
      <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;line-height:1.7">
        如非您本人操作，请忽略此邮件，您的账户安全不受影响。
      </p>
    `)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Admin test / notification email
// ──────────────────────────────────────────────────────────────────────────────
export function adminNotifyHtml({ subject, body }: { subject: string; body: string }): string {
  return emailLayout(`
    ${darkHeader("管理员通知", subject)}
    ${section(`<p style="margin:0;font-size:13px;color:#475569;line-height:1.8">${body}</p>`)}
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Feedback notification email (sent to admin)
// ──────────────────────────────────────────────────────────────────────────────
export function feedbackHtml({
  query, queryType, issueLabels, description, email, ip, ts,
}: {
  query: string;
  queryType: string;
  issueLabels: string;
  description?: string;
  email?: string;
  ip: string;
  ts: string;
}): string {
  const rows = [
    kvRow("查询目标", `<span style="font-family:monospace">${query}</span>`),
    kvRow("查询类型", queryType),
    kvRow("问题类型", `<span style="color:#dc2626">${issueLabels}</span>`),
    ...(description ? [kvRow("补充说明", `<span style="white-space:pre-wrap">${description}</span>`)] : []),
    ...(email ? [kvRow("联系邮箱", `<a href="mailto:${email}" style="color:${PRIMARY}">${email}</a>`)] : []),
  ];

  return emailLayout(`
    ${darkHeader("用户反馈", query, ts + "（北京时间）")}

    ${section(`
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${rows.join("")}
      </table>
    `)}

    ${divider()}
    <div style="padding:14px 32px;background:#f8fafc">
      <p style="margin:0;font-size:11px;color:#94a3b8">IP：${ip} · 来源：Next Whois 反馈系统</p>
    </div>
  `);
}

// ──────────────────────────────────────────────────────────────────────────────
// Sending helper
// ──────────────────────────────────────────────────────────────────────────────
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
      if (resp.ok) return;
      const body = await resp.text().catch(() => "");
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
