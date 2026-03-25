import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import en from "../../locales/en.json";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiShieldCheckLine,
  RiCheckLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiAlertLine,
  RiLoader4Line,
  RiRefreshLine,
  RiTimeLine,
  RiWifiLine,
  RiServerLine,
  RiPencilLine,
  RiFlashlightLine,
  RiGlobalLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiCloudLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiLinksLine,
  RiCheckboxCircleLine,
  RiSearchLine,
  RiIdCardLine,
  RiBuildingLine,
  RiAwardLine,
  RiShakeHandsLine,
  RiCodeSLine,
  RiVipCrownLine,
  RiCloseLine,
  RiInformationLine,
} from "@remixicon/react";
import { toast } from "sonner";

const CARD_THEME_OPTIONS: {
  id: string; label: string; hero: string; dot: string;
  shimmer: string; cardBg: string; cardBorder: string; cardText: string; btn: string;
}[] = [
  { id: "app",      label: "极简",  hero: "bg-gradient-to-br from-zinc-700 to-zinc-900",                     dot: "bg-zinc-600",   shimmer: "text-shimmer",       cardBg: "bg-background",  cardBorder: "border-border/50",                             cardText: "text-foreground",  btn: "bg-zinc-800 text-white"  },
  { id: "glow",     label: "流光",  hero: "bg-gradient-to-br from-teal-400 to-teal-600",                     dot: "bg-teal-500",   shimmer: "text-shimmer",       cardBg: "bg-background",  cardBorder: "border-teal-200/60 dark:border-teal-800/40",   cardText: "text-foreground",  btn: "bg-teal-500 text-white"  },
  { id: "midnight", label: "午夜",  hero: "bg-gradient-to-br from-slate-700 via-blue-900 to-slate-900",      dot: "bg-blue-700",   shimmer: "text-shimmer-white", cardBg: "bg-slate-900",   cardBorder: "border-slate-700",                             cardText: "text-white",       btn: "bg-blue-600 text-white"  },
  { id: "aurora",   label: "极光",  hero: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-400",   dot: "bg-fuchsia-500",shimmer: "text-shimmer",       cardBg: "bg-background",  cardBorder: "border-violet-200/60 dark:border-violet-800/40",cardText: "text-foreground",  btn: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white" },
  { id: "solar",    label: "暖阳",  hero: "bg-gradient-to-br from-amber-400 to-orange-600",                  dot: "bg-orange-500", shimmer: "text-shimmer",       cardBg: "bg-background",  cardBorder: "border-amber-200/60 dark:border-amber-800/40", cardText: "text-foreground",  btn: "bg-orange-500 text-white" },
  { id: "ink",      label: "墨染",  hero: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",           dot: "bg-zinc-800",   shimmer: "text-shimmer-white", cardBg: "bg-zinc-950",    cardBorder: "border-zinc-800",                              cardText: "text-white",       btn: "bg-zinc-700 text-white"  },
];

const TAG_STYLES: { id: string; label: string; zhName: string; className: string; glow?: string; icon: React.ElementType; theme: string }[] = [
  { id: "personal",  label: "Personal",  zhName: "个人",   icon: RiIdCardLine,      className: "bg-zinc-800 text-white border-0",                                                    glow: "shadow-zinc-700/50",   theme: "app"      },
  { id: "official",  label: "Official",  zhName: "官方",   icon: RiBuildingLine,    className: "bg-blue-700 text-white border-0",                                                    glow: "shadow-blue-600/50",   theme: "midnight" },
  { id: "brand",     label: "Brand",     zhName: "品牌",   icon: RiAwardLine,       className: "bg-violet-600 text-white border-0",                                                  glow: "shadow-violet-500/50", theme: "aurora"   },
  { id: "verified",  label: "Verified",  zhName: "认证",   icon: RiShieldCheckLine, className: "bg-emerald-500 text-white border-0",                                                 glow: "shadow-emerald-500/50",theme: "glow"     },
  { id: "partner",   label: "Partner",   zhName: "合作",   icon: RiShakeHandsLine,  className: "bg-orange-500 text-white border-0",                                                  glow: "shadow-orange-500/50", theme: "solar"    },
  { id: "dev",       label: "Developer", zhName: "开发",   icon: RiCodeSLine,       className: "bg-slate-800 text-white border border-slate-600/60",                                 glow: "shadow-slate-700/50",  theme: "midnight" },
  { id: "warning",   label: "Warning",   zhName: "警示",   icon: RiAlertLine,       className: "bg-amber-500 text-white border-0",                                                   glow: "shadow-amber-400/50",  theme: "solar"    },
  { id: "premium",   label: "Premium",   zhName: "尊享",   icon: RiVipCrownLine,    className: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white border-0",               glow: "shadow-fuchsia-500/50",theme: "aurora"   },
];

function TagBadge({ tagName, tagStyle, live = false }: { tagName: string; tagStyle: string; live?: boolean }) {
  const style = TAG_STYLES.find((s) => s.id === tagStyle) || TAG_STYLES[0];
  const Icon = style.icon;
  return (
    <span className={cn(
      "relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold overflow-hidden select-none",
      style.className,
      live && style.glow && `shadow-md ${style.glow}`,
    )}>
      <span className="shrink-0 text-white/90">
        <Icon className="w-3 h-3" />
      </span>
      <span>{tagName || style.label}</span>
      {live && style.glow && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%)" }}
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
        />
      )}
    </span>
  );
}

type Step = "form" | "verify" | "done";

interface StampSession {
  step: Step;
  form: { tagName: string; tagStyle: string; cardTheme: string; link: string; description: string; nickname: string; email: string };
  submitResult: { id: string; txtRecord: string; txtValue: string } | null;
}

function getSessionKey(domain: string) { return `stamp_session_${domain}`; }

function loadSession(domain: string): StampSession | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(getSessionKey(domain)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function saveSession(domain: string, data: StampSession) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(getSessionKey(domain), JSON.stringify(data)); } catch {}
}

function clearSession(domain: string) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(getSessionKey(domain)); } catch {}
}

