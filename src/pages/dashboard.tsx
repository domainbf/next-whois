import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiLoader4Line, RiCalendarLine, RiShieldCheckLine, RiGlobalLine,
  RiDeleteBinLine, RiPencilLine, RiCheckLine, RiCloseLine,
  RiUserLine, RiLogoutBoxLine, RiAlertLine, RiExternalLinkLine,
  RiFlashlightLine, RiTimeLine, RiHistoryLine, RiSearchLine,
  RiEdit2Line, RiShieldUserLine, RiLockLine, RiMailLine,
  RiEyeLine, RiEyeOffLine, RiPaletteLine, RiArrowRightLine,
  RiBellLine, RiFileTextLine, RiWifiLine,
  RiDownloadLine, RiFilterLine, RiDeleteBack2Line, RiFireLine,
  RiTimerLine, RiBarChartLine,
} from "@remixicon/react";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import type { HistoryItem } from "@/lib/history";
import { useTranslation } from "@/lib/i18n";

type Subscription = {
  id: string; domain: string; expiration_date: string | null;
  active: boolean; created_at: string; cancel_token: string;
};

type RegStatus = "registered" | "unregistered" | "reserved" | "error" | "unknown";

type ServerHistoryItem = {
  id?: string;
  query: string;
  queryType: string;
  timestamp: number;
  regStatus: RegStatus;
};

type Stamp = {
  id: string; domain: string; tag_name: string; tag_style: string;
  link: string | null; description: string | null; nickname: string;
  verified: boolean; verified_at: string | null; created_at: string;
};

const TAG_COLORS: Record<string, string> = {
  personal: "bg-violet-50 border border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-700/60 dark:text-violet-300",
  official: "bg-blue-500 text-white",
  brand: "bg-violet-500 text-white",
  verified: "bg-emerald-500 text-white",
  partner: "bg-orange-500 text-white",
  dev: "bg-sky-500 text-white",
  warning: "bg-amber-400 text-white",
  premium: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
};

function TagBadge({ style, name }: { style: string; name: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold", TAG_COLORS[style] || TAG_COLORS.personal)}>
      {name}
    </span>
  );
}

// ── Domain lifecycle helpers ──────────────────────────────────────────────────
const LIFECYCLE: Record<string, { grace: number; redemption: number; pendingDelete: number }> = {
  com: { grace: 45, redemption: 30, pendingDelete: 5 },
  net: { grace: 45, redemption: 30, pendingDelete: 5 },
  org: { grace: 45, redemption: 30, pendingDelete: 5 },
  info: { grace: 45, redemption: 30, pendingDelete: 5 },
  biz: { grace: 45, redemption: 30, pendingDelete: 5 },
  name: { grace: 45, redemption: 30, pendingDelete: 5 },
  mobi: { grace: 45, redemption: 30, pendingDelete: 5 },
  pro: { grace: 45, redemption: 30, pendingDelete: 5 },
  io:  { grace: 30, redemption: 30, pendingDelete: 5 },
  co:  { grace: 45, redemption: 30, pendingDelete: 5 },
  app: { grace: 45, redemption: 30, pendingDelete: 5 },
  dev: { grace: 45, redemption: 30, pendingDelete: 5 },
  ai:  { grace: 30, redemption: 30, pendingDelete: 5 },
};

function getDomainLifecycle(domain: string, expiryDate: Date) {
  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  const cfg = LIFECYCLE[tld] ?? { grace: 45, redemption: 30, pendingDelete: 5 };
  const ms = (d: number) => d * 86_400_000;
  const graceEnd = new Date(expiryDate.getTime() + ms(cfg.grace));
  const redemptionEnd = new Date(graceEnd.getTime() + ms(cfg.redemption));
  const dropDate = new Date(redemptionEnd.getTime() + ms(cfg.pendingDelete));
  const now = new Date();
  let phase: "active" | "grace" | "redemption" | "pendingDelete" | "dropped";
  if (now < expiryDate) phase = "active";
  else if (now < graceEnd) phase = "grace";
  else if (now < redemptionEnd) phase = "redemption";
  else if (now < dropDate) phase = "pendingDelete";
  else phase = "dropped";
  return { graceEnd, redemptionEnd, dropDate, phase };
}

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "有效", color: "text-emerald-600 dark:text-emerald-400" },
  grace: { label: "宽限期", color: "text-amber-600 dark:text-amber-400" },
  redemption: { label: "赎回期", color: "text-orange-600 dark:text-orange-400" },
  pendingDelete: { label: "待删除", color: "text-red-600 dark:text-red-400" },
  dropped: { label: "已删除", color: "text-muted-foreground" },
};

