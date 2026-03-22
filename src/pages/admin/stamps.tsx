import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiShieldCheckLine, RiShieldLine, RiCalendarLine, RiMailLine,
  RiLinkM, RiFileTextLine, RiUserLine, RiArrowDownSLine,
  RiArrowUpSLine, RiFilterLine,
} from "@remixicon/react";

type Stamp = {
  id: string;
  domain: string;
  tag_name: string;
  tag_style: string;
  link: string | null;
  description: string | null;
  nickname: string;
  email: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
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

type FilterTab = "all" | "pending" | "verified";

export default function AdminStampsPage() {
  const [stamps, setStamps] = React.useState<Stamp[]>([]);
  const [total, setTotal] = React.useState(0);
  const [verifiedCount, setVerifiedCount] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");
  const [loading, setLoading] = React.useState(false);
  const [acting, setActing] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const LIMIT = 50;

  function load(q: string, filter: FilterTab, off = 0) {
    setLoading(true);
    fetch(`/api/admin/stamps?search=${encodeURIComponent(q)}&filter=${filter}&limit=${LIMIT}&offset=${off}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return; }
        setStamps(off === 0 ? data.stamps || [] : prev => [...prev, ...(data.stamps || [])]);
        setTotal(data.total || 0);
        setVerifiedCount(data.verifiedCount || 0);
        setPendingCount(data.pendingCount || 0);
        setOffset(off);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load("", "all", 0); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    load(search, activeFilter, 0);
  }

  function handleFilter(f: FilterTab) {
    setActiveFilter(f);
    setOffset(0);
    load(search, f, 0);
  }

  async function toggleVerify(stamp: Stamp) {
    setActing(stamp.id);
    try {
      const res = await fetch(`/api/admin/stamps?id=${stamp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !stamp.verified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStamps(prev => prev.map(s => s.id === stamp.id ? { ...s, ...data.stamp } : s));
      if (!stamp.verified) setVerifiedCount(v => v + 1), setPendingCount(v => v - 1);
      else setVerifiedCount(v => v - 1), setPendingCount(v => v + 1);
      toast.success(stamp.verified ? "已撤销认证" : "已设为已认证");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setActing(null);
    }
  }

  async function deleteStamp(id: string, domain: string) {
    if (!confirm(`确定要删除 ${domain} 的品牌认领吗？此操作不可撤销。`)) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/stamps?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setStamps(prev => prev.filter(s => s.id !== id));
      setTotal(prev => prev - 1);
      toast.success("已删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setActing(null);
    }
  }

  function fmt(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  const FILTERS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "全部", count: verifiedCount + pendingCount },
    { key: "pending", label: "待审核", count: pendingCount },
    { key: "verified", label: "已认证", count: verifiedCount },
  ];

  return (
    <AdminLayout title="品牌认领">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">品牌认领</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {total.toLocaleString()} 条记录 · 已认证 {verifiedCount} · 待审核 {pendingCount}
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="域名、标签、邮箱…"
                className="pl-8 h-9 rounded-xl text-sm w-52"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 rounded-xl px-4">搜索</Button>
          </form>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 p-1 glass-panel border border-border rounded-xl w-fit">
          <RiFilterLine className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] px-1 py-0.5 rounded",
                  activeFilter === f.key ? "bg-white/20" : "bg-muted-foreground/10"
                )}>{f.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading && offset === 0 ? (
          <div className="flex justify-center py-12">
            <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : stamps.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiShieldCheckLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">没有找到记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stamps.map(stamp => {
              const isExpanded = expanded === stamp.id;
              const hasDetails = stamp.link || stamp.description || stamp.nickname || stamp.email;
              return (
                <div key={stamp.id}
                  className={cn(
                    "glass-panel border rounded-xl overflow-hidden group transition-colors",
                    stamp.verified ? "border-emerald-200/60 dark:border-emerald-800/30" : "border-border"
                  )}>
                  {/* Main row */}
                  <div className="p-4 flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      stamp.verified ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"
                    )}>
                      {stamp.verified
                        ? <RiShieldCheckLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <RiShieldLine className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold font-mono">{stamp.domain}</p>
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0",
                          TAG_COLORS[stamp.tag_style] || TAG_COLORS.personal)}>
                          {stamp.tag_name}
                        </span>
                        {stamp.verified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                            已认证
                          </span>
                        )}
                        {!stamp.verified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold shrink-0">
                            待审核
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <RiUserLine className="w-3 h-3" />{stamp.nickname}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <RiMailLine className="w-3 h-3" />{stamp.email}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <RiCalendarLine className="w-3 h-3" />{fmt(stamp.created_at)}
                        </span>
                        {stamp.verified && stamp.verified_at && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            认证于 {fmt(stamp.verified_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hasDetails && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : stamp.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                          title={isExpanded ? "收起" : "展开详情"}
                        >
                          {isExpanded
                            ? <RiArrowUpSLine className="w-3.5 h-3.5" />
                            : <RiArrowDownSLine className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                      <button
                        onClick={() => toggleVerify(stamp)}
                        disabled={acting === stamp.id}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                          stamp.verified
                            ? "bg-muted text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600"
                            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                        )}
                      >
                        {acting === stamp.id
                          ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                          : stamp.verified ? "撤销认证" : "认证通过"
                        }
                      </button>
                      <button
                        onClick={() => deleteStamp(stamp.id, stamp.domain)}
                        disabled={acting === stamp.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <RiDeleteBinLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border/50 px-4 py-3 bg-muted/20 space-y-2">
                      {stamp.link && (
                        <div className="flex items-start gap-2">
                          <RiLinkM className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <a href={stamp.link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline break-all">{stamp.link}</a>
                        </div>
                      )}
                      {stamp.description && (
                        <div className="flex items-start gap-2">
                          <RiFileTextLine className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-foreground/80">{stamp.description}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {stamp.id}</span>
                        <span className="text-[10px] text-muted-foreground">样式: {stamp.tag_style}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {stamps.length < total && (
              <div className="text-center py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => load(search, activeFilter, offset + LIMIT)}
                  className="rounded-xl h-9 gap-2"
                >
                  {loading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : null}
                  加载更多（还有 {total - stamps.length} 条）
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
