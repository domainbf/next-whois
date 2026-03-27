import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiShieldUserLine, RiAddLine, RiDeleteBinLine, RiFileCopyLine,
  RiToggleLine, RiToggleFill, RiLoader4Line, RiCloseLine,
  RiCheckLine, RiLockLine, RiLockUnlockLine, RiFilterLine,
  RiTimeLine,
} from "@remixicon/react";

type Scope = "api" | "subscription" | "all";

type AccessKey = {
  id: string;
  key: string;
  label: string | null;
  scope: Scope;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  use_count: number;
};

const SCOPE_LABELS: Record<Scope, { label: string; color: string }> = {
  api:          { label: "API",       color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
  subscription: { label: "域名订阅",  color: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400" },
  all:          { label: "全部权限",   color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
};

type StatusFilter = "all" | "active" | "disabled" | "expired";
type ScopeFilter  = "__any__" | Scope;

function fmtRelative(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  if (hours < 24)return `${hours} 小时前`;
  if (days < 7)  return `${days} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function isExpired(k: AccessKey): boolean {
  return !!k.expires_at && new Date(k.expires_at) < new Date();
}

export default function AccessKeysPage() {
  const [keys, setKeys] = React.useState<AccessKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [requireApiKey, setRequireApiKey] = React.useState(false);
  const [togglingRequire, setTogglingRequire] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("api");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = React.useState<ScopeFilter>("__any__");
  const [purgingExpired, setPurgingExpired] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/access-keys");
      const d = await r.json();
      if (d.keys) setKeys(d.keys);
      setRequireApiKey(!!d.require_api_key);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function toggleRequire() {
    setTogglingRequire(true);
    try {
      const next = !requireApiKey;
      const r = await fetch("/api/admin/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_require", enabled: next }),
      });
      if ((await r.json()).ok) {
        setRequireApiKey(next);
        toast.success(next ? "已开启 API Key 验证" : "已关闭 API Key 验证");
      }
    } finally {
      setTogglingRequire(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await fetch("/api/admin/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, scope, expires_at: expiresAt || undefined }),
      });
      const d = await r.json();
      if (d.ok && d.key) {
        setNewKeyValue(d.key.key);
        setShowCreate(false);
        setLabel(""); setScope("api"); setExpiresAt("");
        load();
        toast.success("API Key 已生成");
      } else {
        toast.error(d.error || "生成失败");
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(k: AccessKey) {
    await fetch("/api/admin/access-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: k.id, is_active: !k.is_active }),
    });
    setKeys(ks => ks.map(x => x.id === k.id ? { ...x, is_active: !x.is_active } : x));
    toast.success(k.is_active ? "已停用" : "已启用");
  }

  async function deleteKey(k: AccessKey) {
    if (!confirm(`确认删除 Key "${k.label || k.key.slice(0, 16) + "…"}"？`)) return;
    await fetch("/api/admin/access-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: k.id }),
    });
    setKeys(ks => ks.filter(x => x.id !== k.id));
    toast.success("已删除");
  }

  async function purgeExpired() {
    const expiredList = keys.filter(isExpired);
    if (expiredList.length === 0) return;
    if (!confirm(`确认删除全部 ${expiredList.length} 个已过期的 Key？`)) return;
    setPurgingExpired(true);
    try {
      await Promise.all(expiredList.map(k =>
        fetch("/api/admin/access-keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: k.id }),
        })
      ));
      setKeys(ks => ks.filter(k => !isExpired(k)));
      toast.success(`已清除 ${expiredList.length} 个过期 Key`);
      if (statusFilter === "expired") setStatusFilter("all");
    } finally {
      setPurgingExpired(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const activeCount   = keys.filter(k => k.is_active && !isExpired(k)).length;
  const disabledCount = keys.filter(k => !k.is_active && !isExpired(k)).length;
  const expiredCount  = keys.filter(isExpired).length;
  const totalUses     = keys.reduce((s, k) => s + k.use_count, 0);

  const STATUS_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",      label: "全部",   count: keys.length },
    { key: "active",   label: "启用",   count: activeCount },
    { key: "disabled", label: "停用",   count: disabledCount },
    { key: "expired",  label: "已过期", count: expiredCount },
  ];

  const SCOPE_FILTER_TABS: { key: ScopeFilter; label: string; count: number }[] = [
    { key: "__any__",      label: "全部范围", count: keys.length },
    { key: "api",          label: "API",      count: keys.filter(k => k.scope === "api").length },
    { key: "subscription", label: "域名订阅", count: keys.filter(k => k.scope === "subscription").length },
    { key: "all",          label: "全部权限", count: keys.filter(k => k.scope === "all").length },
  ];

  const filtered = keys.filter(k => {
    const statusOk =
      statusFilter === "all"      ? true :
      statusFilter === "active"   ? k.is_active && !isExpired(k) :
      statusFilter === "disabled" ? !k.is_active && !isExpired(k) :
      isExpired(k);
    const scopeOk =
      scopeFilter === "__any__" ? true : k.scope === scopeFilter;
    return statusOk && scopeOk;
  });

  return (
    <AdminLayout title="API 密钥管理">
      <Head><title>API 密钥 · Admin</title></Head>

      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <RiShieldUserLine className="w-5 h-5 text-primary" />API 密钥管理
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {keys.length} 个 · 累计调用 {totalUses.toLocaleString()} 次
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {expiredCount > 0 && (
              <Button
                variant="outline" size="sm"
                className="gap-1.5 rounded-xl h-8 text-muted-foreground border-border/60"
                onClick={purgeExpired}
                disabled={purgingExpired}
              >
                {purgingExpired
                  ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                  : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                清理过期 ({expiredCount})
              </Button>
            )}
            <Button size="sm" className="gap-1.5 rounded-xl h-8" onClick={() => setShowCreate(true)}>
              <RiAddLine className="w-3.5 h-3.5" />生成 Key
            </Button>
          </div>
        </div>

        {/* Global toggle */}
        <div className="rounded-2xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {requireApiKey
                ? <RiLockLine className="w-4 h-4 text-amber-500" />
                : <RiLockUnlockLine className="w-4 h-4 text-muted-foreground" />}
              API Key 验证
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {requireApiKey
                ? "已开启：所有 API 请求必须携带有效 Key"
                : "已关闭：API 无需 Key 即可访问"}
            </p>
          </div>
          <button onClick={toggleRequire} disabled={togglingRequire} className="shrink-0">
            {togglingRequire
              ? <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
              : requireApiKey
                ? <RiToggleFill className="w-8 h-8 text-emerald-500" />
                : <RiToggleLine className="w-8 h-8 text-muted-foreground" />}
          </button>
        </div>

        {/* Stats grid */}
        {keys.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "全部",   value: keys.length,  color: "text-foreground" },
              { label: "启用中", value: activeCount,   color: "text-emerald-500" },
              { label: "已停用", value: disabledCount, color: "text-muted-foreground" },
              { label: "已过期", value: expiredCount,  color: "text-red-500" },
            ].map(s => (
              <div key={s.label} className="glass-panel border border-border rounded-xl p-3 text-center">
                <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* New key reveal */}
        {newKeyValue && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              ✓ Key 已生成，请立即复制 — 关闭后不再显示完整 Key
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-background border border-border rounded-lg px-3 py-2 break-all">
                {newKeyValue}
              </code>
              <button
                onClick={() => copy(newKeyValue)}
                className="shrink-0 p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                {copied === newKeyValue
                  ? <RiCheckLine className="w-4 h-4 text-emerald-500" />
                  : <RiFileCopyLine className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              我已保存，关闭提示
            </button>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
            <div className="relative z-10 w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">生成 API Key</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-muted">
                  <RiCloseLine className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">备注 <span className="text-muted-foreground font-normal">（可选）</span></Label>
                  <Input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="如：生产环境、测试用途"
                    className="h-9 rounded-xl"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">权限范围</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["api", "subscription", "all"] as Scope[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScope(s)}
                        className={cn(
                          "py-2 rounded-xl border text-xs font-medium transition-all",
                          scope === s
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {SCOPE_LABELS[s].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground px-0.5">
                    {scope === "api" && "仅可使用 WHOIS / DNS / SSL / IP 查询 API"}
                    {scope === "subscription" && "仅可使用域名到期订阅提醒功能"}
                    {scope === "all" && "可使用全部 API 功能及订阅提醒"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">过期时间 <span className="text-muted-foreground font-normal">（留空为永久）</span></Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="h-9 rounded-xl"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <Button type="submit" disabled={creating} className="w-full h-9 rounded-xl gap-1.5">
                  {creating
                    ? <><RiLoader4Line className="w-3.5 h-3.5 animate-spin" />生成中…</>
                    : <><RiShieldUserLine className="w-3.5 h-3.5" />生成</>}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Filter rows */}
        {keys.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <RiFilterLine className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium transition-all",
                    statusFilter === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn("ml-1.5 text-[10px]", statusFilter === tab.key ? "opacity-70" : "opacity-60")}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="w-3.5 shrink-0" />
              {SCOPE_FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setScopeFilter(tab.key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium transition-all",
                    scopeFilter === tab.key
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn("ml-1.5 text-[10px]", scopeFilter === tab.key ? "opacity-70" : "opacity-60")}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {keys.length === 0 ? "暂无 API Key，点击右上角生成" : "该筛选条件下暂无 Key"}
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-semibold">Key / 备注</th>
                  <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">范围</th>
                  <th className="text-center px-3 py-2.5 font-semibold hidden md:table-cell">调用 / 最近使用</th>
                  <th className="text-center px-3 py-2.5 font-semibold">状态</th>
                  <th className="text-right px-4 py-2.5 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(k => {
                  const masked = k.key.slice(0, 8) + "••••••••" + k.key.slice(-6);
                  const expired = isExpired(k);
                  const sc = SCOPE_LABELS[k.scope] ?? SCOPE_LABELS.api;
                  return (
                    <tr key={k.id} className={cn(
                      "hover:bg-muted/20 transition-colors",
                      (!k.is_active || expired) && "opacity-50"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
                            {masked}
                          </span>
                          <button
                            onClick={() => copy(k.key)}
                            className="text-muted-foreground/50 hover:text-primary transition-colors"
                            title="复制完整 Key"
                          >
                            {copied === k.key
                              ? <RiCheckLine className="w-3.5 h-3.5 text-emerald-500" />
                              : <RiFileCopyLine className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {k.label
                            ? <span className="font-medium">{k.label}</span>
                            : <span className="italic">无备注</span>}
                          {" · "}
                          {new Date(k.created_at).toLocaleDateString("zh-CN")}
                          {k.expires_at && (
                            <span className={cn("ml-1", expired ? "text-red-500" : "")}>
                              · {expired ? "已过期：" : "到期："}{new Date(k.expires_at).toLocaleDateString("zh-CN")}
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sc.color)}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <p className="text-xs font-semibold tabular-nums">{k.use_count.toLocaleString()}</p>
                        {k.last_used_at ? (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center justify-center gap-0.5">
                            <RiTimeLine className="w-3 h-3" />{fmtRelative(k.last_used_at)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5">从未使用</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          expired
                            ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                            : k.is_active
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                        )}>
                          {expired ? "已过期" : k.is_active ? "启用" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!expired && (
                            <button
                              onClick={() => toggleActive(k)}
                              title={k.is_active ? "停用" : "启用"}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {k.is_active
                                ? <RiToggleFill className="w-4 h-4 text-emerald-500" />
                                : <RiToggleLine className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => deleteKey(k)}
                            title="删除"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <RiDeleteBinLine className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
