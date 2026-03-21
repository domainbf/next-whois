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
  RiFlashlightLine, RiTimeLine,
} from "@remixicon/react";

type Subscription = {
  id: string; domain: string; expiration_date: string | null;
  active: boolean; created_at: string; cancel_token: string;
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
            <RiPencilLine className="w-4 h-4 text-primary" />
            编辑品牌认领
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = React.useState<"subscriptions" | "stamps" | "account">("subscriptions");
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [stamps, setStamps] = React.useState<Stamp[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [editingStamp, setEditingStamp] = React.useState<Stamp | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = session!.user!;
  const TABS = [
    { key: "subscriptions" as const, label: "域名订阅", icon: <RiCalendarLine className="w-3.5 h-3.5" /> },
    { key: "stamps" as const, label: "品牌认领", icon: <RiShieldCheckLine className="w-3.5 h-3.5" /> },
    { key: "account" as const, label: "账户", icon: <RiUserLine className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <Head><title>用户中心 · Next WHOIS</title></Head>
      {editingStamp && (
        <EditStampModal stamp={editingStamp} onClose={() => setEditingStamp(null)} onSaved={refreshData} />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">用户中心</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
            <RiLogoutBoxLine className="w-3.5 h-3.5" />
            退出登录
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted/40 border border-border/50 p-1 gap-1">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
                tab === t.key
                  ? "bg-background shadow-sm text-foreground border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {t.icon}{t.label}
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
              ) : subscriptions.map(sub => (
                <div key={sub.id} className={cn(
                  "glass-panel border rounded-2xl p-4 flex items-center gap-3 transition-all",
                  sub.active ? "border-border" : "border-border/40 opacity-60"
                )}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <RiGlobalLine className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{sub.domain}</p>
                      {!sub.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">已取消</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <RiTimeLine className="w-3 h-3" />
                      {sub.expiration_date
                        ? `到期：${new Date(sub.expiration_date).toLocaleDateString("zh-CN")}`
                        : "到期日期未设置"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
              ))}
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

          {/* ── Account ── */}
          {tab === "account" && (
            <motion.div key="account" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">账户信息</p>
              <div className="glass-panel border border-border rounded-2xl divide-y divide-border/50">
                {[
                  { label: "昵称", value: (user as any).name || "未设置" },
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
