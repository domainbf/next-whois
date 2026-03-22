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
  RiArrowRightLine, RiCheckLine, RiGlobalLine, RiTimeLine,
  RiLoader4Line, RiDeleteBinLine, RiEdit2Line, RiExternalLinkLine,
  RiArrowLeftLine, RiBellLine, RiAlertLine,
} from "@remixicon/react";

type Subscription = {
  id: string;
  domain: string;
  expiration_date: string | null;
  active: boolean;
  created_at: string;
};

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

function getDaysLeft(expDate: string | null): number | null {
  if (!expDate) return null;
  const diff = new Date(expDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function RemindPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loadingSubs, setLoadingSubs] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "authenticated") {
      setLoadingSubs(true);
      fetch("/api/user/subscriptions")
        .then(r => r.json())
        .then(d => { if (d.subscriptions) setSubscriptions(d.subscriptions); })
        .catch(() => {})
        .finally(() => setLoadingSubs(false));
    }
  }, [status]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/${q}`);
  }

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

  return (
    <>
      <Head>
        <title key="site-title">域名到期提醒订阅 · Next WHOIS</title>
        <meta name="description" content="订阅域名到期提醒，到期前自动发送邮件通知，再也不会忘记续费。" />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RiArrowLeftLine className="w-3.5 h-3.5" />返回 Dashboard
        </Link>

        {/* Hero */}
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <RiCalendarLine className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">域名到期提醒</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            订阅你拥有的域名，到期前 <span className="text-foreground font-semibold">90天、30天、7天、1天</span>
            自动发送提醒邮件，让你有充足时间续费，避免域名丢失。
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
              placeholder="输入你的域名，如 example.com"
              className="h-10 rounded-xl text-sm font-mono flex-1"
              autoComplete="off"
            />
            <Button type="submit" className="h-10 rounded-xl gap-1.5 px-5 shrink-0">
              查询
              <RiArrowRightLine className="w-3.5 h-3.5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">搜索后在域名详情页点击「订阅提醒」按钮完成订阅</p>
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
                {i < STEPS.length - 1 && (
                  <div className="absolute ml-4 mt-9 text-muted-foreground/30 hidden" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: RiMailLine, title: "邮件提醒", desc: "多个时间节点自动推送" },
            { icon: RiShieldCheckLine, title: "生命周期", desc: "宽限期 / 赎回期全跟踪" },
            { icon: RiTimeLine, title: "到期日历", desc: "手动修正到期日期" },
            { icon: RiGlobalLine, title: "多域名", desc: "同时订阅多个域名" },
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
                前往 Dashboard →
              </Link>
            </div>

            {loadingSubs ? (
              <div className="flex justify-center py-6">
                <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.filter(s => s.active).length === 0 ? (
              <div className="glass-panel border border-dashed border-border rounded-2xl p-8 text-center space-y-2">
                <RiCalendarLine className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">暂无活跃订阅</p>
                <p className="text-xs text-muted-foreground/60">搜索并订阅你的域名，到期前自动提醒</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subscriptions.filter(s => s.active).map(sub => {
                  const daysLeft = getDaysLeft(sub.expiration_date);
                  const urgent = daysLeft !== null && daysLeft <= 30;
                  const warn = daysLeft !== null && daysLeft <= 90;
                  return (
                    <div key={sub.id} className="glass-panel border border-border rounded-2xl p-4 flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        urgent ? "bg-red-100 dark:bg-red-950/40" : warn ? "bg-orange-100 dark:bg-orange-950/40" : "bg-primary/10"
                      )}>
                        {urgent
                          ? <RiAlertLine className="w-4 h-4 text-red-600 dark:text-red-400" />
                          : <RiGlobalLine className="w-4 h-4 text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-mono truncate">{sub.domain}</p>
                        <p className={cn("text-[11px] mt-0.5", urgent ? "text-red-600 dark:text-red-400 font-semibold" : warn ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                          {sub.expiration_date
                            ? daysLeft !== null && daysLeft >= 0
                              ? `还有 ${daysLeft} 天到期 · ${fmt(new Date(sub.expiration_date))}`
                              : `已于 ${fmt(new Date(sub.expiration_date))} 过期`
                            : "到期日期未设置"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/${sub.domain}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <RiExternalLinkLine className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => cancelSub(sub.id)}
                          disabled={cancelling === sub.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          {cancelling === sub.id
                            ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                            : <RiDeleteBinLine className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <Link href="/login">
                <Button size="sm" className="rounded-xl h-9 gap-1.5 text-xs">
                  登录
                </Button>
              </Link>
              <Link href="/register">
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
