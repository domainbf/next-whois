import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiRefreshLine, RiSearchLine, RiDeleteBin2Line,
  RiGlobalLine, RiCheckboxCircleLine, RiTimeLine, RiBarChartLine,
  RiCalendarLine, RiArrowLeftLine, RiArrowRightLine, RiUserLine,
  RiFireLine, RiAlertLine,
} from "@remixicon/react";

type SearchRecord = {
  id: string;
  query: string;
  queryType: string;
  regStatus: string;
  expirationDate: string | null;
  remainingDays: number | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
};

type PageData = {
  records: SearchRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  stats: { all: number; today: number; available: number; expiring: number; highValue: number; registered: number };
  dailyStats: { day: string; count: number; available: number; registered: number }[];
  topByType: { type: string; count: number }[];
  topQueries: { query: string; type: string; count: number }[];
};

type FilterType = "all" | "available" | "expiring" | "high_value";

const FILTERS: { key: FilterType; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all",        label: "所有记录",   icon: RiSearchLine,          color: "text-blue-500" },
  { key: "available",  label: "可用域名",   icon: RiCheckboxCircleLine,  color: "text-emerald-500" },
  { key: "expiring",   label: "即将到期",   icon: RiAlertLine,           color: "text-orange-500" },
  { key: "high_value", label: "高价值域名", icon: RiFireLine,            color: "text-violet-500" },
];

const DELETE_PERIODS: { key: string; label: string }[] = [
  { key: "yesterday",  label: "删除昨天记录" },
  { key: "day_before", label: "删除前天记录" },
  { key: "week",       label: "删除7天前记录" },
  { key: "month",      label: "删除30天前记录" },
  { key: "all",        label: "清空全部记录" },
];