function fmt(d: Date) {
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ── Edit Stamp Modal ──────────────────────────────────────────────────────────
function EditStampModal({ stamp, onClose, onSaved }: { stamp: Stamp; onClose: () => void; onSaved: () => void }) {
  const [tagName, setTagName] = React.useState(stamp.tag_name);
  const [tagStyle, setTagStyle] = React.useState(stamp.tag_style);
  const [link, setLink] = React.useState(stamp.link || "");
  const [description, setDescription] = React.useState(stamp.description || "");
  const [nickname, setNickname] = React.useState(stamp.nickname);
  const [saving, setSaving] = React.useState(false);
  const TAG_STYLES = ["personal", "official", "brand", "verified", "partner", "dev", "warning", "premium"];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/user/stamps?id=${stamp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName, tagStyle, link, description, nickname }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("保存成功");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-6 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <RiPencilLine className="w-4 h-4 text-primary" />编辑品牌认领
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <RiCloseLine className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">域名：<span className="font-mono text-foreground">{stamp.domain}</span></p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">标签文字</Label>
            <Input value={tagName} onChange={e => setTagName(e.target.value)} maxLength={32} className="h-9 rounded-xl text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">标签样式</Label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_STYLES.map(s => (
                <button key={s} type="button" onClick={() => setTagStyle(s)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all",
                    tagStyle === s ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100",
                    TAG_COLORS[s])}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">昵称</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={50} className="h-9 rounded-xl text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">链接 <span className="text-muted-foreground font-normal">（可选）</span></Label>
            <Input value={link} onChange={e => setLink(e.target.value)} maxLength={200} placeholder="https://" className="h-9 rounded-xl text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">描述 <span className="text-muted-foreground font-normal">（可选）</span></Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={200} className="h-9 rounded-xl text-sm" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="outline" className="flex-1 h-9 rounded-xl text-sm">取消</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-sm gap-1.5">
            {saving ? <><RiLoader4Line className="w-3.5 h-3.5 animate-spin" />保存中…</> : <><RiCheckLine className="w-3.5 h-3.5" />保存</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Subscription Expiry Modal ────────────────────────────────────────────
function EditExpiryModal({ sub, onClose, onSaved }: { sub: Subscription; onClose: () => void; onSaved: (newDate: string) => void }) {
  const [dateValue, setDateValue] = React.useState(
    sub.expiration_date ? sub.expiration_date.slice(0, 10) : ""
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!dateValue) { toast.error("请选择日期"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/user/subscriptions?id=${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiration_date: dateValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("到期日期已更新");
      onSaved(new Date(dateValue).toISOString());
      onClose();
    } catch (e: any) {
      toast.error(e.message || "更新失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pb-6 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <RiCalendarLine className="w-4 h-4 text-primary" />编辑到期日期
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <RiCloseLine className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">域名：<span className="font-mono text-foreground">{sub.domain}</span></p>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">到期日期</Label>
          <Input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className="h-9 rounded-xl text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="outline" className="flex-1 h-9 rounded-xl text-sm">取消</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl text-sm gap-1.5">
            {saving ? <><RiLoader4Line className="w-3.5 h-3.5 animate-spin" />保存中…</> : <><RiCheckLine className="w-3.5 h-3.5" />保存</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Claim Guide Modal ─────────────────────────────────────────────────────────
function GuideModalShell({ onClose, icon, iconBg, title, subtitle, children }: {
  onClose: () => void;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pb-4"
      style={{ paddingTop: "clamp(60px, 10vh, 80px)" }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm pointer-events-none" />
      <div
        className="relative z-10 w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100vh - clamp(60px,10vh,80px) - 16px)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 touch-manipulation"
          >
            <RiCloseLine className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          <div className="p-4 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MiniMockup({ highlightClaim }: { highlightClaim: boolean }) {
  return (
    <div className="rounded-xl bg-muted/20 border border-border p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">实际效果预览（手机）</p>
      <div className="rounded-lg border border-border bg-background shadow-sm">
        <div className="px-3 pt-2.5 pb-1.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">DOMAIN</p>
          <p className="text-sm font-bold font-mono leading-none">X.RW</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />Active
            </span>
            <span className="text-[8px] text-muted-foreground">⏱ 2y</span>
          </div>
        </div>
        <div className="px-3 pb-2.5 flex items-center gap-1.5">
          <div className={cn(
            "relative flex items-center justify-center w-5 h-5 rounded-full border",
            highlightClaim
              ? "bg-violet-50 dark:bg-violet-950/40 border-violet-400/60 text-violet-500"
              : "bg-muted/40 border-border/50 text-muted-foreground/60"
          )}>
            <RiShieldCheckLine className="w-2.5 h-2.5" />
            {highlightClaim && (
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
              </span>
            )}
          </div>
          <div className={cn(
            "relative flex items-center justify-center w-5 h-5 rounded-full border",
            !highlightClaim
              ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400/60 text-sky-500"
              : "bg-muted/40 border-border/50 text-muted-foreground/60"
          )}>
            <RiTimerLine className="w-2.5 h-2.5" />
            {!highlightClaim && (
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
              </span>
            )}
          </div>
          <span className="text-[8px] text-muted-foreground ml-0.5">
            ← 点击{highlightClaim ? "认领" : "订阅"}按钮
          </span>
        </div>
      </div>
    </div>
  );
}

function ClaimGuideModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [domain, setDomain] = React.useState("");
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = domain.trim();
    if (!q) return;
    onClose();
    router.push(`/${q}`);
  }
  return (
    <GuideModalShell
      onClose={onClose}
      icon={<RiShieldCheckLine className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
      iconBg="bg-violet-100 dark:bg-violet-950/40"
      title="品牌认领"
      subtitle="声明你对域名的所有权"
    >
      <MiniMockup highlightClaim={true} />
      <div className="space-y-1.5">
        {[
          { icon: RiSearchLine,      color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",    n: "1", title: "搜索你的域名",    desc: "在首页搜索框输入你拥有的域名，进入 WHOIS 详情页" },
          { icon: RiShieldCheckLine, color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400", n: "2", title: "点击「认领」图标", desc: "点击详情页按钮栏中的盾牌图标，填写标签名和简介" },
          { icon: RiWifiLine,        color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400", n: "3", title: "完成 DNS 验证",   desc: "添加 TXT 记录或上传验证文件，证明域名归属权" },
          { icon: RiCheckLine,       color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",    n: "4", title: "获得认证标签",    desc: "验证通过后，WHOIS 页面将显示你的品牌认证信息" },
        ].map((s) => (
          <div key={s.n} className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl bg-muted/25">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.color)}>
              <s.icon className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">步骤 {s.n}</p>
              <p className="text-xs font-semibold leading-snug">{s.title}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="x.rw" className="h-9 rounded-xl text-sm font-mono flex-1" />
        <Button type="submit" size="sm" className="h-9 rounded-xl px-3 gap-1 shrink-0 touch-manipulation">
          前往 <RiArrowRightLine className="w-3.5 h-3.5" />
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground text-center px-2 pb-1">认领需通过 DNS TXT 或文件验证，确认域名归属权</p>
    </GuideModalShell>
  );
}

// ── Subscribe Guide Modal ──────────────────────────────────────────────────────
function SubscribeGuideModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [domain, setDomain] = React.useState("");
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = domain.trim();
    if (!q) return;
    onClose();
    router.push(`/${q}`);
  }
  return (
    <GuideModalShell
      onClose={onClose}
      icon={<RiCalendarLine className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
      iconBg="bg-sky-100 dark:bg-sky-950/40"
      title="域名到期提醒"
      subtitle="到期前自动发邮件，不再遗漏续费"
    >
      <MiniMockup highlightClaim={false} />
      <div className="space-y-1.5">
        {[
          { icon: RiSearchLine, color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",    n: "1", title: "搜索你的域名",    desc: "在首页搜索框输入域名，查看 WHOIS 到期信息" },
          { icon: RiBellLine,   color: "bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",        n: "2", title: "点击「订阅」图标", desc: "点击详情页按钮栏中的计时器图标，订阅到期提醒" },
          { icon: RiMailLine,   color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400", n: "3", title: "自动接收邮件",   desc: "到期前 90天、30天、7天、1天自动发送邮件提醒" },
        ].map((s) => (
          <div key={s.n} className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl bg-muted/25">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.color)}>
              <s.icon className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">步骤 {s.n}</p>
              <p className="text-xs font-semibold leading-snug">{s.title}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="x.rw" className="h-9 rounded-xl text-sm font-mono flex-1" />
        <Button type="submit" size="sm" className="h-9 rounded-xl px-3 gap-1 shrink-0 touch-manipulation">
          前往 <RiArrowRightLine className="w-3.5 h-3.5" />
        </Button>
      </form>
      <button
        type="button"
        onClick={() => { onClose(); router.push("/remind"); }}
        className="w-full h-9 rounded-xl text-xs touch-manipulation flex items-center justify-center border border-border bg-background hover:bg-muted transition-colors font-medium"
      >
        <RiCalendarLine className="w-3.5 h-3.5 mr-1" />查看订阅管理页
      </button>
    </GuideModalShell>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status, update: updateSession } = useSession();
  const [tab, setTab] = React.useState<"subscriptions" | "stamps" | "account" | "history">("subscriptions");
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [stamps, setStamps] = React.useState<Stamp[]>([]);
  const [searchHistory, setSearchHistory] = React.useState<ServerHistoryItem[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [editingStamp, setEditingStamp] = React.useState<Stamp | null>(null);
  const [editingSubscription, setEditingSubscription] = React.useState<Subscription | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  const [deletingStamp, setDeletingStamp] = React.useState<string | null>(null);
  const [showClaimGuide, setShowClaimGuide] = React.useState(false);
  const [showSubscribeGuide, setShowSubscribeGuide] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState(false);
  const [emailValue, setEmailValue] = React.useState("");
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [showPwdSection, setShowPwdSection] = React.useState(false);
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [avatarColor, setAvatarColor] = React.useState("violet");
  const [editingAvatar, setEditingAvatar] = React.useState(false);
  const [savingAvatar, setSavingAvatar] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState("");
  const [clearingHistory, setClearingHistory] = React.useState(false);

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingData(true);
    Promise.all([
      fetch("/api/user/subscriptions").then(r => r.json()),
      fetch("/api/user/stamps").then(r => r.json()),
    ]).then(([subData, stampData]) => {
      if (subData.subscriptions) setSubscriptions(subData.subscriptions);
      if (stampData.stamps) setStamps(stampData.stamps);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [status]);

  React.useEffect(() => {
    if (tab === "history" && status === "authenticated" && searchHistory.length === 0) {
      setLoadingHistory(true);
      fetch("/api/user/search-history")
        .then(r => r.json())
        .then(data => { if (data.history) setSearchHistory(data.history); })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [tab, status]);

  function refreshData() {
    Promise.all([
      fetch("/api/user/subscriptions").then(r => r.json()),
      fetch("/api/user/stamps").then(r => r.json()),
    ]).then(([subData, stampData]) => {
      if (subData.subscriptions) setSubscriptions(subData.subscriptions);
      if (stampData.stamps) setStamps(stampData.stamps);
    }).catch(() => {});
  }

  async function cancelSubscription(id: string) {
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

  async function deleteStamp(id: string) {
    setDeletingStamp(id);
    try {
      const res = await fetch(`/api/user/stamps?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setStamps(prev => prev.filter(s => s.id !== id));
      toast.success("已删除品牌认领");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setDeletingStamp(null);
    }
  }

  async function clearAllHistory() {
    setClearingHistory(true);
    try {
      await fetch("/api/user/search-history?id=all", { method: "DELETE" });
      setSearchHistory([]);
      toast.success("搜索历史已清空");
    } catch {
      toast.error("操作失败");
    } finally {
      setClearingHistory(false);
    }
  }

  function exportSubscriptionsCSV() {
    const activeSubs = subscriptions.filter(s => s.active);
    if (activeSubs.length === 0) { toast.info("没有有效订阅可导出"); return; }
    const rows = [
      ["域名", "到期日期", "订阅时间"],
      ...activeSubs.map(s => [
        s.domain,
        s.expiration_date ? new Date(s.expiration_date).toLocaleDateString("zh-CN") : "未知",
        new Date(s.created_at).toLocaleDateString("zh-CN"),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "domain-subscriptions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${activeSubs.length} 条订阅记录`);
  }

  function daysUntilExpiry(sub: Subscription): number | null {
    if (!sub.expiration_date) return null;
    const diff = new Date(sub.expiration_date).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  }

  const AVATAR_COLORS: { key: string; bg: string; text: string; label: string }[] = [
    { key: "violet", bg: "bg-violet-500", text: "text-white", label: "紫" },
    { key: "blue",   bg: "bg-blue-500",   text: "text-white", label: "蓝" },
    { key: "emerald",bg: "bg-emerald-500",text: "text-white", label: "绿" },
    { key: "orange", bg: "bg-orange-500", text: "text-white", label: "橙" },
    { key: "pink",   bg: "bg-pink-500",   text: "text-white", label: "粉" },
    { key: "red",    bg: "bg-red-500",    text: "text-white", label: "红" },
    { key: "yellow", bg: "bg-yellow-400", text: "text-black", label: "黄" },
    { key: "slate",  bg: "bg-slate-600",  text: "text-white", label: "灰" },
  ];

  React.useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/profile")
        .then(r => r.json())
        .then(data => {
          if (data.user?.avatar_color) setAvatarColor(data.user.avatar_color);
        })
        .catch(() => {});
    }
  }, [status]);

  async function saveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await updateSession({ name: nameValue.trim() || null });
      toast.success("昵称已更新");
      setEditingName(false);
    } catch (e: any) {
      toast.error(e.message || "更新失败");
    } finally {
      setSavingName(false);
    }
  }

  async function saveEmail() {
    if (!emailValue.trim()) { toast.error("请输入新邮箱"); return; }
    setSavingEmail(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await updateSession({ email: emailValue.trim().toLowerCase() });
      toast.success("邮箱已更新，请重新登录");
      setEditingEmail(false);
    } catch (e: any) {
      toast.error(e.message || "更新失败");
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    if (!currentPwd) { toast.error("请输入当前密码"); return; }
    if (newPwd.length < 8) { toast.error("新密码至少 8 位"); return; }
    if (newPwd !== confirmPwd) { toast.error("两次密码不一致"); return; }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("密码已更新");
      setShowPwdSection(false);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e: any) {
      toast.error(e.message || "修改失败");
    } finally {
      setSavingPwd(false);
    }
  }

  async function saveAvatarColor(color: string) {
    setSavingAvatar(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_color: color }),
      });
      setAvatarColor(color);
      setEditingAvatar(false);
    } catch {
      toast.error("保存头像失败");
    } finally {
      setSavingAvatar(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = session!.user!;
  const isAdminUser = (user as any)?.email?.toLowerCase?.()?.trim?.() === ADMIN_EMAIL;

  // Computed stats
  const activeSubs = subscriptions.filter(s => s.active);
  const expiringSoon = activeSubs.filter(s => {
    const d = daysUntilExpiry(s);
    return d !== null && d >= 0 && d <= 30;
  });
  const urgentSubs = activeSubs.filter(s => {
    const d = daysUntilExpiry(s);
    return d !== null && d >= 0 && d <= 7;
  });
  const verifiedStamps = stamps.filter(s => s.verified);

  const TABS = [
    { key: "subscriptions" as const, label: "域名订阅", icon: <RiCalendarLine className="w-3.5 h-3.5" />, count: activeSubs.length || undefined },
    { key: "stamps" as const, label: "品牌认领", icon: <RiShieldCheckLine className="w-3.5 h-3.5" />, count: stamps.length || undefined },
    { key: "history" as const, label: "搜索历史", icon: <RiHistoryLine className="w-3.5 h-3.5" />, count: searchHistory.length || undefined },
    { key: "account" as const, label: "账户", icon: <RiUserLine className="w-3.5 h-3.5" /> },
  ];

  const QUERY_TYPE_LABEL: Record<string, string> = {
    domain: "域名", ipv4: "IPv4", ipv6: "IPv6", asn: "ASN", cidr: "CIDR",
  };

  return (
    <>
      <Head><title key="site-title">{t("nav_dashboard")} · Next WHOIS</title></Head>
      {showClaimGuide && <ClaimGuideModal onClose={() => setShowClaimGuide(false)} />}
      {showSubscribeGuide && <SubscribeGuideModal onClose={() => setShowSubscribeGuide(false)} />}
      {editingStamp && (
        <EditStampModal stamp={editingStamp} onClose={() => setEditingStamp(null)} onSaved={refreshData} />
      )}
      {editingSubscription && (
        <EditExpiryModal
          sub={editingSubscription}
          onClose={() => setEditingSubscription(null)}
          onSaved={(newDate) => {
            setSubscriptions(prev => prev.map(s =>
              s.id === editingSubscription.id ? { ...s, expiration_date: newDate } : s
            ));
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {t("nav_dashboard")}
              {isAdminUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300 font-bold border border-violet-200/50 dark:border-violet-700/30 uppercase tracking-wider">
                  {t("founder")}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUser && (
              <Link href="/admin"
                className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors px-3 py-1.5 rounded-lg font-semibold">
                <RiShieldUserLine className="w-3.5 h-3.5" />
                {t("nav_admin")}
              </Link>
            )}
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
              <RiLogoutBoxLine className="w-3.5 h-3.5" />
              {t("sign_out")}
            </button>
          </div>
        </div>

        {/* Stats overview bar */}
        {!loadingData && (activeSubs.length > 0 || stamps.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="glass-panel border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <RiCalendarLine className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold leading-none">{activeSubs.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">有效订阅</p>
              </div>
            </div>
            <div className={cn(
              "glass-panel border rounded-xl px-3 py-2.5 flex items-center gap-2.5",
              urgentSubs.length > 0 ? "border-red-300/60 bg-red-50/40 dark:bg-red-950/20" :
              expiringSoon.length > 0 ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20" : "border-border"
            )}>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                urgentSubs.length > 0 ? "bg-red-100 dark:bg-red-950/40" :
                expiringSoon.length > 0 ? "bg-amber-100 dark:bg-amber-950/40" : "bg-muted"
              )}>
                <RiFireLine className={cn("w-3.5 h-3.5",
                  urgentSubs.length > 0 ? "text-red-500" :
                  expiringSoon.length > 0 ? "text-amber-500" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className={cn("text-base font-bold leading-none",
                  urgentSubs.length > 0 ? "text-red-600 dark:text-red-400" :
                  expiringSoon.length > 0 ? "text-amber-600 dark:text-amber-400" : ""
                )}>{expiringSoon.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">30天内到期</p>
              </div>
            </div>
            <div className="glass-panel border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <RiShieldCheckLine className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold leading-none">{verifiedStamps.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">已验证品牌</p>
              </div>
            </div>
            <div className="glass-panel border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                <RiBarChartLine className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-base font-bold leading-none">{searchHistory.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">历史查询</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted/40 border border-border/50 p-1 gap-1">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all",
                tab === t.key
                  ? "bg-background shadow-sm text-foreground border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              {t.count !== undefined && (
                <span className={cn(
                  "text-[10px] font-bold px-1 py-0 rounded-full min-w-[16px] text-center leading-4",
                  tab === t.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Subscriptions ── */}
          {tab === "subscriptions" && (
            <motion.div key="subscriptions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">域名到期提醒</p>
                <div className="flex items-center gap-2">
                  {activeSubs.length > 0 && (
                    <button
                      onClick={exportSubscriptionsCSV}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <RiDownloadLine className="w-3 h-3" />导出 CSV
                    </button>
                  )}
                  <button
                    onClick={() => setShowSubscribeGuide(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <RiCalendarLine className="w-3 h-3" />新增订阅
                  </button>
                </div>
              </div>

              {/* Urgent alert */}
              {urgentSubs.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
                  <RiFireLine className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    <strong>{urgentSubs.length}</strong> 个域名将在 7 天内到期，请尽快续费！
                  </p>
                </div>
              )}
              {loadingData ? (
                <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-dashed border-border flex items-center justify-center mx-auto">
                    <RiCalendarLine className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">还没有订阅</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      订阅你的域名，到期前自动发送邮件提醒<br/>再也不会因忘记续费而丢失域名
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-center">
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => setShowSubscribeGuide(true)}
                    >
                      <RiBellLine className="w-3.5 h-3.5" />如何订阅
                    </Button>
                    <Link href="/remind" className="text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2">
                      前往订阅管理页
                    </Link>
                  </div>
                </div>
              ) : [...subscriptions]
                .sort((a, b) => {
                  if (!a.active && b.active) return 1;
                  if (a.active && !b.active) return -1;
                  const da = daysUntilExpiry(a) ?? 9999;
                  const db = daysUntilExpiry(b) ?? 9999;
                  return da - db;
                })
                .map(sub => {
                const lifecycle = sub.expiration_date
                  ? getDomainLifecycle(sub.domain, new Date(sub.expiration_date))
                  : null;
                const phase = lifecycle?.phase;
                const phaseInfo = phase ? PHASE_LABEL[phase] : null;
                const days = daysUntilExpiry(sub);
                const isUrgent = sub.active && days !== null && days >= 0 && days <= 7;
                const isWarn = sub.active && days !== null && days >= 0 && days <= 30 && !isUrgent;

                return (
                  <div key={sub.id} className={cn(
                    "glass-panel border rounded-2xl p-4 space-y-3 transition-all",
                    !sub.active ? "border-border/40 opacity-60" :
                    isUrgent ? "border-red-300/60 dark:border-red-700/50" :
                    isWarn ? "border-amber-300/60 dark:border-amber-700/50" : "border-border"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isUrgent ? "bg-red-100 dark:bg-red-950/40" :
                        isWarn ? "bg-amber-100 dark:bg-amber-950/40" : "bg-primary/10"
                      )}>
                        {isUrgent ? <RiFireLine className="w-4 h-4 text-red-500" /> :
                         isWarn ? <RiTimerLine className="w-4 h-4 text-amber-500" /> :
                         <RiGlobalLine className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{sub.domain}</p>
                          {!sub.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">已取消</span>}
                          {isUrgent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold border border-red-300/50">
                              {days === 0 ? "今日到期" : `${days}天后到期`}
                            </span>
                          )}
                          {isWarn && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold border border-amber-300/50">
                              {days}天后到期
                            </span>
                          )}
                          {phaseInfo && phase !== "active" && !isUrgent && !isWarn && (
                            <span className={cn("text-[10px] font-semibold", phaseInfo.color)}>{phaseInfo.label}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <RiTimeLine className="w-3 h-3 shrink-0" />
                          {sub.expiration_date
                            ? `到期：${fmt(new Date(sub.expiration_date))}`
                            : "到期日期未设置"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingSubscription(sub)}
                          title="编辑到期日期"
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <RiEdit2Line className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/${sub.domain}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <RiExternalLinkLine className="w-3.5 h-3.5" />
                        </Link>
                        {sub.active && (
                          <button onClick={() => cancelSubscription(sub.id)} disabled={cancelling === sub.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                            {cancelling === sub.id
                              ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                              : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lifecycle dates */}
                    {lifecycle && sub.expiration_date && (
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">宽限期结束</p>
                          <p className={cn("text-[11px] font-semibold tabular-nums", phase === "grace" ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                            {fmt(lifecycle.graceEnd)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">赎回期结束</p>
                          <p className={cn("text-[11px] font-semibold tabular-nums", phase === "redemption" ? "text-orange-600 dark:text-orange-400" : "text-foreground")}>
                            {fmt(lifecycle.redemptionEnd)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">预计释放</p>
                          <p className={cn("text-[11px] font-semibold tabular-nums", phase === "pendingDelete" ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                            {fmt(lifecycle.dropDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── Stamps ── */}
          {tab === "stamps" && (
            <motion.div key="stamps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">品牌认领记录</p>
                <button
                  onClick={() => setShowClaimGuide(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RiShieldCheckLine className="w-3 h-3" />认领新域名
                </button>
              </div>
              {loadingData ? (
                <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : stamps.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/8 border border-dashed border-border flex items-center justify-center mx-auto">
                    <RiShieldCheckLine className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">还没有品牌认领</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      认领你拥有的域名，在 WHOIS 查询结果中<br/>显示你的品牌名称和认证标签
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => setShowClaimGuide(true)}
                  >
                    <RiShieldCheckLine className="w-3.5 h-3.5" />如何认领域名
                  </Button>
                </div>
              ) : stamps.map(stamp => (
                <div key={stamp.id} className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{stamp.domain}</p>
                        <TagBadge style={stamp.tag_style} name={stamp.tag_name} />
                        {stamp.verified
                          ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <RiCheckLine className="w-3 h-3" />已验证
                            </span>
                          : <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              <RiTimeLine className="w-3 h-3" />待验证
                            </span>
                        }
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        昵称：{stamp.nickname}
                        {stamp.link && <> · <a href={stamp.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{stamp.link}</a></>}
                      </p>
                      {stamp.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{stamp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!stamp.verified && (
                        <Link href={`/stamp?domain=${stamp.domain}`}>
                          <button className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 text-muted-foreground hover:text-violet-500 transition-colors" title="前往验证">
                            <RiFlashlightLine className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      )}
                      <button onClick={() => setEditingStamp(stamp)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <RiPencilLine className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/${stamp.domain}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <RiExternalLinkLine className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteStamp(stamp.id)}
                        disabled={deletingStamp === stamp.id}
                        title="删除品牌认领"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                        {deletingStamp === stamp.id
                          ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                          : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {!stamp.verified && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40">
                      <RiAlertLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-muted-foreground">此域名尚未完成验证，前往验证页完成 DNS 或文件验证</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ── Search History ── */}
          {tab === "history" && (() => {
            const STATUS_CFG: Record<string, { label: string; cls: string }> = {
              registered:   { label: "已注册", cls: "text-emerald-600 bg-emerald-50 border-emerald-300/60 dark:bg-emerald-950/30 dark:border-emerald-700/40" },
              unregistered: { label: "未注册", cls: "text-sky-600 bg-sky-50 border-sky-300/60 dark:bg-sky-950/30 dark:border-sky-700/40" },
              reserved:     { label: "保留",   cls: "text-amber-600 bg-amber-50 border-amber-300/60 dark:bg-amber-950/30 dark:border-amber-700/40" },
              error:        { label: "查询失败", cls: "text-rose-600 bg-rose-50 border-rose-300/60 dark:bg-rose-950/30 dark:border-rose-700/40" },
              unknown:      { label: "未知",   cls: "text-muted-foreground bg-muted border-border" },
            };
            const q = historySearch.trim().toLowerCase();
            const filtered = q ? searchHistory.filter(h => h.query.toLowerCase().includes(q)) : searchHistory;
            return (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">搜索历史</p>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={clearAllHistory}
                      disabled={clearingHistory}
                      className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      {clearingHistory ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : <RiDeleteBack2Line className="w-3 h-3" />}
                      清空全部
                    </button>
                  )}
                </div>

                {/* Search filter */}
                {searchHistory.length > 4 && (
                  <div className="relative">
                    <RiFilterLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="筛选历史记录…"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 border border-border/60 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                    {historySearch && (
                      <button onClick={() => setHistorySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        ×
                      </button>
                    )}
                  </div>
                )}

                {loadingHistory ? (
                  <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : searchHistory.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <RiHistoryLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">暂无搜索记录</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">没有匹配「{historySearch}」的记录</p>
                  </div>
                ) : (
                  <div className="glass-panel border border-border rounded-2xl divide-y divide-border/50">
                    {filtered.map((item, i) => {
                      const rs = item.regStatus ?? "unknown";
                      const cfg = STATUS_CFG[rs] ?? STATUS_CFG.unknown;
                      const d = new Date(item.timestamp);
                      const ts = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl group">
                          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <RiSearchLine className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <Link href={`/${item.query}`} className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            <span className="text-sm font-mono truncate flex-1 min-w-0">{item.query}</span>
                            {item.queryType === "domain" && (
                              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.cls}`}>
                                {cfg.label}
                              </span>
                            )}
                            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                              {QUERY_TYPE_LABEL[item.queryType] ?? item.queryType}{" · "}{ts}
                            </span>
                          </Link>
                          <button
                            onClick={async () => {
                              if (!item.id) return;
                              await fetch(`/api/user/search-history?id=${item.id}`, { method: "DELETE" });
                              setSearchHistory(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="p-1 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="删除此条记录"
                          >
                            <RiDeleteBack2Line className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!q && searchHistory.length > 0 && (
                  <p className="text-[10px] text-center text-muted-foreground/60">最近 50 条记录</p>
                )}
              </motion.div>
            );
          })()}

          {/* ── Account ── */}
          {tab === "account" && (() => {
            const ac = AVATAR_COLORS.find(c => c.key === avatarColor) || AVATAR_COLORS[0];
            const initial = ((user as any).name || user.email || "U").charAt(0).toUpperCase();
            return (
            <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-4">

              {/* ── Avatar card ── */}
              <div className="glass-panel border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm", ac.bg, ac.text)}>
                    {initial}
                  </div>
                  <button
                    onClick={() => setEditingAvatar(v => !v)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <RiPaletteLine className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate">{(user as any).name || "未设置昵称"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {isAdminUser && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300 font-bold border border-violet-200/50 dark:border-violet-700/30 uppercase tracking-wider">
                      {t("founder")}
                    </span>
                  )}
                </div>
              </div>

              {/* Color picker */}
              {editingAvatar && (
                <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">选择头像颜色</p>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.key}
                        onClick={() => saveAvatarColor(c.key)}
                        disabled={savingAvatar}
                        className={cn(
                          "w-9 h-9 rounded-xl font-bold text-xs transition-all",
                          c.bg, c.text,
                          avatarColor === c.key ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"
                        )}
                      >
                        {savingAvatar && avatarColor === c.key ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin mx-auto" /> : c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Profile fields ── */}
              <div className="glass-panel border border-border rounded-2xl divide-y divide-border/50">

                {/* Name */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <RiUserLine className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">昵称</p>
                  </div>
                  {editingName ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Input
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        maxLength={50}
                        className="h-7 rounded-lg text-xs w-36"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                      />
                      <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-lg hover:bg-muted text-emerald-600 transition-colors">
                        {savingName ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiCheckLine className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                        <RiCloseLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{(user as any).name || "未设置"}</p>
                      <button onClick={() => { setNameValue((user as any).name || ""); setEditingName(true); }}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <RiPencilLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <RiMailLine className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">邮箱</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold truncate max-w-[160px]">{user.email}</p>
                      {!editingEmail && (
                        <button onClick={() => { setEmailValue(user.email || ""); setEditingEmail(true); }}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <RiPencilLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {editingEmail && (
                    <div className="space-y-2 pt-1">
                      <Input
                        type="email"
                        value={emailValue}
                        onChange={e => setEmailValue(e.target.value)}
                        placeholder="新邮箱地址"
                        className="h-8 rounded-xl text-xs"
                        autoFocus
                      />
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">更换邮箱后需重新登录</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEmail} disabled={savingEmail} className="h-7 text-xs rounded-lg gap-1 flex-1">
                          {savingEmail ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : <RiCheckLine className="w-3 h-3" />}
                          确认更换
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingEmail(false)} className="h-7 text-xs rounded-lg">取消</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {[
                  { label: "域名订阅", value: `${subscriptions.filter(s => s.active).length} 个活跃` },
                  { label: "品牌认领", value: `${stamps.length} 个（${stamps.filter(s => s.verified).length} 已验证）` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-xs font-semibold">{row.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Change password ── */}
              <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => { setShowPwdSection(v => !v); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RiLockLine className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold">修改密码</p>
                  </div>
                  <RiPencilLine className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {showPwdSection && (
                  <div className="border-t border-border px-4 py-4 space-y-3">
                    {[
                      { label: "当前密码", value: currentPwd, onChange: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                      { label: "新密码（至少 8 位）", value: newPwd, onChange: setNewPwd, show: showNew, toggle: () => setShowNew(v => !v) },
                      { label: "确认新密码", value: confirmPwd, onChange: setConfirmPwd, show: showNew, toggle: () => {} },
                    ].map((f, i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                        <div className="relative">
                          <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                          <Input
                            type={f.show ? "text" : "password"}
                            value={f.value}
                            onChange={e => f.onChange(e.target.value)}
                            className="pl-8 pr-8 h-9 rounded-xl text-xs"
                          />
                          {i < 2 && (
                            <button type="button" onClick={f.toggle}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                              {f.show ? <RiEyeOffLine className="w-3.5 h-3.5" /> : <RiEyeLine className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button onClick={changePassword} disabled={savingPwd} className="flex-1 h-9 rounded-xl text-xs gap-1.5">
                        {savingPwd ? <><RiLoader4Line className="w-3.5 h-3.5 animate-spin" />修改中…</> : <><RiCheckLine className="w-3.5 h-3.5" />确认修改</>}
                      </Button>
                      <Button variant="outline" onClick={() => setShowPwdSection(false)} className="h-9 rounded-xl text-xs">取消</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Danger zone ── */}
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200/50 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                <RiLogoutBoxLine className="w-4 h-4" />
                {t("sign_out")}
              </button>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </>
  );
}
