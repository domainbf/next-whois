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
  RiEdit2Line, RiShieldUserLine,
} from "@remixicon/react";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import type { HistoryItem } from "@/lib/history";

type Subscription = {
  id: string; domain: string; expiration_date: string | null;
  active: boolean; created_at: string; cancel_token: string;
};

type RegStatus = "registered" | "unregistered" | "reserved" | "error" | "unknown";

type ServerHistoryItem = {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-4">
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
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
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);

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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = session!.user!;
  const isAdminUser = (user as any)?.email?.toLowerCase?.()?.trim?.() === ADMIN_EMAIL;
  const TABS = [
    { key: "subscriptions" as const, label: "域名订阅", icon: <RiCalendarLine className="w-3.5 h-3.5" /> },
    { key: "stamps" as const, label: "品牌认领", icon: <RiShieldCheckLine className="w-3.5 h-3.5" /> },
    { key: "history" as const, label: "搜索历史", icon: <RiHistoryLine className="w-3.5 h-3.5" /> },
    { key: "account" as const, label: "账户", icon: <RiUserLine className="w-3.5 h-3.5" /> },
  ];

  const QUERY_TYPE_LABEL: Record<string, string> = {
    domain: "域名", ipv4: "IPv4", ipv6: "IPv6", asn: "ASN", cidr: "CIDR",
  };

  return (
    <>
      <Head><title>用户中心 · Next WHOIS</title></Head>
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
              用户中心
              {isAdminUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300 font-bold border border-violet-200/50 dark:border-violet-700/30 uppercase tracking-wider">
                  创始人
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
                管理后台
              </Link>
            )}
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
              <RiLogoutBoxLine className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        </div>

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
              {t.icon}<span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Subscriptions ── */}
          {tab === "subscriptions" && (
            <motion.div key="subscriptions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">域名到期提醒订阅</p>
                <Link href="/remind" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <RiCalendarLine className="w-3 h-3" />新增订阅
                </Link>
              </div>
              {loadingData ? (
                <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <RiCalendarLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">暂无订阅</p>
                  <Link href="/remind">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs">订阅域名到期提醒</Button>
                  </Link>
                </div>
              ) : subscriptions.map(sub => {
                const lifecycle = sub.expiration_date
                  ? getDomainLifecycle(sub.domain, new Date(sub.expiration_date))
                  : null;
                const phase = lifecycle?.phase;
                const phaseInfo = phase ? PHASE_LABEL[phase] : null;

                return (
                  <div key={sub.id} className={cn(
                    "glass-panel border rounded-2xl p-4 space-y-3 transition-all",
                    sub.active ? "border-border" : "border-border/40 opacity-60"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <RiGlobalLine className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{sub.domain}</p>
                          {!sub.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">已取消</span>}
                          {phaseInfo && phase !== "active" && (
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
                <Link href="/" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <RiShieldCheckLine className="w-3 h-3" />认领新域名
                </Link>
              </div>
              {loadingData ? (
                <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : stamps.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <RiShieldCheckLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">暂无品牌认领记录</p>
                  <p className="text-xs text-muted-foreground">搜索你的域名后点击「认领」开始</p>
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
          {tab === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">搜索历史（最近 50 条）</p>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : searchHistory.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <RiHistoryLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">暂无搜索记录</p>
                </div>
              ) : (
                <div className="glass-panel border border-border rounded-2xl divide-y divide-border/50">
                  {searchHistory.map((item, i) => {
                    const rs = item.regStatus ?? "unknown";
                    const statusCfg: Record<string, { label: string; cls: string }> = {
                      registered:   { label: "已注册", cls: "text-emerald-600 bg-emerald-50 border-emerald-300/60 dark:bg-emerald-950/30 dark:border-emerald-700/40" },
                      unregistered: { label: "未注册", cls: "text-sky-600 bg-sky-50 border-sky-300/60 dark:bg-sky-950/30 dark:border-sky-700/40" },
                      reserved:     { label: "保留",   cls: "text-amber-600 bg-amber-50 border-amber-300/60 dark:bg-amber-950/30 dark:border-amber-700/40" },
                      error:        { label: "查询失败", cls: "text-rose-600 bg-rose-50 border-rose-300/60 dark:bg-rose-950/30 dark:border-rose-700/40" },
                      unknown:      { label: "未知",   cls: "text-muted-foreground bg-muted border-border" },
                    };
                    const cfg = statusCfg[rs] ?? statusCfg.unknown;
                    const d = new Date(item.timestamp);
                    const ts = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    return (
                      <Link key={i} href={`/${item.query}`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <RiSearchLine className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-mono truncate flex-1 min-w-0">{item.query}</span>
                        {item.queryType === "domain" && (
                          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        )}
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {QUERY_TYPE_LABEL[item.queryType] ?? item.queryType}
                          {" · "}
                          {ts}
                        </span>
                        <RiExternalLinkLine className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Account ── */}
          {tab === "account" && (
            <motion.div key="account" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">账户信息</p>
              <div className="glass-panel border border-border rounded-2xl divide-y divide-border/50">
                {/* Editable name row */}
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <p className="text-xs text-muted-foreground shrink-0">昵称</p>
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
                      <button onClick={saveName} disabled={savingName} className="p-1 rounded-lg hover:bg-muted text-emerald-600 transition-colors">
                        {savingName ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiCheckLine className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingName(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                        <RiCloseLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{(user as any).name || "未设置"}</p>
                      <button
                        onClick={() => { setNameValue((user as any).name || ""); setEditingName(true); }}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <RiPencilLine className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {[
                  { label: "邮箱", value: user.email },
                  { label: "域名订阅", value: `${subscriptions.filter(s => s.active).length} 个活跃` },
                  { label: "品牌认领", value: `${stamps.length} 个（${stamps.filter(s => s.verified).length} 已验证）` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-xs font-semibold">{row.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200/50 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                <RiLogoutBoxLine className="w-4 h-4" />
                退出登录
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