function fmt(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function regStatusBadge(status: string, remainingDays: number | null) {
  if (status === "unregistered") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">可注册</span>;
  if (status === "registered") {
    if (remainingDays !== null && remainingDays <= 30) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold">{remainingDays}天到期</span>;
    if (remainingDays !== null && remainingDays <= 90) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-semibold">{remainingDays}天到期</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold">已注册</span>;
  }
  if (status === "reserved") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold">保留</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">未知</span>;
}

export default function AdminSearchRecordsPage() {
  const [data, setData] = React.useState<PageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [showStats, setShowStats] = React.useState(true);

  function load(f = filter, p = page) {
    setLoading(true);
    fetch(`/api/admin/search-records?filter=${f}&page=${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast.error(d.error); return; }
        setData(d);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function changeFilter(f: FilterType) {
    setFilter(f);
    setPage(1);
    load(f, 1);
  }

  function changePage(p: number) {
    setPage(p);
    load(filter, p);
  }

  async function deletePeriod(period: string, label: string) {
    const confirmMsg = period === "all"
      ? `确定要清空全部查询记录吗？此操作不可撤销！`
      : `确定要删除"${label}"的查询记录吗？`;
    if (!confirm(confirmMsg)) return;
    setDeleting(period);
    try {
      const res = await fetch("/api/admin/search-records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "删除失败");
      toast.success(`已删除 ${d.deleted} 条记录`);
      setPage(1);
      load(filter, 1);
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  const maxDaily = data?.dailyStats.length
    ? Math.max(...data.dailyStats.map(d => d.count), 1)
    : 1;

  const currentFilterMeta = FILTERS.find(f => f.key === filter)!;

  return (
    <AdminLayout title="查询记录">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">查询记录管理</h2>
            <p className="text-xs text-muted-foreground mt-0.5">所有用户搜索记录统计与分类管理</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStats(s => !s)} className="rounded-xl h-9 gap-2">
              <RiBarChartLine className="w-3.5 h-3.5" />
              {showStats ? "收起统计" : "展开统计"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="rounded-xl h-9 gap-2">
              {loading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiRefreshLine className="w-3.5 h-3.5" />}
              刷新
            </Button>
          </div>
        </div>

        {/* Stats summary cards */}
        {data && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "总记录", value: data.stats.all, color: "text-foreground" },
              { label: "今日新增", value: data.stats.today, color: "text-blue-500" },
              { label: "可用域名", value: data.stats.available, color: "text-emerald-500" },
              { label: "即将到期", value: data.stats.expiring, color: "text-orange-500" },
              { label: "高价值", value: data.stats.highValue, color: "text-violet-500" },
              { label: "已注册", value: data.stats.registered, color: "text-muted-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-panel border border-border rounded-xl p-3 text-center">
                <p className={cn("text-xl font-bold tabular-nums", color)}>{value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Statistics panel */}
        {showStats && data && (
          <div className="glass-panel border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                <RiBarChartLine className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold">统计图表</h3>
              <span className="ml-auto text-xs text-muted-foreground">最近 30 天</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Daily chart */}
              {data.dailyStats.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <RiCalendarLine className="w-3 h-3" />每日查询量（蓝=总量 · 绿=可用 · 橙=已注册）
                  </p>
                  <div className="flex items-end gap-0.5 h-20">
                    {data.dailyStats.map(d => (
                      <div key={d.day} className="flex-1 flex flex-col-reverse gap-0.5 group relative" title={`${d.day}: 共${d.count}次 可用${d.available} 注册${d.registered}`}>
                        <div className="w-full rounded-sm bg-primary/60 hover:bg-primary transition-colors"
                          style={{ height: `${Math.max(2, Math.round((d.count / maxDaily) * 70))}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1">
                    <span>{data.dailyStats[0]?.day?.slice(5)}</span>
                    <span>{data.dailyStats[data.dailyStats.length - 1]?.day?.slice(5)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type breakdown */}
                {data.topByType.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">查询类型分布</p>
                    <div className="space-y-1.5">
                      {data.topByType.map(t => {
                        const total = data.topByType.reduce((s, x) => s + x.count, 0);
                        const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                        return (
                          <div key={t.type} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono w-12 text-muted-foreground uppercase">{t.type}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{t.count.toLocaleString()} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top queries */}
                {data.topQueries.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">热门查询（30天 Top 10）</p>
                    <div className="space-y-1">
                      {data.topQueries.slice(0, 10).map((q, i) => (
                        <div key={`${q.query}-${i}`} className="flex items-center gap-2">
                          <span className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                            i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                          )}>{i + 1}</span>
                          <span className="flex-1 text-xs font-mono truncate">{q.query}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{q.count}次</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete by period */}
        <div className="glass-panel border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <RiDeleteBin2Line className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold">按时段删除记录</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {DELETE_PERIODS.map(({ key, label }) => (
              <Button
                key={key}
                variant={key === "all" ? "destructive" : "outline"}
                size="sm"
                disabled={!!deleting}
                onClick={() => deletePeriod(key, label)}
                className="rounded-xl h-8 text-xs gap-1.5"
              >
                {deleting === key
                  ? <RiLoader4Line className="w-3 h-3 animate-spin" />
                  : <RiDeleteBin2Line className="w-3 h-3" />
                }
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="glass-panel border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {FILTERS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => changeFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                  filter === key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", filter === key ? color : "")} />
                {label}
                {data && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-0.5",
                    filter === key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {key === "all" ? data.stats.all :
                     key === "available" ? data.stats.available :
                     key === "expiring" ? data.stats.expiring :
                     data.stats.highValue}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Record list */}
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.records.length > 0 ? (
            <>
              <div className="divide-y divide-border/50">
                {data.records.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <RiGlobalLine className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold truncate">{r.query}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{r.queryType}</span>
                        {regStatusBadge(r.regStatus, r.remainingDays)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.userEmail && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <RiUserLine className="w-2.5 h-2.5" />
                            {r.userName || r.userEmail}
                          </span>
                        )}
                        {r.expirationDate && r.expirationDate !== "Unknown" && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <RiTimeLine className="w-2.5 h-2.5" />
                            到期：{r.expirationDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fmt(r.createdAt)}</span>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    第 {data.pagination.page} / {data.pagination.totalPages} 页 · 共 {data.pagination.total.toLocaleString()} 条
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => changePage(page - 1)}
                      className="rounded-lg h-7 w-7 p-0"
                    >
                      <RiArrowLeftLine className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={page >= data.pagination.totalPages || loading}
                      onClick={() => changePage(page + 1)}
                      className="rounded-lg h-7 w-7 p-0"
                    >
                      <RiArrowRightLine className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {currentFilterMeta.label}暂无记录
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