function loadUserPrefs(): { nickname: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem("stamp_user_prefs"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function saveUserPrefs(nickname: string, email: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("stamp_user_prefs", JSON.stringify({ nickname, email })); } catch {}
}

const STEP_LABELS: { key: Step }[] = [
  { key: "form" },
  { key: "verify" },
  { key: "done" },
];

const stepIndex = (step: Step) => STEP_LABELS.findIndex((s) => s.key === step);

const HOW_TO_STEPS = [
  { icon: RiPencilLine, color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: RiServerLine, color: "text-sky-500", bg: "bg-sky-500/10" },
  { icon: RiFlashlightLine, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32, filter: "blur(3px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32, filter: "blur(3px)" }),
};

// Progressive backoff schedule (seconds between each auto-check):
// 30s → 1m → 2m → 5m → 10m → 15m → 20m  ≈ 53 min total, 7 auto-checks
const POLL_SCHEDULE = [30, 60, 120, 300, 600, 900, 1200] as const;
const AUTO_POLL_SEC = POLL_SCHEDULE[0];

type StampKey = keyof (typeof en)["stamp"];

const HOW_STEP_TITLE_KEYS: StampKey[] = ["how_step1_title", "how_step2_title", "how_step3_title"];
const HOW_STEP_DESC_KEYS: StampKey[] = ["how_step1_desc", "how_step2_desc", "how_step3_desc"];
// ── No-domain landing page ─────────────────────────────────────────────────────
function StampLandingPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [query, setQuery] = React.useState("");
  const [myStamps, setMyStamps] = React.useState<{
    id: string; domain: string; tag_name: string; tag_style: string;
    verified: boolean; created_at: string; verified_at: string | null;
    link: string | null; nickname: string;
  }[]>([]);
  const [stampsLoading, setStampsLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authStatus === "authenticated") {
      setStampsLoading(true);
      fetch("/api/user/stamps")
        .then(r => r.json())
        .then(d => { if (d.stamps) setMyStamps(d.stamps); })
        .catch(() => {})
        .finally(() => setStampsLoading(false));
    }
  }, [authStatus]);

  async function deleteStamp(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/user/stamps?id=${id}`, { method: "DELETE" });
      setMyStamps(prev => prev.filter(s => s.id !== id));
      toast.success("已删除认领记录");
    } catch {
      toast.error("删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/stamp?domain=${encodeURIComponent(q)}`);
  }

  const steps = [
    {
      icon: RiSearchLine,
      color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      title: "搜索你的域名",
      desc: "在首页搜索框或下方输入框中输入你拥有的域名",
    },
    {
      icon: RiShieldCheckLine,
      color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
      title: "点击「品牌认领」按钮",
      desc: "在域名 WHOIS 详情页顶部，找到紫色盾牌按钮并点击",
    },
    {
      icon: RiWifiLine,
      color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
      title: "完成 DNS / 文件验证",
      desc: "添加 TXT 记录或上传验证文件，证明你是域名所有者",
    },
    {
      icon: RiCheckboxCircleLine,
      color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      title: "获得品牌认证标签",
      desc: "验证通过后，WHOIS 查询页将显示你的品牌名称和认证标签",
    },
  ];

  const verifiedStamps = myStamps.filter(s => s.verified);
  const pendingStamps = myStamps.filter(s => !s.verified);

  return (
    <>
      <Head>
        <title key="site-title">品牌认领 · Next WHOIS</title>
        <meta name="description" content="认领你拥有的域名，在 WHOIS 查询结果中展示你的品牌信息。" />
      </Head>
      <div className="max-w-lg mx-auto px-4 py-8 pb-10 space-y-6">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RiArrowLeftLine className="w-3.5 h-3.5" />返回用户中心
        </Link>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-violet-200/40 dark:border-violet-800/30">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-fuchsia-500/5 dark:from-violet-500/15 dark:to-fuchsia-500/8" />
          <div className="relative px-5 py-5 flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-300/30 dark:border-violet-700/40 flex items-center justify-center">
              <RiShieldCheckLine className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold">品牌认领</h1>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                认领你拥有的域名，在 WHOIS 查询结果中<br />展示你的品牌名称和认证标签
              </p>
            </div>
          </div>
        </div>

        {/* My claims — authenticated users */}
        {authStatus === "authenticated" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">我的认领</p>
              {myStamps.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {verifiedStamps.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <RiCheckLine className="w-3 h-3" />{verifiedStamps.length} 已认证
                    </span>
                  )}
                  {pendingStamps.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <RiTimeLine className="w-3 h-3" />{pendingStamps.length} 待验证
                    </span>
                  )}
                </div>
              )}
            </div>

            {stampsLoading ? (
              <div className="flex justify-center py-6">
                <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : myStamps.length === 0 ? (
              <div className="glass-panel border border-dashed border-border rounded-2xl p-6 text-center space-y-2">
                <RiAwardLine className="w-7 h-7 text-muted-foreground/25 mx-auto" />
                <p className="text-sm text-muted-foreground">暂无认领记录</p>
                <p className="text-xs text-muted-foreground/60">搜索并认领你的域名，在 WHOIS 结果中展示品牌</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myStamps.map(stamp => (
                  <div
                    key={stamp.id}
                    className={cn(
                      "glass-panel border rounded-2xl p-4 flex items-center gap-3",
                      stamp.verified ? "border-border" : "border-amber-200/60 dark:border-amber-800/40 bg-amber-50/20 dark:bg-amber-950/10"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      stamp.verified ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-amber-100 dark:bg-amber-950/40"
                    )}>
                      {stamp.verified
                        ? <RiCheckLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <RiTimeLine className="w-4 h-4 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold font-mono truncate">{stamp.domain}</p>
                        <TagBadge tagName={stamp.tag_name} tagStyle={stamp.tag_style} live={stamp.verified} />
                      </div>
                      <p className="text-[11px] mt-0.5 text-muted-foreground">
                        {stamp.verified
                          ? `已认证 · ${stamp.verified_at ? new Date(stamp.verified_at).toLocaleDateString("zh-CN") : ""}`
                          : "待验证 · 点击「继续」完成 DNS 验证"
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {stamp.verified ? (
                        <Link
                          href={`/${stamp.domain}`}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="查看 WHOIS"
                        >
                          <RiExternalLinkLine className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/stamp?domain=${encodeURIComponent(stamp.domain)}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          继续验证
                        </Link>
                      )}
                      <button
                        onClick={() => deleteStamp(stamp.id)}
                        disabled={deletingId === stamp.id}
                        title="删除"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        {deletingId === stamp.id
                          ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                          : <RiDeleteBinLine className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Login prompt for unauthenticated */}
        {authStatus === "unauthenticated" && (
          <div className="glass-panel border border-violet-200/40 dark:border-violet-800/30 rounded-2xl p-5 text-center space-y-3">
            <RiShieldCheckLine className="w-7 h-7 text-violet-500/50 mx-auto" />
            <div>
              <p className="text-sm font-semibold">登录后管理认领记录</p>
              <p className="text-xs text-muted-foreground mt-1">登录后可查看所有认领记录并管理验证状态</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Link href="/login?callbackUrl=%2Fstamp">
                <Button size="sm" className="rounded-xl h-9 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700">
                  登录
                </Button>
              </Link>
              <Link href="/register?callbackUrl=%2Fstamp">
                <Button size="sm" variant="outline" className="rounded-xl h-9 gap-1.5 text-xs">
                  注册账号
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Visual mockup — shows where to click */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">在这里找到入口</p>
          <div className="relative rounded-2xl border border-border bg-muted/10 p-4">
            <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 bg-muted/60 px-2 py-0.5 rounded-full">预览</span>
            {/* Mini domain card replica */}
            <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">DOMAIN</p>
                <p className="text-sm font-bold font-mono tracking-tight">EXAMPLE.COM</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                  </span>
                  <span className="text-[10px] text-muted-foreground">⏱ 2 years</span>
                </div>
              </div>
              <div className="px-4 pb-3.5 flex items-center gap-2">
                {/* Highlighted claim button */}
                <div className="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-violet-100 dark:bg-violet-950/50 border-violet-400/70 text-violet-600 dark:text-violet-400 shadow-sm ring-2 ring-violet-400/20">
                  <RiShieldCheckLine className="w-3 h-3" />
                  品牌认领
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-muted/40 border-border/50 text-muted-foreground/50">
                  <RiTimeLine className="w-3 h-3" />
                  域名订阅
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2.5">↑ 在域名查询结果顶部点击「品牌认领」</p>
          </div>
        </div>

        {/* Search to enter flow */}
        <div className="border border-border rounded-2xl p-4 space-y-3 bg-muted/10">
          <div className="flex items-center gap-2">
            <RiSearchLine className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">直接输入域名开始认领</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="输入你的域名，如 x.rw"
              className="h-10 rounded-xl text-sm font-mono flex-1"
              autoComplete="off"
            />
            <Button type="submit" className="h-10 rounded-xl gap-1.5 px-4 shrink-0">
              认领
              <RiArrowRightLine className="w-3.5 h-3.5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">将跳转到该域名的品牌认领流程</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">如何使用</p>
          <div className="grid gap-2.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", step.color)}>
                  <step.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">步骤 {i + 1}</span>
                  </div>
                  <p className="text-xs font-semibold">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40">
          <RiAlertLine className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            品牌认领需通过 DNS TXT 记录或指定文件路径验证，以确认域名归属权。验证过程通常在几分钟内完成。
          </p>
        </div>
      </div>
    </>
  );
}

export default function StampPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { t, locale } = useTranslation();
  const isZh = locale.startsWith("zh");
  const s = (key: StampKey, params?: Record<string, string | number>) =>
    t(`stamp.${key}` as TranslationKey, params);

  const domain = String(router.query.domain || "");

  // Redirect unauthenticated users to login only when a domain is specified.
  React.useEffect(() => {
    if (authStatus === "unauthenticated" && domain) {
      const callbackUrl = `/stamp?domain=${encodeURIComponent(domain)}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [authStatus, domain, router]);

  const defaultForm = { tagName: "", tagStyle: "personal", cardTheme: "app", link: "", description: "", nickname: "", email: "" };

  const [hydrated, setHydrated] = React.useState(false);
  const [existingStamps, setExistingStamps] = React.useState<{ id: string; tagName: string; tagStyle: string; nickname: string }[]>([]);
  const [existingExpanded, setExistingExpanded] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [direction, setDirection] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);
  const [submitResult, setSubmitResult] = React.useState<{ id: string; txtRecord: string; txtValue: string } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [verifyState, setVerifyState] = React.useState<"idle" | "loading" | "fail" | "dnsError" | "nearMatch" | "giveUp">("idle");
  const [pollAttempt, setPollAttempt] = React.useState(0);
  const pollAttemptRef = React.useRef(0);
  const notifiedRef = React.useRef(false);
  const [resolvers, setResolvers] = React.useState<{ name: string; proto?: string; latencyMs: number; found: boolean; nearMatch?: boolean; records: string[]; error: string | null }[]>([]);
  const [anyNearMatch, setAnyNearMatch] = React.useState(false);
  const [anyRecordFound, setAnyRecordFound] = React.useState(false);
  const [udpBlocked, setUdpBlocked] = React.useState(false);
  const [expectedVal, setExpectedVal] = React.useState<string | null>(null);
  const [httpCheck, setHttpCheck] = React.useState<{ found: boolean; latencyMs: number; error: string | null; url: string; nearMatch?: boolean } | null>(null);
  const [verifyTab, setVerifyTab] = React.useState<"dns" | "http" | "vercel">("dns");
  const [quickTxtLoading, setQuickTxtLoading] = React.useState(false);
  const [quickTxtResult, setQuickTxtResult] = React.useState<{ found: boolean; flat: string[]; records: string[][]; latencyMs: number; tokenFound?: boolean; resolvers: { name: string; proto?: string; records: string[][]; flat?: string[]; latencyMs: number; error?: string | null }[] } | null>(null);
  const [countdown, setCountdown] = React.useState(0);
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Vercel verification state ──
  const [vercelTxtValue, setVercelTxtValue] = React.useState<string | null>(null);
  const [vercelTxtFullDomain, setVercelTxtFullDomain] = React.useState<string | null>(null);
  const [vercelApiError, setVercelApiError] = React.useState<string | null>(null);
  const [vercelInitLoading, setVercelInitLoading] = React.useState(false);
  const [vercelCheckLoading, setVercelCheckLoading] = React.useState(false);
  const [vercelCheckAttempt, setVercelCheckAttempt] = React.useState(0);
  const [vercelCountdown, setVercelCountdown] = React.useState(0);
  const vercelPollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const vercelCountdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Style preview state ──
  const [previewStyleId, setPreviewStyleId] = React.useState<string | null>(null);

  // ── Guide tutorial state ──
  const GUIDE_KEY = "stamp_guide_seen";
  const [showGuide, setShowGuide] = React.useState(false);
  React.useEffect(() => {
    if (!hydrated) return;
    if (!localStorage.getItem(GUIDE_KEY)) setShowGuide(true);
  }, [hydrated]);
  function dismissGuide() {
    setShowGuide(false);
    localStorage.setItem(GUIDE_KEY, "1");
  }

  function goToStep(next: Step) {
    setDirection(stepIndex(next) > stepIndex(step) ? 1 : -1);
    setStep(next);
  }

  React.useEffect(() => {
    if (!domain || hydrated) return;
    const saved = loadSession(domain);
    const prefs = loadUserPrefs();
    if (saved) {
      const restoredStep = saved.step === "done" ? "form" : saved.step;
      setStep(restoredStep);
      const restoredForm = saved.form || defaultForm;
      // Fallback: fill email/nickname from global prefs if the saved form is missing them
      if (!restoredForm.email && prefs?.email) restoredForm.email = prefs.email;
      if (!restoredForm.nickname && prefs?.nickname) restoredForm.nickname = prefs.nickname;
      setForm(restoredForm);
      setSubmitResult(saved.submitResult || null);
    } else if (prefs) {
      // No domain session but we have saved user prefs — prefill contact info
      setForm(prev => ({
        ...prev,
        nickname: prefs.nickname || prev.nickname,
        email: prefs.email || prev.email,
      }));
    }
    setHydrated(true);
  }, [domain]);

  React.useEffect(() => {
    if (!domain || !hydrated) return;
    if (step === "done") { clearSession(domain); return; }
    saveSession(domain, { step, form, submitResult });
  }, [step, form, submitResult, domain, hydrated]);

  // Prefill email from NextAuth session if not already set
  const sessionUserEmail = session?.user?.email ?? null;
  React.useEffect(() => {
    if (!hydrated || !sessionUserEmail) return;
    setForm(prev => ({ ...prev, email: prev.email || sessionUserEmail }));
  }, [hydrated, sessionUserEmail]);

  React.useEffect(() => {
    if (!domain) return;
    fetch(`/api/stamp/check?domain=${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.stamps)) setExistingStamps(data.stamps); })
      .catch(() => {});
  }, [domain]);

  function goBack() {
    clearSession(domain);
    stopPolling();
    if (window.history.length > 1) router.back();
    else router.push(domain ? `/${domain}` : "/");
  }

  function update(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "tagStyle") {
        const ts = TAG_STYLES.find(s => s.id === value);
        if (ts) next.cardTheme = ts.theme;
      }
      return next;
    });
    if (formError) setFormError(null);
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.tagName.trim()) {
      setFormError(s("err_tag_name"));
      return;
    }
    if (!form.nickname.trim()) {
      setFormError(s("err_nickname"));
      return;
    }
    if (!form.email.trim()) {
      setFormError(s("err_email_empty"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError(s("err_email_invalid"));
      return;
    }
    let cleanLink = form.link.trim();
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) {
      cleanLink = `https://${cleanLink}`;
    }
    if (cleanLink && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(cleanLink)) {
      setFormError(s("err_link_invalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stamp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, ...form, link: cleanLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      saveUserPrefs(form.nickname.trim(), form.email.trim());
      setSubmitResult({ id: data.id, txtRecord: data.txtRecord, txtValue: data.txtValue });
      goToStep("verify");
    } catch (err: any) {
      const msg = err?.message || "";
      const isSafeMsg = /[\u4e00-\u9fa5]/.test(msg);
      setFormError(isSafeMsg ? msg : s("err_submit_failed"));
    } finally {
      setLoading(false);
    }
  }

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(0);
  }

  function startCountdown(sec: number, onDone: () => void) {
    stopPolling();
    setCountdown(sec);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); countdownRef.current = null; return 0; }
        return c - 1;
      });
    }, 1000);
    pollRef.current = setTimeout(onDone, sec * 1000);
  }

  async function handleQuickTxt() {
    if (!submitResult) return;
    setQuickTxtLoading(true);
    setQuickTxtResult(null);
    try {
      const res = await fetch(`/api/dns/records?name=${encodeURIComponent(submitResult.txtRecord)}&type=TXT`);
      const data = await res.json();
      // Check if our verification token is present in the results
      const expectedValue = submitResult.txtValue;
      const tokenFound = (data.flat as string[] || []).some(
        (r: string) => r === expectedValue || r.includes(expectedValue)
      );
      setQuickTxtResult({ ...data, tokenFound });
      // Auto-trigger full verification if token is detected
      if (tokenFound) {
        setTimeout(() => handleVerify(false), 300);
      }
    } catch {
      setQuickTxtResult({ found: false, flat: [], records: [], latencyMs: 0, resolvers: [] });
    } finally {
      setQuickTxtLoading(false);
    }
  }

  const handleVerify = React.useCallback(async (silent = false) => {
    if (!submitResult) return;
    // Manual trigger resets the backoff counter
    if (!silent) {
      pollAttemptRef.current = 0;
      setPollAttempt(0);
    }
    setVerifyState("loading");
    stopPolling();

    function scheduleNext() {
      const attempt = pollAttemptRef.current;
      if (attempt < POLL_SCHEDULE.length) {
        pollAttemptRef.current = attempt + 1;
        setPollAttempt(attempt + 1);
        startCountdown(POLL_SCHEDULE[attempt], () => handleVerify(true));
      } else {
        setVerifyState("giveUp");
        setCountdown(0);
        // Send one-time email notification (fire-and-forget, no retry)
        if (!notifiedRef.current && submitResult) {
          notifiedRef.current = true;
          fetch("/api/stamp/giveup-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: submitResult.id, domain, appUrl: typeof window !== "undefined" ? window.location.origin : "" }),
          }).catch(() => {});
        }
      }
    }

    try {
      const res = await fetch("/api/stamp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submitResult.id, domain }),
      });
      const data = await res.json();
      if (data.resolvers) setResolvers(data.resolvers);
      if (data.httpCheck) setHttpCheck(data.httpCheck);
      if (data.anyNearMatch !== undefined) setAnyNearMatch(data.anyNearMatch);
      if (data.anyRecordFound !== undefined) setAnyRecordFound(data.anyRecordFound);
      if (data.udpBlocked !== undefined) setUdpBlocked(data.udpBlocked);
      if (data.expected) setExpectedVal(data.expected);
      if (data.verified) {
        goToStep("done");
        setVerifyState("idle");
        return;
      } else if (data.anyNearMatch) {
        setVerifyState("nearMatch");
      } else if (data.dnsError) {
        setVerifyState("dnsError");
      } else {
        setVerifyState("fail");
      }
      scheduleNext();
    } catch {
      setVerifyState("fail");
      scheduleNext();
    }
  }, [submitResult, domain]);

  React.useEffect(() => {
    if (step === "verify" && submitResult) {
      // Don't verify immediately — give user time to set up the DNS record first.
      // Start a countdown and only verify after POLL_SCHEDULE[0] seconds.
      pollAttemptRef.current = 0;
      setPollAttempt(0);
      setVerifyState("idle");
      startCountdown(POLL_SCHEDULE[0], () => handleVerify(true));
    }
    return () => stopPolling();
  }, [step, submitResult?.id]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(s("copied")));
  }

  // ── Vercel verification helpers ──────────────────────────────────────────

  function stopVercelPolling() {
    if (vercelPollRef.current) { clearTimeout(vercelPollRef.current); vercelPollRef.current = null; }
    if (vercelCountdownRef.current) { clearInterval(vercelCountdownRef.current); vercelCountdownRef.current = null; }
    setVercelCountdown(0);
  }

  function startVercelCountdown(sec: number, onDone: () => void) {
    stopVercelPolling();
    setVercelCountdown(sec);
    vercelCountdownRef.current = setInterval(() => {
      setVercelCountdown(c => {
        if (c <= 1) { clearInterval(vercelCountdownRef.current!); vercelCountdownRef.current = null; return 0; }
        return c - 1;
      });
    }, 1000);
    vercelPollRef.current = setTimeout(onDone, sec * 1000);
  }

  const VERCEL_POLL_SCHEDULE = [30, 60, 120, 300, 600] as const;

  async function initVercelVerify() {
    if (!submitResult) return;
    setVercelInitLoading(true);
    setVercelApiError(null);
    setVercelTxtValue(null);
    setVercelTxtFullDomain(null);
    try {
      const res = await fetch("/api/vercel/add-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, stampId: submitResult.id }),
      });
      const data = await res.json();
      if (data.verified) { goToStep("done"); return; }
      if (data.apiError) { setVercelApiError(data.apiError); return; }
      setVercelTxtValue(data.txtValue ?? null);
      setVercelTxtFullDomain(data.txtFullDomain ?? `_vercel.${domain}`);
    } catch {
      setVercelApiError("网络错误，请重试");
    } finally {
      setVercelInitLoading(false);
    }
  }

  const handleVercelCheck = React.useCallback(async (silent = false) => {
    if (!submitResult) return;
    setVercelCheckLoading(true);
    stopVercelPolling();
    try {
      const res = await fetch("/api/vercel/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, stampId: submitResult.id }),
      });
      const data = await res.json();
      if (data.verified) { goToStep("done"); return; }
      // Schedule next auto-check
      const attempt = vercelCheckAttempt;
      if (!silent) { setVercelCheckAttempt(0); }
      const nextAttempt = silent ? attempt + 1 : 1;
      setVercelCheckAttempt(nextAttempt);
      if (nextAttempt < VERCEL_POLL_SCHEDULE.length) {
        startVercelCountdown(VERCEL_POLL_SCHEDULE[nextAttempt - 1 < VERCEL_POLL_SCHEDULE.length ? nextAttempt - 1 : VERCEL_POLL_SCHEDULE.length - 1], () => handleVercelCheck(true));
      }
    } catch {
      // silently fail, let user retry manually
    } finally {
      setVercelCheckLoading(false);
    }
  }, [submitResult, domain, vercelCheckAttempt]);

  // Auto-init when switching to Vercel tab
  React.useEffect(() => {
    if (verifyTab === "vercel" && submitResult && !vercelTxtValue && !vercelInitLoading && !vercelApiError) {
      initVercelVerify();
    }
    if (verifyTab !== "vercel") {
      stopVercelPolling();
    }
  }, [verifyTab, submitResult?.id]);

  // No domain specified — show a rich landing/guide page (handles own auth state)
  if (!domain) {
    return <StampLandingPage />;
  }

  // Don't render the claim flow while checking auth or redirecting (domain-specific).
  if (authStatus === "loading" || authStatus === "unauthenticated") {
    return null;
  }

  return (
    <>
      <Head>
        <title key="site-title">{`${s("title")} · ${domain}`}</title>
      </Head>

      <div className="min-h-[calc(100vh-64px)] bg-background">
        <div className="max-w-lg mx-auto px-4 py-5 pb-10">

          {/* Back nav */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <RiArrowLeftLine className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              {s("back")}
            </button>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-sm font-mono text-muted-foreground/80">{domain}</span>
          </div>

          {/* Skeleton while restoring session */}
          {!hydrated && (
            <div className="space-y-3 animate-pulse">
              <div className="h-28 rounded-2xl bg-muted/50" />
              <div className="h-8 rounded-lg bg-muted/30 w-2/3 mx-auto" />
              <div className="h-48 rounded-2xl bg-muted/40" />
              <div className="h-12 rounded-xl bg-muted/35" />
            </div>
          )}

          {hydrated && (
            <>
              {/* Compact header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <RiShieldCheckLine className="w-4 h-4 text-violet-500 shrink-0" />
                  <h1 className="text-sm font-bold text-foreground">{s("title")}</h1>
                  {step !== "done" && (
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                      · {s("step", { current: stepIndex(step) + 1 })}
                    </span>
                  )}
                </div>
                {step === "form" && (
                  <button
                    type="button"
                    onClick={() => setShowGuide(true)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/60"
                  >
                    <RiInformationLine className="w-3.5 h-3.5" />
                    {isZh ? "使用说明" : "How it works"}
                  </button>
                )}
              </div>

              {/* Step indicator */}
              {step !== "done" && (
                <div className="flex items-center mb-5 px-1">
                  {STEP_LABELS.filter(s => s.key !== "done").map((s, i) => {
                    const cur = stepIndex(step);
                    const isActive = s.key === step;
                    const isDone = i < cur;
                    return (
                      <React.Fragment key={s.key}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                            isActive ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30"
                              : isDone ? "bg-emerald-500 text-white"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {isDone ? <RiCheckLine className="w-3 h-3" /> : i + 1}
                          </div>
                              <span className={cn(
                            "text-xs font-medium transition-colors",
                            isActive ? "text-foreground" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          )}>
                            {t(`stamp.step_${s.key}`)}
                          </span>
                        </div>
                        {i < STEP_LABELS.filter(s => s.key !== "done").length - 1 && (
                          <div className={cn("flex-1 h-px mx-2 transition-colors", isDone ? "bg-emerald-400/60" : "bg-border")} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Animated step content */}
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                >
                  {/* ── STEP 1: FORM ── */}
                  {step === "form" && (
                    <div className="space-y-4">
                      {/* Existing stamps notice */}
                      {existingStamps.length > 0 && (
                        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                          <button
                            type="button"
                            onClick={() => setExistingExpanded(!existingExpanded)}
                            className="flex items-center justify-between w-full"
                          >
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {s("existing_count", { count: existingStamps.length })}
                            </span>
                            <span className="text-[10px] text-amber-600/70">
                              {existingExpanded ? s("existing_collapse") : s("existing_expand")}
                            </span>
                          </button>
                          {existingExpanded && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {existingStamps.map((st) => (
                                <TagBadge key={st.id} tagName={st.tagName} tagStyle={st.tagStyle} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Form card */}
                      <div className="space-y-4">
                        <div className="glass-panel border border-border rounded-2xl p-5 space-y-5">

                          {/* Domain field */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{s("domain_label")}</Label>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60">
                              <RiGlobalLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-mono text-foreground">{domain}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5">{s("domain_hint")}</p>
                          </div>

                          <div className="h-px bg-border/50" />

                          {/* Tag name */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                              {s("tag_name_label")} <span className="text-red-500 normal-case tracking-normal font-normal">*</span>
                            </Label>
                            <Input
                              value={form.tagName}
                              onChange={(e) => update("tagName", e.target.value)}
                              placeholder={s("tag_name_placeholder")}
                              maxLength={20}
                            />
                          </div>

                          {/* Unified style picker */}
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{s("tag_style_label")}</Label>
                              <span className="text-[10px] text-muted-foreground/50">{isZh ? "点击预览效果" : "Tap to preview"}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {TAG_STYLES.map((ts) => {
                                const cardTheme = CARD_THEME_OPTIONS.find(t => t.id === ts.theme) || CARD_THEME_OPTIONS[0];
                                const isSelected = form.tagStyle === ts.id;
                                const Icon = ts.icon;
                                return (
                                  <button
                                    key={ts.id}
                                    type="button"
                                    onClick={() => {
                                      update("tagStyle", ts.id);
                                      setPreviewStyleId(ts.id);
                                    }}
                                    className={cn(
                                      "relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all text-left group",
                                      isSelected
                                        ? "border-violet-400 dark:border-violet-500 shadow-sm"
                                        : "border-border/50 hover:border-border"
                                    )}
                                  >
                                    {/* Gradient swatch */}
                                    <div className={cn("relative h-14 w-full flex items-center justify-center overflow-hidden", cardTheme.hero)}>
                                      <div className="absolute inset-0 opacity-[0.07]"
                                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "10px 10px" }} />
                                      <div className={cn(
                                        "relative flex items-center justify-center w-8 h-8 rounded-xl shadow-md border border-white/20",
                                        "bg-white/20"
                                      )}>
                                        <Icon className="w-4 h-4 text-white drop-shadow" />
                                      </div>
                                      {isSelected && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center shadow">
                                          <RiCheckLine className="w-2.5 h-2.5 text-violet-600" />
                                        </div>
                                      )}
                                    </div>
                                    {/* Label row */}
                                    <div className={cn("px-2 py-1.5 text-center", isSelected ? "bg-violet-50/60 dark:bg-violet-950/30" : "bg-background")}>
                                      <p className={cn("text-[11px] font-semibold leading-none", isSelected ? "text-violet-600 dark:text-violet-400" : "text-foreground/80")}>
                                        {isZh ? ts.zhName : ts.label}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Link (optional) */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                              {s("link_label")} <span className="normal-case tracking-normal font-normal text-muted-foreground/60">{s("optional")}</span>
                            </Label>
                            <Input
                              value={form.link}
                              onChange={(e) => update("link", e.target.value)}
                              placeholder="https://x.rw"
                              type="text"
                              inputMode="url"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <div className="flex items-baseline justify-between mb-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                {s("desc_label")} <span className="normal-case tracking-normal font-normal text-muted-foreground/60">{s("optional")}</span>
                              </Label>
                              <span className={cn("text-[10px] tabular-nums", form.description.length >= 270 ? "text-red-500 font-semibold" : "text-muted-foreground/50")}>{form.description.length}/300</span>
                            </div>
                            <textarea
                              value={form.description}
                              onChange={(e) => update("description", e.target.value)}
                              placeholder={s("desc_placeholder")}
                              maxLength={300}
                              rows={2}
                              className="w-full text-base sm:text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 transition-shadow placeholder:text-muted-foreground/50"
                            />
                          </div>

                          {/* Live mini card preview */}
                          {(() => {
                            if (!form.tagName) return null;
                            const curTheme = CARD_THEME_OPTIONS.find(t => t.id === form.cardTheme) || CARD_THEME_OPTIONS[0];
                            const styleObj = TAG_STYLES.find(ts => ts.id === form.tagStyle) || TAG_STYLES[0];
                            const CurIcon = styleObj.icon;
                            const stampLabels: Record<string, string> = {
                              personal: "个人认领", official: "官方认证", brand: "品牌认领",
                              verified: "已认证",   partner: "合作伙伴", dev: "开发者",
                              warning:  "注意",     premium: "高级认证",
                            };
                            const badgeLabel = stampLabels[form.tagStyle] ?? "已认领";
                            return (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70">{s("live_preview")}</span>
                                  <div className="flex-1 h-px bg-violet-200/40 dark:bg-violet-800/30" />
                                </div>
                                <div className="rounded-[18px] overflow-hidden border border-border/40 shadow-md">
                                  {/* Hero */}
                                  <div className={cn("relative px-3 pt-4 pb-7 text-center select-none overflow-hidden", curTheme.hero)}>
                                    <div className="absolute inset-0 opacity-[0.06]"
                                      style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                                    <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/30 to-transparent" />
                                    <div className="relative flex flex-col items-center gap-1.5">
                                      <div className="relative flex items-center justify-center">
                                        <div className="absolute w-12 h-12 rounded-2xl bg-white/10 blur-md" />
                                        <div className="relative w-10 h-10 rounded-[13px] bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                                          <CurIcon className="w-5 h-5 text-white drop-shadow" />
                                        </div>
                                      </div>
                                      <p className="text-shimmer-white text-[9px] font-mono tracking-[0.2em] uppercase">
                                        {domain || "your-domain.com"}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Floating card — info only */}
                                  <div className={cn("relative -mt-4 mx-2.5 rounded-[14px] border shadow-lg px-3 pt-2.5 pb-2.5", curTheme.cardBg, curTheme.cardBorder)}>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className={cn("text-[13px] font-black leading-tight tracking-tight", curTheme.shimmer)}>
                                        {form.tagName}
                                      </span>
                                      <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5", styleObj.className)}>
                                        <RiShieldCheckLine className="w-2 h-2" />
                                        {badgeLabel}
                                      </span>
                                    </div>
                                    {form.description && (
                                      <p className={cn("text-[10px] leading-relaxed mt-1.5", curTheme.cardText === "text-white" ? "text-white/60" : "text-muted-foreground")}>
                                        {form.description}
                                      </p>
                                    )}
                                  </div>
                                  {/* CTA — primary action, outside card */}
                                  <div className="px-2.5 pt-2 pb-3">
                                    {form.link ? (() => {
                                      let h = form.link;
                                      try { h = new URL(form.link).hostname; } catch {}
                                      return (
                                        <div className={cn("flex items-center justify-between w-full px-3 py-2 rounded-xl", curTheme.btn)}>
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold leading-none">访问主页</span>
                                            <span className="text-[8px] font-normal opacity-55 leading-none">{h}</span>
                                          </div>
                                          <RiArrowRightSLine className="w-3 h-3 opacity-70 shrink-0" />
                                        </div>
                                      );
                                    })() : (
                                      <p className="text-[9px] text-muted-foreground/40 font-mono text-center py-0.5">未设置主页链接</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="h-px bg-border/50" />

                          {/* Contact */}
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">{s("contact_label")}</Label>
                            <div>
                              <Label className="text-xs font-medium mb-1.5 block">
                                {s("name_label")} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={form.nickname}
                                onChange={(e) => update("nickname", e.target.value)}
                                placeholder={s("name_placeholder")}
                                maxLength={30}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium mb-1.5 block">
                                {s("email_label")} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                placeholder="your@email.com"
                                type="text"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">{s("email_hint")}</p>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {formError && (
                            <motion.div
                              key="form-error"
                              initial={{ opacity: 0, y: -6, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400">
                                <RiAlertLine className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{formError}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={loading}
                          className="w-full gap-2 h-12 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white border-0 rounded-xl text-sm font-semibold shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-px"
                        >
                          {loading
                            ? <><RiLoader4Line className="w-4 h-4 animate-spin" />{s("btn_submitting")}</>
                            : <><RiFlashlightLine className="w-4 h-4" />{s("btn_submit")}</>
                          }
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: VERIFY ── */}
                  {step === "verify" && submitResult && (
                    <div className="space-y-4">
                      <div className="glass-panel border border-border rounded-2xl p-5 space-y-4">

                        {/* Method tab switcher */}
                        <div className="flex rounded-xl bg-muted/40 border border-border/50 p-1 gap-1">
                          <button
                            type="button"
                            onClick={() => setVerifyTab("dns")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
                              verifyTab === "dns"
                                ? "bg-background shadow-sm text-foreground border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <RiServerLine className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">DNS TXT</span>
                            <span className="sm:hidden">DNS</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifyTab("http")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
                              verifyTab === "http"
                                ? "bg-background shadow-sm text-foreground border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <RiFlashlightLine className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span className="hidden sm:inline">{isZh ? "文件验证" : "File Verify"}</span>
                            <span className="sm:hidden">{isZh ? "文件" : "File"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifyTab("vercel")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
                              verifyTab === "vercel"
                                ? "bg-background shadow-sm text-foreground border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className={cn(
                              "shrink-0 text-[11px] font-black leading-none",
                              verifyTab === "vercel" ? "text-foreground" : "text-muted-foreground"
                            )}>▲</span>
                            Vercel
                          </button>
                        </div>

                        {/* ── DNS tab ── */}
                        {verifyTab === "dns" && (
                          <>
                            <div>
                              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <RiServerLine className="w-4 h-4 text-sky-500" />
                                {s("verify_dns_title")}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                {s("verify_dns_desc", { sec: AUTO_POLL_SEC })}
                              </p>
                            </div>

                            {/* DNS record table */}
                            {(() => {
                              // The host record shown to users = subdomain prefix only (without the domain).
                              // DNS panels (Cloudflare, DNSPod, etc.) auto-append the zone/domain.
                              const hostPrefix = submitResult.txtRecord.replace(new RegExp(`\\.${domain.replace(/\./g, "\\.")}$`), "");
                              return (
                            <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/60">
                              <div className="px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/40">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                  {isZh
                                    ? "主机记录只填前缀部分，DNS 面板会自动加上域名后缀。不要填完整域名。"
                                    : "Enter only the prefix for the host record — your DNS panel adds the domain automatically."}
                                </p>
                              </div>
                              {[
                                { label: s("dns_field_type"), value: "TXT", mono: false, copyable: false, note: null },
                                { label: s("dns_field_host"), value: hostPrefix, mono: true, color: "text-violet-600 dark:text-violet-400", copyable: true, note: isZh ? `完整: ${submitResult.txtRecord}` : `Full: ${submitResult.txtRecord}` },
                                { label: s("dns_field_value"), value: submitResult.txtValue, mono: true, color: "text-emerald-600 dark:text-emerald-400", copyable: true, note: null },
                                { label: "TTL", value: s("dns_field_ttl_val"), mono: false, copyable: false, note: null },
                              ].map((row) => (
                                <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                                  <div className="shrink-0 w-20">
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">{row.label}</p>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs break-all leading-relaxed", row.mono ? "font-mono" : "", row.color || "text-foreground")}>
                                      {row.value}
                                    </p>
                                    {row.note && (
                                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono">{row.note}</p>
                                    )}
                                  </div>
                                  {row.copyable && (
                                    <button
                                      onClick={() => copyText(row.value)}
                                      className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      <RiFileCopyLine className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                              ); })()}

                            {/* Quick TXT check */}
                            <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                              <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <RiFlashlightLine className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "快速查询 TXT 记录" : "Quick TXT lookup"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleQuickTxt}
                                  disabled={quickTxtLoading}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                                >
                                  {quickTxtLoading
                                    ? <><RiLoader4Line className="w-3 h-3 animate-spin" />{isZh ? "查询中…" : "Querying…"}</>
                                    : <><RiRefreshLine className="w-3 h-3" />{isZh ? "立即查询" : "Check Now"}</>
                                  }
                                </button>
                              </div>
                              <div className="px-3 py-2.5">
                                {!quickTxtResult && !quickTxtLoading && (
                                  <p className="text-[11px] text-muted-foreground/60 text-center py-1">
                                    {isZh
                                      ? "直接用 Google/Cloudflare DNS 查询 TXT 记录，无需等待页面轮询"
                                      : "Query TXT records directly via Google/Cloudflare DNS — instant result"}
                                  </p>
                                )}
                                {quickTxtLoading && (
                                  <div className="flex items-center gap-2 py-1">
                                    <RiLoader4Line className="w-3.5 h-3.5 animate-spin text-muted-foreground/60" />
                                    <p className="text-[11px] text-muted-foreground">{isZh ? "正在查询…" : "Querying…"}</p>
                                  </div>
                                )}
                                {quickTxtResult && !quickTxtLoading && (
                                  <div className="space-y-2">
                                    {/* Token found — auto-verifying banner */}
                                    {quickTxtResult.tokenFound && (
                                      <div className="flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2">
                                        <RiCheckboxCircleLine className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                          {isZh ? "检测到验证 Token！正在自动完成所有权确认…" : "Verification token detected! Auto-confirming ownership…"}
                                        </p>
                                        <RiLoader4Line className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0 ml-auto" />
                                      </div>
                                    )}
                                    {/* Per-resolver results */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {quickTxtResult.resolvers.map((r) => {
                                        const recCount = (r.flat || r.records || []).length;
                                        const hasRecords = recCount > 0;
                                        return (
                                          <div key={r.name} className={cn(
                                            "rounded-lg border px-2.5 py-2 flex items-center gap-2",
                                            hasRecords ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                              : r.error === "timeout" ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                              : "border-border/50 bg-muted/10"
                                          )}>
                                            <div className={cn("shrink-0 w-5 h-5 rounded-md flex items-center justify-center",
                                              hasRecords ? "bg-emerald-500/10" : r.error === "timeout" ? "bg-amber-500/10" : "bg-muted/30"
                                            )}>
                                              {hasRecords ? <RiCheckLine className="w-3 h-3 text-emerald-500" />
                                                : r.error === "timeout" ? <RiTimeLine className="w-3 h-3 text-amber-500" />
                                                : <RiCloudLine className="w-3 h-3 text-muted-foreground/30" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className={cn("text-[10px] font-semibold truncate",
                                                hasRecords ? "text-emerald-700 dark:text-emerald-300"
                                                  : r.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                                  : "text-muted-foreground"
                                              )}>{r.name}</p>
                                              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                                {hasRecords ? `${r.latencyMs}ms · ${recCount} 条`
                                                  : r.error === "timeout" ? (isZh ? "超时" : "timeout")
                                                  : r.error === "no_record" ? (isZh ? "无记录" : "no record")
                                                  : r.error ? r.error
                                                  : (isZh ? "未找到" : "not found")}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {/* Found records (raw content display) */}
                                    {(quickTxtResult.flat || []).length > 0 && (
                                      <div className={cn(
                                        "rounded-lg border px-2.5 py-2 space-y-1",
                                        quickTxtResult.tokenFound
                                          ? "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/25"
                                          : "border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                                      )}>
                                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                          <RiCheckLine className="w-3 h-3" />
                                          {isZh ? `已找到 ${quickTxtResult.flat.length} 条 TXT 记录` : `Found ${quickTxtResult.flat.length} TXT record(s)`}
                                        </p>
                                        {quickTxtResult.flat.slice(0, 5).map((record, i) => {
                                          const isToken = record === submitResult?.txtValue || record.includes(submitResult?.txtValue || "");
                                          return (
                                            <div key={i} className="flex items-start gap-1.5">
                                              <code className={cn(
                                                "text-[10px] font-mono break-all leading-relaxed flex-1 rounded px-1.5 py-0.5",
                                                isToken
                                                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-400/40"
                                                  : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                              )}>
                                                {isToken && <RiCheckLine className="w-2.5 h-2.5 inline mr-1 mb-0.5" />}
                                                {record}
                                              </code>
                                              <button onClick={() => navigator.clipboard.writeText(record).then(() => toast.success(s("copied")))}
                                                className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground mt-0.5">
                                                <RiFileCopyLine className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {(quickTxtResult.flat || []).length === 0 && (
                                      <p className="text-[11px] text-muted-foreground/70 text-center py-0.5">
                                        {isZh ? "该主机名下暂无 TXT 记录，请确认已正确添加后稍候再查" : "No TXT records found at this hostname — verify the record was added, then try again"}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* DNS status grid — DoH only */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                  <RiCloudLine className="w-3 h-3" />
                                  {s("parallel_check")}
                                </p>
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                                  <RiCloudLine className="w-2.5 h-2.5" />DoH
                                </span>
                              </div>
                              {(() => {
                                const PLACEHOLDER_RESOLVERS = [
                                  { name: "Google DoH",     proto: "doh" },
                                  { name: "Cloudflare DoH", proto: "doh" },
                                  { name: "Quad9 DoH",      proto: "doh" },
                                  { name: "AdGuard DoH",    proto: "doh" },
                                ];
                                const isLoading = verifyState === "loading";
                                const displayList = isLoading && resolvers.length === 0
                                  ? PLACEHOLDER_RESOLVERS
                                  : resolvers;
                                return (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {displayList.map((item, i) => {
                                      const r = resolvers[i];
                                      return (
                                        <div
                                          key={item.name}
                                          className={cn(
                                            "rounded-lg border px-2.5 py-2 flex items-center gap-2 transition-all",
                                            r?.found
                                              ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                              : r?.nearMatch
                                              ? "border-orange-300/60 bg-orange-50/40 dark:bg-orange-950/20"
                                              : r?.error === "timeout"
                                              ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                              : "border-border/50 bg-muted/15"
                                          )}
                                        >
                                          <div className={cn(
                                            "shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
                                            r?.found ? "bg-emerald-500/10"
                                              : r?.nearMatch ? "bg-orange-500/10"
                                              : r?.error === "timeout" ? "bg-amber-500/10"
                                              : "bg-muted/40"
                                          )}>
                                            {isLoading
                                              ? <RiLoader4Line className="w-3 h-3 animate-spin text-muted-foreground/60" />
                                              : r?.found
                                              ? <RiCheckLine className="w-3 h-3 text-emerald-500" />
                                              : r?.nearMatch
                                              ? <RiAlertLine className="w-3 h-3 text-orange-500" />
                                              : r?.error === "timeout"
                                              ? <RiTimeLine className="w-3 h-3 text-amber-500" />
                                              : <RiCloudLine className="w-3 h-3 text-muted-foreground/30" />
                                            }
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className={cn(
                                              "text-[11px] font-semibold leading-none truncate",
                                              r?.found ? "text-emerald-700 dark:text-emerald-300"
                                                : r?.nearMatch ? "text-orange-600 dark:text-orange-400"
                                                : r?.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                                : "text-muted-foreground"
                                            )}>{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                              {isLoading ? s("checking")
                                                : r?.found ? `${r.latencyMs}ms ✓`
                                                : r?.nearMatch ? (isZh ? "记录不匹配" : "wrong token")
                                                : r?.error === "timeout" ? s("timeout")
                                                : r?.error === "servfail" ? (isZh ? "DNS拒绝" : "SERVFAIL")
                                                : r?.error ? s("not_found_dns")
                                                : s("waiting")}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}

                        {/* ── HTTP File tab ── */}
                        {verifyTab === "http" && (
                          <>
                            <div>
                              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <RiFileTextLine className="w-4 h-4 text-sky-500" />
                                {isZh ? "文件验证（无需等待 DNS 传播）" : "File Verification (No DNS wait)"}
                              </h2>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {isZh
                                  ? "在你的网站根目录放一个文件，系统立即检测，通常几秒内完成验证。"
                                  : "Place a file on your website's root. Verification completes in seconds — no DNS propagation needed."}
                              </p>
                            </div>

                            {/* Step-by-step instructions */}
                            <div className="space-y-2.5">
                              {/* Step 1: Create file */}
                              <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "创建验证文件" : "Create verification file"}
                                  </p>
                                </div>
                                <div className="px-3 py-2.5 space-y-2">
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                      <RiLinksLine className="w-2.5 h-2.5" />
                                      {isZh ? "文件路径" : "File path"}
                                    </p>
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                      <code className="text-[11px] font-mono text-violet-600 dark:text-violet-400 flex-1 break-all">
                                        {`/.well-known/next-whois-verify.txt`}
                                      </code>
                                      <button
                                        onClick={() => copyText(`/.well-known/next-whois-verify.txt`)}
                                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                      >
                                        <RiFileCopyLine className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                      <RiFileTextLine className="w-2.5 h-2.5" />
                                      {isZh ? "文件内容" : "File content"}
                                    </p>
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                      <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex-1 break-all">
                                        {submitResult.txtValue}
                                      </code>
                                      <button
                                        onClick={() => copyText(submitResult.txtValue)}
                                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                      >
                                        <RiFileCopyLine className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 2: Verify access URL */}
                              <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {isZh ? "确认文件可公开访问" : "Confirm the file is publicly accessible"}
                                  </p>
                                </div>
                                <div className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                    <RiLinksLine className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                    <code className="text-[11px] font-mono text-sky-600 dark:text-sky-400 flex-1 break-all">
                                      {`https://${domain}/.well-known/next-whois-verify.txt`}
                                    </code>
                                    <button
                                      onClick={() => copyText(`https://${domain}/.well-known/next-whois-verify.txt`)}
                                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                      <RiFileCopyLine className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* HTTP check result */}
                            {httpCheck && (
                              <div className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                                httpCheck.found
                                  ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/25"
                                  : httpCheck.error === "timeout"
                                  ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/15"
                                  : "border-border/50 bg-muted/20"
                              )}>
                                <div className={cn(
                                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                  httpCheck.found ? "bg-emerald-500/10"
                                    : httpCheck.error === "timeout" ? "bg-amber-500/10"
                                    : "bg-muted/40"
                                )}>
                                  {verifyState === "loading"
                                    ? <RiLoader4Line className="w-4 h-4 animate-spin text-muted-foreground/60" />
                                    : httpCheck.found
                                    ? <RiCheckLine className="w-4 h-4 text-emerald-500" />
                                    : httpCheck.error === "timeout"
                                    ? <RiTimeLine className="w-4 h-4 text-amber-500" />
                                    : <RiFileTextLine className="w-4 h-4 text-muted-foreground/40" />
                                  }
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "text-xs font-semibold",
                                    httpCheck.found ? "text-emerald-700 dark:text-emerald-300"
                                      : httpCheck.error === "timeout" ? "text-amber-600 dark:text-amber-400"
                                      : "text-muted-foreground"
                                  )}>
                                    {httpCheck.found
                                      ? (isZh ? "文件已找到，验证成功！" : "File found — verified!")
                                      : httpCheck.error === "timeout"
                                      ? (isZh ? "请求超时" : "Request timed out")
                                      : httpCheck.error
                                      ? (isZh ? `文件未找到 (${httpCheck.error})` : `File not found (${httpCheck.error})`)
                                      : (isZh ? "文件未找到" : "File not found")}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                    {isZh ? "HTTP 检测" : "HTTP check"} · {httpCheck.latencyMs}ms
                                  </p>
                                </div>
                              </div>
                            )}
                            {!httpCheck && verifyState === "loading" && (
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20">
                                <RiLoader4Line className="w-4 h-4 animate-spin text-muted-foreground/60 shrink-0" />
                                <p className="text-xs text-muted-foreground">{isZh ? "正在检测文件…" : "Checking file…"}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── Vercel tab ── */}
                        {verifyTab === "vercel" && (
                          <>
                            <div>
                              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <span className="text-sm font-black">▲</span>
                                {isZh ? "Vercel 域名验证" : "Vercel Domain Verification"}
                              </h2>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {isZh
                                  ? "通过在 DNS 添加 Vercel 官方 TXT 记录，完成域名归属认证。"
                                  : "Verify domain ownership by adding a Vercel-issued DNS TXT record to your domain."}
                              </p>
                            </div>

                            {/* Loading state while fetching TXT from Vercel */}
                            {vercelInitLoading && (
                              <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-border/50 bg-muted/20">
                                <RiLoader4Line className="w-4 h-4 animate-spin text-muted-foreground/60 shrink-0" />
                                <p className="text-xs text-muted-foreground">{isZh ? "正在获取验证记录…" : "Fetching verification record…"}</p>
                              </div>
                            )}

                            {/* API error */}
                            {vercelApiError && !vercelInitLoading && (
                              <div className="rounded-xl border border-red-300/50 bg-red-50/40 dark:bg-red-950/20 p-3 space-y-2">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                  <RiAlertLine className="w-3.5 h-3.5 shrink-0" />
                                  {isZh ? "无法获取 Vercel 验证记录" : "Could not get Vercel verification record"}
                                </p>
                                <p className="text-[10px] text-red-600/70 dark:text-red-400/60 font-mono break-all">{vercelApiError}</p>
                                <button
                                  type="button"
                                  onClick={initVercelVerify}
                                  className="text-[11px] font-semibold text-red-700 dark:text-red-400 hover:underline flex items-center gap-1"
                                >
                                  <RiRefreshLine className="w-3 h-3" />
                                  {isZh ? "重试" : "Retry"}
                                </button>
                              </div>
                            )}

                            {/* TXT record instructions */}
                            {vercelTxtValue && !vercelInitLoading && (
                              <div className="space-y-2.5">
                                <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                                    <p className="text-[11px] font-semibold text-foreground">
                                      {isZh ? "在 DNS 管理面板添加以下 TXT 记录" : "Add this TXT record in your DNS panel"}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2.5 space-y-2">
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                        <RiServerLine className="w-2.5 h-2.5" />
                                        {isZh ? "记录名称（Name）" : "Name"}
                                      </p>
                                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                        <code className="text-[11px] font-mono text-violet-600 dark:text-violet-400 flex-1 break-all">
                                          {vercelTxtFullDomain ?? `_vercel.${domain}`}
                                        </code>
                                        <button
                                          onClick={() => copyText(vercelTxtFullDomain ?? `_vercel.${domain}`)}
                                          className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                          <RiFileCopyLine className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                                        <RiFileTextLine className="w-2.5 h-2.5" />
                                        {isZh ? "记录值（Value）" : "Value"}
                                      </p>
                                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background border border-border/50">
                                        <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex-1 break-all">
                                          {vercelTxtValue}
                                        </code>
                                        <button
                                          onClick={() => copyText(vercelTxtValue!)}
                                          className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                          <RiFileCopyLine className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/50 pt-0.5">
                                      {isZh
                                        ? "记录类型：TXT · 生效时间因服务商而异，通常几分钟内即可"
                                        : "Record type: TXT · Propagation time varies by provider, usually within minutes"}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                                    <p className="text-[11px] font-semibold text-foreground">
                                      {isZh ? "添加完成后，点击下方按钮验证" : "Click verify once the record is added"}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <button
                                      type="button"
                                      disabled={vercelCheckLoading}
                                      onClick={() => { setVercelCheckAttempt(0); handleVercelCheck(false); }}
                                      className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all border",
                                        vercelCheckLoading
                                          ? "bg-muted/40 text-muted-foreground border-border/40 cursor-not-allowed"
                                          : "bg-foreground text-background border-transparent hover:opacity-90 active:scale-[0.98]"
                                      )}
                                    >
                                      {vercelCheckLoading
                                        ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin shrink-0" />
                                        : <RiCheckboxCircleLine className="w-3.5 h-3.5 shrink-0" />}
                                      {vercelCountdown > 0 && !vercelCheckLoading
                                        ? (isZh ? `${vercelCountdown}s 后自动检测` : `Auto-checking in ${vercelCountdown}s`)
                                        : vercelCheckLoading
                                        ? (isZh ? "检测中…" : "Checking…")
                                        : (isZh ? "立即验证" : "Verify Now")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Raw records found panel — shows actual found content when nearMatch */}
                        {anyNearMatch && resolvers.some(r => r.nearMatch && r.records.length > 0) && verifyTab === "dns" && (
                          <div className="rounded-xl border border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/20 p-3 space-y-2">
                            <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                              <RiAlertLine className="w-3.5 h-3.5 shrink-0" />
                              {isZh ? "找到 TXT 记录但内容不匹配" : "TXT record found but token doesn't match"}
                            </p>
                            {resolvers.filter(r => r.nearMatch && r.records.length > 0).slice(0, 2).flatMap(r => r.records).slice(0, 3).map((record, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-[10px] font-bold text-orange-500/70 shrink-0 mt-0.5">找到</span>
                                <code className="text-[10px] font-mono text-orange-600 dark:text-orange-400 break-all leading-relaxed flex-1 bg-orange-500/5 rounded px-1.5 py-0.5">{record}</code>
                              </div>
                            ))}
                            {expectedVal && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-[10px] font-bold text-emerald-600/70 shrink-0 mt-0.5">期望</span>
                                <code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all leading-relaxed flex-1 bg-emerald-500/5 rounded px-1.5 py-0.5">{expectedVal}</code>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {isZh
                                ? "请删除旧记录并重新添加上方表格中显示的正确 Token 值，然后等待 DNS 传播后重试。"
                                : "Please delete the old record and add the correct Token value shown in the table above, then retry after DNS propagates."}
                            </p>
                          </div>
                        )}

                        {/* Status messages (shared) */}
                        <AnimatePresence mode="wait">
                          {verifyState === "nearMatch" && verifyTab === "dns" && (
                            <motion.div
                              key="nearMatch"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                              className="flex gap-2.5 p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-300/50"
                            >
                              <RiAlertLine className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {isZh
                                  ? "DNS 已传播到验证节点，但 Token 值与期望不符，请检查记录内容是否完整复制。"
                                  : "DNS is propagated but the token value doesn't match — check that you copied the exact value."}
                              </p>
                            </motion.div>
                          )}
                          {verifyState === "fail" && resolvers.length > 0 && verifyTab === "dns" && (
                            <motion.div
                              key="fail"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                              className="flex gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50"
                            >
                              <RiAlertLine className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div className="space-y-1 flex-1">
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  {s("fail_msg")}
                                </p>
                              </div>
                            </motion.div>
                          )}
                          {verifyState === "dnsError" && verifyTab === "dns" && (
                            <motion.div
                              key="dnsError"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                              className="flex gap-2.5 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/50"
                            >
                              <RiAlertLine className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {s("dns_error_msg")}
                              </p>
                            </motion.div>
                          )}
                          {verifyState === "giveUp" && (
                            <motion.div
                              key="giveUp"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.2 }}
                              className="rounded-xl border border-orange-200/60 bg-orange-50/50 dark:bg-orange-950/20 overflow-hidden"
                            >
                              <div className="flex gap-2.5 p-3">
                                <div className="shrink-0 w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center mt-0.5">
                                  <RiAlertLine className="w-3.5 h-3.5 text-orange-500" />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                                    {isZh
                                      ? `已自动检测 ${POLL_SCHEDULE.length} 次，未检测到 TXT 记录`
                                      : `Checked ${POLL_SCHEDULE.length} times — TXT record not found`}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {isZh
                                      ? "你的域名后缀可能不支持标准 DNS TXT 查询，建议改用文件验证，无需等待 DNS 传播，几秒内完成。"
                                      : "Your TLD may not support standard DNS TXT queries. Try file verification instead — it's instant, no DNS wait required."}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setVerifyTab("http")}
                                    className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                                  >
                                    <RiFlashlightLine className="w-3.5 h-3.5" />
                                    {isZh ? "切换到文件验证 →" : "Switch to file verification →"}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Verify button + progress + countdown */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleVerify(false)}
                            disabled={verifyState === "loading"}
                            className="w-full gap-2 h-11 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white border-0 rounded-xl text-sm font-semibold shadow-sm shadow-violet-500/20 transition-all"
                          >
                            {verifyState === "loading"
                              ? <><RiLoader4Line className="w-4 h-4 animate-spin" />{s("checking")}</>
                              : <><RiRefreshLine className="w-4 h-4" />{s("btn_check")}</>
                            }
                          </Button>
                          {/* Attempt progress bar */}
                          {pollAttempt > 0 && verifyState !== "giveUp" && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground/60">
                                <span className="flex items-center gap-1">
                                  <RiTimeLine className="w-3 h-3" />
                                  {isZh ? `已检测 ${pollAttempt}/${POLL_SCHEDULE.length} 次` : `Attempt ${pollAttempt}/${POLL_SCHEDULE.length}`}
                                </span>
                                {countdown > 0 && verifyState !== "loading" && (
                                  <span>
                                    {countdown >= 60
                                      ? (isZh ? `${Math.ceil(countdown / 60)} 分钟后自动检测` : `next check in ${Math.ceil(countdown / 60)}m`)
                                      : (isZh ? `${countdown} 秒后自动检测` : `next check in ${countdown}s`)}
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-1 rounded-full bg-muted/40 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-400/60 transition-all duration-500"
                                  style={{ width: `${(pollAttempt / POLL_SCHEDULE.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {pollAttempt === 0 && countdown > 0 && verifyState !== "loading" && (
                            <div className="rounded-lg bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/50 px-3 py-2 flex items-center gap-2">
                              <RiTimeLine className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <p className="text-[11px] text-sky-700 dark:text-sky-300 flex-1">
                                {isZh
                                  ? "请先按上方说明设置 TXT 记录，设置完成后点击【立即验证】或等待自动检测"
                                  : "Add the TXT record above first, then click Verify Now or wait for the auto-check"}
                              </p>
                              <span className="shrink-0 text-[10px] font-mono text-sky-500 tabular-nums">
                                {countdown >= 60
                                  ? `${Math.ceil(countdown / 60)}m`
                                  : `${countdown}s`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tips card — only DNS tab */}
                      {verifyTab === "dns" && (
                        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex gap-3">
                          <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
                            <RiAlertLine className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">{s("dns_prop_title")}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {s("dns_prop_prefix")}<strong className="text-foreground">{s("dns_prop_highlight")}</strong>{s("dns_prop_suffix")}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => { stopPolling(); goToStep("form"); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
                      >
                        {s("back_edit")}
                      </button>
                    </div>
                  )}

                  {/* ── STEP 3: DONE ── */}
                  {step === "done" && (
                    <div className="space-y-4">
                      <div className="glass-panel border border-emerald-300/40 dark:border-emerald-700/30 rounded-2xl p-8 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-5">
                          <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                          <div className="relative w-16 h-16 bg-emerald-500/10 border-2 border-emerald-400/40 rounded-full flex items-center justify-center">
                            <RiCheckLine className="w-8 h-8 text-emerald-500" />
                          </div>
                        </div>
                        <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">{s("done_title")}</h2>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          {s("done_claim_body", { domain })}
                        </p>
                        <div className="inline-flex items-center justify-center py-3 px-5 rounded-xl bg-gradient-to-br from-violet-50/60 to-fuchsia-50/40 dark:from-violet-950/30 dark:to-fuchsia-950/20 border border-violet-200/40 dark:border-violet-800/30 mb-6">
                          <TagBadge tagName={form.tagName} tagStyle={form.tagStyle} live />
                        </div>
                        <div className="space-y-2.5">
                          <Button
                            className="w-full gap-2 h-11 bg-violet-500 hover:bg-violet-600 text-white border-0 rounded-xl font-semibold"
                            onClick={goBack}
                          >
                            <RiExternalLinkLine className="w-4 h-4" />
                            {s("done_view")}
                          </Button>
                        </div>
                      </div>

                      {/* Delete verification record reminder */}
                      {submitResult && (
                        <div className="rounded-2xl border border-sky-200/60 dark:border-sky-800/40 bg-sky-50/60 dark:bg-sky-950/20 p-4">
                          <div className="flex gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mt-0.5">
                              <RiDeleteBinLine className="w-4 h-4 text-sky-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">{s("done_delete_title")}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                                {s("done_delete_body")}
                              </p>
                              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background/70 border border-sky-200/50 dark:border-sky-800/30">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase shrink-0">TXT</span>
                                <code className="text-[11px] font-mono text-sky-700 dark:text-sky-300 flex-1 break-all">
                                  {submitResult.txtRecord}
                                </code>
                                <button
                                  onClick={() => copyText(submitResult!.txtRecord)}
                                  className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <RiFileCopyLine className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                                ℹ️ {s("done_keep_record")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* What happens next */}
                      <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s("done_next")}</p>
                        {[
                          { icon: RiGlobalLine, text: s("done_next_all_users") },
                          { icon: RiShieldCheckLine, text: s("done_next_prominent") },
                          { icon: RiCheckLine, text: s("done_next_resubmit") },
                        ].map((item, i) => {
                          const ItemIcon = item.icon;
                          return (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="shrink-0 w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center mt-0.5">
                              <ItemIcon className="w-3 h-3 text-violet-500" />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</p>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Style preview bottom sheet */}
              <AnimatePresence>
                {previewStyleId && (() => {
                  const ts = TAG_STYLES.find(t => t.id === previewStyleId) || TAG_STYLES[0];
                  const cardTheme = CARD_THEME_OPTIONS.find(t => t.id === ts.theme) || CARD_THEME_OPTIONS[0];
                  const Icon = ts.icon;
                  const stampLabels: Record<string, string> = {
                    personal: "个人认领", official: "官方认证", brand: "品牌认领",
                    verified: "已认证",   partner: "合作伙伴", dev: "开发者",
                    warning:  "警示",     premium: "高级认证",
                  };
                  const badgeLabel = stampLabels[previewStyleId] ?? "已认领";
                  const previewName = form.tagName.trim() || (isZh ? "品牌名称" : "Brand Name");
                  const isSelected = form.tagStyle === previewStyleId;
                  return (
                    <>
                      <motion.div
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setPreviewStyleId(null)}
                      />
                      <motion.div
                        className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto px-3 pb-4"
                        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", damping: 22, stiffness: 280 }}
                      >
                        <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
                          {/* Sheet header */}
                          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold", ts.className)}>
                                <Icon className="w-3 h-3" />
                                {isZh ? ts.zhName : ts.label}
                              </span>
                              <span className="text-xs text-muted-foreground">{cardTheme.label}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewStyleId(null)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <RiCloseLine className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Card preview */}
                          <div className="px-4 py-4">
                            <div className="rounded-[18px] overflow-hidden border border-border/40 shadow-md">
                              <div className={cn("relative px-3 pt-4 pb-7 text-center select-none overflow-hidden", cardTheme.hero)}>
                                <div className="absolute inset-0 opacity-[0.06]"
                                  style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                                <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/30 to-transparent" />
                                <div className="relative flex flex-col items-center gap-1.5">
                                  <div className="relative flex items-center justify-center">
                                    <div className="absolute w-12 h-12 rounded-2xl bg-white/10 blur-md" />
                                    <div className="relative w-10 h-10 rounded-[13px] bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                                      <Icon className="w-5 h-5 text-white drop-shadow" />
                                    </div>
                                  </div>
                                  <p className="text-shimmer-white text-[9px] font-mono tracking-[0.2em] uppercase">
                                    {domain || "your-domain.com"}
                                  </p>
                                </div>
                              </div>
                              <div className={cn("relative -mt-4 mx-2.5 rounded-[14px] border shadow-lg px-3 pt-2.5 pb-2.5", cardTheme.cardBg, cardTheme.cardBorder)}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cn("text-[13px] font-black leading-tight tracking-tight", cardTheme.shimmer)}>
                                    {previewName}
                                  </span>
                                  <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5", ts.className)}>
                                    <RiShieldCheckLine className="w-2 h-2" />
                                    {badgeLabel}
                                  </span>
                                </div>
                                {form.description && (
                                  <p className={cn("text-[10px] leading-relaxed mt-1.5", cardTheme.cardText === "text-white" ? "text-white/60" : "text-muted-foreground")}>
                                    {form.description}
                                  </p>
                                )}
                              </div>
                              <div className="px-2.5 pt-2 pb-3">
                                {form.link ? (() => {
                                  let h = form.link;
                                  try { h = new URL(form.link).hostname; } catch {}
                                  return (
                                    <div className={cn("flex items-center justify-between w-full px-3 py-2 rounded-xl", cardTheme.btn)}>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold leading-none">{isZh ? "访问主页" : "Visit"}</span>
                                        <span className="text-[8px] font-normal opacity-55 leading-none">{h}</span>
                                      </div>
                                      <RiArrowRightSLine className="w-3 h-3 opacity-70 shrink-0" />
                                    </div>
                                  );
                                })() : (
                                  <p className="text-[9px] text-muted-foreground/40 font-mono text-center py-0.5">{isZh ? "未设置主页链接" : "No link set"}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Action */}
                          <div className="px-4 pb-4 flex gap-2">
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={() => setPreviewStyleId(null)}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                              >
                                <RiCheckLine className="w-4 h-4" />
                                {isZh ? "已选择" : "Selected"}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewStyleId(null)}
                                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                                >
                                  {isZh ? "取消" : "Cancel"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { update("tagStyle", previewStyleId); setPreviewStyleId(null); }}
                                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                  {isZh ? "使用此样式" : "Use this style"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </>
                  );
                })()}
              </AnimatePresence>

              {/* Guide modal */}
              <AnimatePresence>
                {showGuide && (
                  <>
                    <motion.div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={dismissGuide}
                    />
                    <motion.div
                      className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto px-3 pb-4"
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 80, opacity: 0 }}
                      transition={{ type: "spring", damping: 22, stiffness: 280 }}
                    >
                      <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                              <RiShieldCheckLine className="w-4 h-4 text-violet-500" />
                            </div>
                            <p className="text-sm font-bold">{s("how_it_works")}</p>
                          </div>
                          <button
                            type="button"
                            onClick={dismissGuide}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <RiCloseLine className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Steps */}
                        <div className="px-5 py-4 space-y-3.5">
                          {HOW_TO_STEPS.map((hwStep, i) => {
                            const Icon = hwStep.icon;
                            return (
                              <div key={i} className="flex gap-3 items-start">
                                <div className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", hwStep.bg)}>
                                  <Icon className={cn("w-3.5 h-3.5", hwStep.color)} />
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                  <p className="text-xs font-semibold text-foreground leading-none mb-1">{s(HOW_STEP_TITLE_KEYS[i])}</p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s(HOW_STEP_DESC_KEYS[i])}</p>
                                </div>
                                {i < HOW_TO_STEPS.length - 1 && (
                                  <div className="shrink-0 flex items-center mt-1.5 text-muted-foreground/30">
                                    <RiArrowRightLine className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Dismiss button */}
                        <div className="px-5 pb-5">
                          <button
                            type="button"
                            onClick={dismissGuide}
                            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                          >
                            {isZh ? "知道了，开始填写" : "Got it, let's go"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </>
  );
}
