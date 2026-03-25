import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RiCalendarLine, RiMailLine, RiSearchLine, RiShieldCheckLine,
  RiArrowRightLine, RiGlobalLine, RiTimeLine, RiTimerLine,
  RiLoader4Line, RiDeleteBinLine, RiExternalLinkLine,
  RiArrowLeftLine, RiBellLine, RiAlertLine, RiLockLine,
  RiCheckLine, RiRefreshLine, RiInformationLine,
  RiCheckboxCircleLine,
} from "@remixicon/react";

type Subscription = {
  id: string;
  domain: string;
  expiration_date: string | null;
  active: boolean;
  created_at: string;
  days_before: number | null;
  phase: string | null;
  days_to_expiry: number | null;
  days_to_drop: number | null;
  sent_keys: number[];
  last_reminded_at: string | null;
  next_reminder_at: string | null;
  next_reminder_days: number | null;
  tld_confidence: string | null;
  drop_date: string | null;
  grace_end: string | null;
  redemption_end: string | null;
};

type FilterKey = "all" | "expiring" | "expired" | "inactive";

const STEPS = [
  {
    icon: RiSearchLine,
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    title: "搜索你的域名",
    desc: "在首页搜索框输入你拥有的域名，查看 WHOIS 信息",
  },
  {
    icon: RiBellLine,
    color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    title: "点击「订阅提醒」",
    desc: "在域名详情页找到订阅按钮，设置提前提醒的天数",
  },
  {
    icon: RiMailLine,
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    title: "自动接收邮件提醒",
    desc: "到期前我们会自动向你的账户邮箱发送提醒邮件",
  },
];

