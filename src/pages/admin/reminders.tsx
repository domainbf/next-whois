import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiBellLine, RiCalendarLine, RiMailLine,
  RiFilterLine, RiTimeLine, RiCloseLine,
} from "@remixicon/react";

type Reminder = {
  id: string;
  domain: string;
  email: string;
  active: boolean;
  expiration_date: string | null;
  days_before: number | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  phase_flags: string | null;
  created_at: string;
};

type FilterTab = "all" | "active" | "inactive";

export default function AdminRemindersPage() {
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [total, setTotal] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0);
  const [inactiveCount, setInactiveCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");
  const [loading, setLoading] = React.useState(false);
  const [acting, setActing] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const LIMIT = 50;

  function load(q: string, filter: FilterTab, off = 0) {
    setLoading(true);
    fetch(`/api/admin/reminders?search=${encodeURIComponent(q)}&filter=${filter}&limit=${LIMIT}&offset=${off}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return; }
        setReminders(off === 0 ? data.reminders || [] : prev => [...prev, ...(data.reminders || [])]);
        setTotal(data.total || 0);
        setActiveCount(data.activeCount || 0);
        setInactiveCount(data.inactiveCount || 0);
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

  async function toggleActive(reminder: Reminder) {
    setActing(reminder.id);
    try {
      const res = await fetch(`/api/admin/reminders?id=${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !reminder.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, ...data.reminder } : r));
      if (reminder.active) {
        setActiveCount(v => v - 1); setInactiveCount(v => v + 1);
      } else {
        setActiveCount(v => v + 1); setInactiveCount(v => v - 1);
      }
      toast.success(reminder.active ? "订阅已停用" : "订阅已恢复");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setActing(null);
    }
  }

  async function hardDelete(id: string, domain: string) {
    if (!confirm(`确定要永久删除 ${domain} 的订阅记录吗？此操作不可撤销。`)) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/reminders?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setReminders(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);
      toast.success("已永久删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setActing(null);
    }
  }

  function fmt(d: string | null) {
    if (!d) return "未设置";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function fmtRelative(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "今天";
    if (days < 30) return `${days} 天前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    return `${Math.floor(days / 365)} 年前`;
  }

  const FILTERS: { key: FilterTab; label: string; count: number; color?: string }[] = [
    { key: "all", label: "全部", count: activeCount + inactiveCount },
    { key: "active", label: "活跃", count: activeCount, color: "emerald" },
    { key: "inactive", label: "已停用", count: inactiveCount },
  ];

  return (
    <AdminLayout title="订阅提醒">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">订阅提醒</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {total.toLocaleString()} 条 · 活跃 {activeCount} · 停用 {inactiveCount}
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索域名或邮箱…"
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
        ) : reminders.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiBellLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">没有找到记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map(reminder => (
              <div key={reminder.id}
                className={cn(
                  "glass-panel border rounded-xl p-4 flex items-start gap-3 group transition-colors",
                  reminder.active
                    ? "border-border"
                    : "border-border/40 bg-muted/10"
                )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  reminder.active ? "bg-primary/10" : "bg-muted"
                )}>
                  <RiBellLine className={cn(
                    "w-4 h-4",
                    reminder.active ? "text-primary" : "text-muted-foreground opacity-40"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-mono">{reminder.domain}</p>
                    {reminder.active
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">活跃</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">已停用</span>
                    }
                    {reminder.days_before && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                        提前 {reminder.days_before} 天
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiMailLine className="w-3 h-3" />{reminder.email}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiCalendarLine className="w-3 h-3" />到期：{fmt(reminder.expiration_date)}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiTimeLine className="w-3 h-3" />订阅于 {fmtRelative(reminder.created_at)}
                    </span>
                  </div>

                  {!reminder.active && reminder.cancel_reason && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      停用原因：{reminder.cancel_reason}
                      {reminder.cancelled_at && ` · ${fmt(reminder.cancelled_at)}`}
                    </p>
                  )}

                  {reminder.phase_flags && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {reminder.phase_flags.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                        <span key={f} className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                  <button
                    onClick={() => toggleActive(reminder)}
                    disabled={acting === reminder.id}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                      reminder.active
                        ? "bg-muted text-muted-foreground hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600"
                        : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                    )}
                    title={reminder.active ? "停用订阅" : "恢复订阅"}
                  >
                    {acting === reminder.id
                      ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                      : reminder.active ? <RiCloseLine className="w-3.5 h-3.5" /> : <RiBellLine className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => hardDelete(reminder.id, reminder.domain)}
                    disabled={acting === reminder.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                    title="永久删除"
                  >
                    <RiDeleteBinLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Load more */}
            {reminders.length < total && (
              <div className="text-center py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => load(search, activeFilter, offset + LIMIT)}
                  className="rounded-xl h-9 gap-2"
                >
                  {loading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : null}
                  加载更多（还有 {total - reminders.length} 条）
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