function fmt(d: Date) {
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function getDaysLeft(expDate: string | null): number | null {
  if (!expDate) return null;
  const diff = new Date(expDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function PhaseChip({ phase }: { phase: string | null }) {
  if (!phase || phase === "active") return null;
  const map: Record<string, { label: string; cls: string }> = {
    grace:      { label: "宽限期", cls: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" },
    redemption: { label: "赎回期", cls: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400" },
    pending:    { label: "待删除", cls: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" },
    dropped:    { label: "已释放", cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  };
  const info = map[phase];
  if (!info) return null;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold", info.cls)}>
      {info.label}
    </span>
  );
}

function UrgencyBar({ daysLeft, phase }: { daysLeft: number | null; phase: string | null }) {
  if (daysLeft === null) return null;
  if (daysLeft > 90) return null;
  const pct = Math.max(0, Math.min(100, (daysLeft / 90) * 100));
  const color =
    daysLeft <= 7  ? "bg-red-500" :
    daysLeft <= 30 ? "bg-orange-500" :
    daysLeft <= 60 ? "bg-amber-400" :
                     "bg-emerald-500";
  return (
    <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden mt-1.5">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ALL_THRESHOLDS = [60, 30, 10, 5, 1];

// ── Direct-subscribe form (shown when ?domain= is in the URL) ──────────────
function DirectSubscribeForm({ domain }: { domain: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = React.useState("");
  const [thresholds, setThresholds] = React.useState<number[]>([60, 30, 1]);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  // Redirect unauthenticated users to login, preserving ?domain=
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/remind?domain=${encodeURIComponent(domain)}`)}`);
    }
  }, [status, domain, router]);

  // Prefill email from session
  React.useEffect(() => {
    if (session?.user?.email) setEmail(prev => prev || session.user!.email!);
  }, [session]);

  function toggleThreshold(d: number) {
    setThresholds(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => b - a));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast.error("请输入有效邮箱"); return; }
    if (thresholds.length === 0) { toast.error("请至少选择一个提醒时间"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/remind/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.toLowerCase().trim(),
          email,
          expirationDate: null,
          phaseAlerts: { grace: true, redemption: true, pendingDelete: true, dropSoon: true, dropped: true },
          thresholds,
          regStatusType: null,
        }),
      });
      if (res.ok) { setDone(true); } else { toast.error("提交失败，请重试"); }
    } catch { toast.error("网络错误，请重试"); }
    finally { setSubmitting(false); }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4 animate-pulse">
          <div className="h-5 w-32 rounded-lg bg-muted/50" />
          <div className="h-28 rounded-2xl bg-muted/40" />
          <div className="h-48 rounded-2xl bg-muted/40" />
          <div className="h-12 rounded-xl bg-muted/35" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title key="site-title">{`订阅提醒 · ${domain}`}</title>
      </Head>
      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-lg mx-auto px-4 py-5 pb-10">
          {/* Back nav */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => { if (window.history.length > 1) router.back(); else router.push("/dashboard"); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <RiArrowLeftLine className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              返回
            </button>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-sm font-mono text-muted-foreground/80">{domain}</span>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="space-y-4">
              <div className="glass-panel border border-border rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center mx-auto">
                  <RiCheckboxCircleLine className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-bold">订阅成功</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    已为 <span className="font-mono font-semibold">{domain}</span> 开启到期提醒<br />
                    确认邮件已发送至 <span className="font-semibold">{email}</span>
                  </p>
                </div>
                <div className="flex gap-2 justify-center pt-1">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 gap-1" onClick={() => router.push("/dashboard")}>
                    前往用户中心
                  </Button>
                  <Button size="sm" className="rounded-xl text-xs h-8 gap-1" onClick={() => router.push(`/${domain}`)}>
                    查看域名 WHOIS
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Subscription form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-5">
                <RiCalendarLine className="w-4 h-4 text-sky-500 shrink-0" />
                <h1 className="text-sm font-bold">域名到期提醒</h1>
              </div>

              {/* Domain display */}
              <div className="glass-panel border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                  <RiGlobalLine className="w-4.5 h-4.5 text-sky-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">域名</p>
                  <p className="text-sm font-bold font-mono">{domain.toUpperCase()}</p>
                </div>
              </div>

              {/* Email */}
              <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RiMailLine className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">接收邮箱</p>
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-9 rounded-xl text-sm"
                  required
                />
                <p className="text-[10px] text-muted-foreground">到期前提醒邮件将发送到此邮箱</p>
              </div>

              {/* Thresholds */}
              <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RiBellLine className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">提醒时间</p>
                  <span className="text-[10px] text-muted-foreground ml-auto">到期前多少天发送邮件</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_THRESHOLDS.map(d => {
                    const active = thresholds.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleThreshold(d)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          active
                            ? "bg-sky-500 text-white border-sky-500"
                            : "bg-background text-muted-foreground border-border hover:border-sky-400/60 hover:text-sky-600"
                        )}
                      >
                        {d} 天前
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">另外，宽限期、赎回期、待删除阶段也会自动发送提醒</p>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl gap-1.5">
                {submitting ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiCheckLine className="w-4 h-4" />}
                {submitting ? "提交中…" : "开启到期提醒"}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                订阅成功后可在{" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => router.push("/dashboard")}>用户中心</button>
                {" "}随时管理或取消订阅
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default function RemindPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loadingSubs, setLoadingSubs] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  const [reactivating, setReactivating] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [expandInactive, setExpandInactive] = React.useState(false);

  const domainParam = String(router.query.domain || "").trim();

  // Load subscriptions only in list mode (no domain param)
  React.useEffect(() => {
    if (domainParam) return;
    if (status === "authenticated") {
      setLoadingSubs(true);
      fetch("/api/user/subscriptions")
        .then(r => r.json())
        .then(d => { if (d.subscriptions) setSubscriptions(d.subscriptions); })
        .catch(() => {})
        .finally(() => setLoadingSubs(false));
    }
  }, [status, domainParam]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/${q}?subscribe=1`);
  }

  // Delegate to DirectSubscribeForm when ?domain= is present — after all hooks
  if (domainParam) return <DirectSubscribeForm domain={domainParam} />;

  async function cancelSub(id: string) {
    setCancelling(id);
    try {
      await fetch(`/api/user/subscriptions?id=${id}`, { method: "DELETE" });
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, active: false } : s));
      toast.success("已取消订阅");
    } catch {
      toast.error("操作失败");
    } finally {
      setCancelling(null);
    }
  }

  async function reactivateSub(id: string, domain: string) {
    setReactivating(id);
    try {
      const r = await fetch(`/api/user/subscriptions?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!r.ok) throw new Error();
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, active: true } : s));
      toast.success("已重新激活订阅");
    } catch {
      router.push(`/${domain}?subscribe=1`);
    } finally {
      setReactivating(null);
    }
  }

  const activeSubs = subscriptions.filter(s => s.active);
  const inactiveSubs = subscriptions.filter(s => !s.active);

  const expiringSoon = activeSubs.filter(s => {
    const d = s.days_to_expiry ?? getDaysLeft(s.expiration_date);
    return d !== null && d >= 0 && d <= 30;
  });

  const expiredSubs = activeSubs.filter(s => {
    const d = s.days_to_expiry ?? getDaysLeft(s.expiration_date);
    return d !== null && d < 0;
  });

  const totalSent = subscriptions.reduce((acc, s) => acc + (s.sent_keys?.length ?? 0), 0);

  const filteredSubs = (() => {
    switch (filter) {
      case "expiring": return expiringSoon;
      case "expired":  return expiredSubs;
      case "inactive": return inactiveSubs;
      default:         return activeSubs;
    }
  })();

  const filterTabs: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all",      label: "全部活跃",   count: activeSubs.length },
    { key: "expiring", label: "30天内到期",  count: expiringSoon.length },
    { key: "expired",  label: "已过期",      count: expiredSubs.length },
    { key: "inactive", label: "已取消",      count: inactiveSubs.length },
  ];

  return (
    <>
      <Head>
        <title key="site-title">域名到期提醒订阅 · Next WHOIS</title>
        <meta name="description" content="订阅域名到期提醒，到期前自动发送邮件通知，再也不会忘记续费。" />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RiArrowLeftLine className="w-3.5 h-3.5" />返回用户中心
        </Link>

        {/* Hero */}
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <RiCalendarLine className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">域名到期提醒</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            订阅你拥有的域名，到期前自动发送提醒邮件，让你有充足时间续费，避免域名丢失。<br />
            同时跟踪宽限期、赎回期等域名生命周期阶段，全程掌握域名状态。
          </p>
        </div>

        {/* Search bar */}
        <div className="glass-panel border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <RiSearchLine className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">搜索域名开始订阅</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="输入你的域名，如 x.rw"
              className="h-10 rounded-xl text-sm font-mono flex-1"
              autoComplete="off"
            />
            <Button type="submit" className="h-10 rounded-xl gap-1.5 px-5 shrink-0">
              查询
              <RiArrowRightLine className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Visual mockup */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">在这里找到入口</p>
          <div className="relative rounded-2xl border border-border bg-muted/10 p-4">
            <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 bg-muted/60 px-2 py-0.5 rounded-full">预览</span>
            <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">DOMAIN</p>
                <p className="text-sm font-bold font-mono tracking-tight">X.RW</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                  </span>
                  <span className="text-[10px] text-muted-foreground">⏱ 2y</span>
                </div>
              </div>
              <div className="px-4 pb-3.5 hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-muted/40 border-border/50 text-muted-foreground/50">
                  <RiShieldCheckLine className="w-3 h-3" />品牌认领
                </div>
                <div className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-sky-100 dark:bg-sky-950/50 border-sky-400/70 text-sky-600 dark:text-sky-400 shadow-sm ring-2 ring-sky-400/20">
                  <RiTimeLine className="w-3 h-3" />域名订阅
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                  </span>
                </div>
              </div>
              <div className="px-4 pb-3.5 flex items-center gap-2 sm:hidden">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border bg-muted/40 border-border/50 text-muted-foreground/60">
                  <RiShieldCheckLine className="w-3 h-3" />
                </div>
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full border bg-sky-50 dark:bg-sky-950/40 border-sky-400/60 text-sky-500">
                  <RiTimerLine className="w-3 h-3" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground ml-1">← 点击订阅按钮</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2.5">
              <span className="sm:hidden">↑ 点击圆形订阅图标（计时器）</span>
              <span className="hidden sm:inline">↑ 在域名查询结果顶部点击「域名订阅」</span>
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">如何使用</p>
          <div className="grid gap-3">
            {STEPS.map((step, i) => (
              <div key={i} className="glass-panel border border-border rounded-2xl p-4 flex items-start gap-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", step.color)}>
                  <step.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">步骤 {i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: RiMailLine,        title: "邮件提醒", desc: "多个时间节点自动推送" },
            { icon: RiShieldCheckLine, title: "生命周期", desc: "宽限期 / 赎回期全跟踪" },
            { icon: RiTimeLine,        title: "到期日历", desc: "手动修正到期日期" },
            { icon: RiGlobalLine,      title: "多域名",   desc: "同时订阅多个域名" },
          ].map(f => (
            <div key={f.title} className="glass-panel border border-border rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{f.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Existing subscriptions (if logged in) */}
        {status === "authenticated" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">我的订阅</p>
              <Link href="/dashboard" className="text-xs text-primary hover:underline">
                前往用户中心 →
              </Link>
            </div>

            {!(session?.user as any)?.subscriptionAccess && (
              <div className="flex flex-col items-center text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/40 flex items-center justify-center">
                  <RiLockLine className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">需要邀请码</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    域名订阅功能需要邀请码才能使用，请联系管理员获取。
                  </p>
                </div>
              </div>
            )}

            {(session?.user as any)?.subscriptionAccess && (
              <>
                {/* Stats row */}
                {!loadingSubs && subscriptions.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "活跃订阅",   value: activeSubs.length,      color: "text-primary" },
                      { label: "30天内到期", value: expiringSoon.length,    color: expiringSoon.length > 0 ? "text-orange-500" : "text-muted-foreground" },
                      { label: "已发提醒",   value: totalSent,              color: "text-muted-foreground" },
                    ].map(stat => (
                      <div key={stat.label} className="glass-panel border border-border rounded-xl p-3 text-center">
                        <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filter tabs */}
                {!loadingSubs && subscriptions.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {filterTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                          filter === tab.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {tab.label}
                        {tab.count !== undefined && (
                          <span className={cn(
                            "text-[10px] px-1 rounded-full",
                            filter === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {loadingSubs ? (
                  <div className="flex justify-center py-6">
                    <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSubs.length === 0 ? (
                  <div className="glass-panel border border-dashed border-border rounded-2xl p-8 text-center space-y-2">
                    <RiCalendarLine className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {filter === "all"      && (subscriptions.length === 0 ? "暂无活跃订阅" : "暂无活跃订阅")}
                      {filter === "expiring" && "暂无 30 天内到期的域名"}
                      {filter === "expired"  && "暂无已过期的域名"}
                      {filter === "inactive" && "暂无已取消的订阅"}
                    </p>
                    {filter === "all" && subscriptions.length === 0 && (
                      <p className="text-xs text-muted-foreground/60">搜索并订阅你的域名，到期前自动提醒</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSubs.map(sub => {
                      const daysLeft = sub.days_to_expiry ?? getDaysLeft(sub.expiration_date);
                      const isExpired = daysLeft !== null && daysLeft < 0;
                      const isUrgent  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                      const isWarn    = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                      const isInactive = !sub.active;

                      return (
                        <div
                          key={sub.id}
                          className={cn(
                            "glass-panel border rounded-2xl p-4 space-y-2.5",
                            isUrgent  ? "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10" :
                            isExpired ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/20 dark:bg-orange-950/10" :
                            isInactive ? "border-border/50 opacity-60" :
                                         "border-border"
                          )}
                        >
                          {/* Row 1: icon + domain + phase + actions */}
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              isUrgent   ? "bg-red-100 dark:bg-red-950/40" :
                              isExpired  ? "bg-orange-100 dark:bg-orange-950/40" :
                              isInactive ? "bg-muted/40" :
                                           "bg-primary/10"
                            )}>
                              {isUrgent
                                ? <RiAlertLine className="w-4 h-4 text-red-600 dark:text-red-400" />
                                : isExpired
                                  ? <RiAlertLine className="w-4 h-4 text-orange-500" />
                                  : <RiGlobalLine className={cn("w-4 h-4", isInactive ? "text-muted-foreground/50" : "text-primary")} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={cn("text-sm font-semibold font-mono truncate", isInactive && "text-muted-foreground")}>
                                  {sub.domain}
                                </p>
                                <PhaseChip phase={sub.phase} />
                                {isInactive && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">已取消</span>
                                )}
                              </div>
                              <p className={cn(
                                "text-[11px] mt-0.5",
                                isUrgent  ? "text-red-600 dark:text-red-400 font-semibold" :
                                isExpired ? "text-orange-600 dark:text-orange-400 font-semibold" :
                                isWarn    ? "text-amber-600 dark:text-amber-400" :
                                            "text-muted-foreground"
                              )}>
                                {sub.expiration_date
                                  ? daysLeft !== null
                                    ? daysLeft >= 0
                                      ? `还有 ${daysLeft} 天到期 · ${fmt(new Date(sub.expiration_date))}`
                                      : `已于 ${fmt(new Date(sub.expiration_date))} 过期`
                                    : fmt(new Date(sub.expiration_date))
                                  : "到期日期未设置"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Link href={`/${sub.domain}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="查看 WHOIS">
                                <RiExternalLinkLine className="w-3.5 h-3.5" />
                              </Link>
                              {isInactive ? (
                                <button
                                  onClick={() => reactivateSub(sub.id, sub.domain)}
                                  disabled={reactivating === sub.id}
                                  title="重新订阅"
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {reactivating === sub.id
                                    ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                                    : <RiRefreshLine className="w-3.5 h-3.5" />
                                  }
                                </button>
                              ) : (
                                <button
                                  onClick={() => cancelSub(sub.id)}
                                  disabled={cancelling === sub.id}
                                  title="取消订阅"
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  {cancelling === sub.id
                                    ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                                    : <RiDeleteBinLine className="w-3.5 h-3.5" />
                                  }
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Urgency progress bar */}
                          {sub.active && <UrgencyBar daysLeft={daysLeft} phase={sub.phase} />}

                          {/* Row 2: meta chips */}
                          {sub.active && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {sub.next_reminder_at && sub.next_reminder_days !== null && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  <RiBellLine className="w-2.5 h-2.5" />
                                  下次提醒：{sub.next_reminder_days} 天前 · {fmtShort(new Date(sub.next_reminder_at))}
                                </span>
                              )}
                              {sub.last_reminded_at && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  <RiCheckLine className="w-2.5 h-2.5" />
                                  最近提醒：{fmtShort(new Date(sub.last_reminded_at))}
                                </span>
                              )}
                              {sub.sent_keys.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  <RiMailLine className="w-2.5 h-2.5" />
                                  已发 {sub.sent_keys.length} 次
                                </span>
                              )}
                              {sub.phase && sub.phase !== "active" && sub.drop_date && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/30 rounded-full px-2 py-0.5">
                                  <RiInformationLine className="w-2.5 h-2.5" />
                                  预计释放：{fmt(new Date(sub.drop_date))}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Login prompt */}
        {status === "unauthenticated" && (
          <div className="glass-panel border border-primary/20 rounded-2xl p-6 text-center space-y-3">
            <RiShieldCheckLine className="w-8 h-8 text-primary/50 mx-auto" />
            <div>
              <p className="text-sm font-semibold">登录后管理订阅</p>
              <p className="text-xs text-muted-foreground mt-1">登录后可查看所有订阅记录并随时取消</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Link href="/login?callbackUrl=%2Fremind">
                <Button size="sm" className="rounded-xl h-9 gap-1.5 text-xs">
                  登录
                </Button>
              </Link>
              <Link href="/register?callbackUrl=%2Fremind">
                <Button size="sm" variant="outline" className="rounded-xl h-9 gap-1.5 text-xs">
                  注册账号
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
