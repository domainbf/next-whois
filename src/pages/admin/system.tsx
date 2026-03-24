import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiRefreshLine, RiDatabase2Line, RiSearchLine,
  RiShieldCheckLine, RiBellLine, RiUserLine, RiCheckLine,
  RiErrorWarningLine, RiFeedbackLine, RiBarChartLine,
  RiCalendarLine, RiServerLine,
} from "@remixicon/react";

type SystemData = {
  ok: boolean;
  db: { ok: boolean };
  stats: {
    users: { total: number; disabled: number };
    stamps: { total: number; verified: number; pending: number };
    reminders: { total: number; active: number };
    searches: { total: number; today: number };
    feedback: { total: number; recent: number };
  };
  topSearches: { query: string; type: string; count: number }[];
  dailySearches: { day: string; count: number }[];
  settings: { allow_registration: string };
};

function StatItem({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="text-center p-3">
      <p className={cn("text-2xl font-bold tabular-nums", color || "text-foreground")}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminSystemPage() {
  const [data, setData] = React.useState<SystemData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [triggering, setTriggering] = React.useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/system")
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast.error(d.error); return; }
        setData(d);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  async function triggerReminder() {
    if (!confirm("手动触发今日提醒处理？\n系统将查询到期域名并发送邮件通知。")) return;
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/trigger-reminders", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "触发失败");
      toast.success(`提醒已触发：处理 ${d.processed ?? "?"} 条记录`);
    } catch (e: any) {
      toast.error(e.message || "触发失败");
    } finally {
      setTriggering(false);
    }
  }

  const maxDailyCount = data?.dailySearches.length
    ? Math.max(...data.dailySearches.map(d => d.count), 1)
    : 1;

  return (
    <AdminLayout title="系统监控">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">系统监控</h2>
            <p className="text-xs text-muted-foreground mt-0.5">数据库状态、查询统计与运维操作</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="rounded-xl h-9 gap-2"
          >
            {loading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiRefreshLine className="w-3.5 h-3.5" />}
            刷新
          </Button>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            {/* DB health */}
            <div className="glass-panel border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <RiDatabase2Line className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold">数据库</h3>
                <span className={cn(
                  "ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1",
                  data.db.ok
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                )}>
                  {data.db.ok
                    ? <><RiCheckLine className="w-3 h-3" />连接正常</>
                    : <><RiErrorWarningLine className="w-3 h-3" />连接异常</>
                  }
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
                <StatItem label="总用户" value={data.stats.users.total} sub={data.stats.users.disabled > 0 ? `${data.stats.users.disabled} 已停用` : undefined} />
                <StatItem label="品牌认领" value={data.stats.stamps.total} sub={`${data.stats.stamps.pending} 待审`} color={data.stats.stamps.pending > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
                <StatItem label="域名提醒" value={data.stats.reminders.total} sub={`${data.stats.reminders.active} 活跃`} color="text-primary" />
                <StatItem label="用户反馈" value={data.stats.feedback.total} sub={`${data.stats.feedback.recent} 近7天`} color={data.stats.feedback.recent > 0 ? "text-violet-600 dark:text-violet-400" : undefined} />
              </div>
            </div>

            {/* Search stats */}
            <div className="glass-panel border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                  <RiBarChartLine className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold">查询统计</h3>
                <span className="ml-auto text-xs text-muted-foreground">最近 7 天</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-primary">{data.stats.searches.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">累计查询</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{data.stats.searches.today.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">今日查询</p>
                  </div>
                </div>

                {data.dailySearches.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <RiCalendarLine className="w-3 h-3" />每日查询量
                    </p>
                    <div className="flex items-end gap-1 h-16">
                      {data.dailySearches.map(d => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group">
                          <div
                            className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors"
                            style={{ height: `${Math.max(4, Math.round((d.count / maxDailyCount) * 56))}px` }}
                            title={`${d.day}: ${d.count} 次`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1">
                      <span>{data.dailySearches[0]?.day?.slice(5)}</span>
                      <span>{data.dailySearches[data.dailySearches.length - 1]?.day?.slice(5)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top queries */}
            {data.topSearches.length > 0 && (
              <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <RiSearchLine className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold">热门查询</h3>
                  <span className="ml-auto text-xs text-muted-foreground">近 7 天 Top 10</span>
                </div>
                <div className="divide-y divide-border/50">
                  {data.topSearches.map((s, i) => (
                    <div key={`${s.query}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                      )}>{i + 1}</span>
                      <span className="flex-1 text-sm font-mono truncate">{s.query}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{s.type}</span>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">{s.count}次</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cron & operations */}
            <div className="glass-panel border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <RiServerLine className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold">运维操作</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <RiBellLine className="w-4 h-4 text-primary" />手动触发提醒处理
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cron 每日 09:00 UTC 自动执行 · 管理员可在此一键手动触发
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerReminder}
                    disabled={triggering}
                    className="rounded-xl h-9 gap-2 shrink-0"
                  >
                    {triggering ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiBellLine className="w-3.5 h-3.5" />}
                    触发提醒
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 flex-wrap">
                  <RiCheckLine className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Cron 配置：<span className="font-mono">/api/cron/ping</span> 08:00 UTC · <span className="font-mono">/api/remind/process</span> 09:00 UTC</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <RiUserLine className="w-3.5 h-3.5 shrink-0" />
                  <span>注册状态：{data.settings.allow_registration === "1" || data.settings.allow_registration === "" ? "开放注册" : "已关闭注册"}</span>
                  <RiShieldCheckLine className="w-3.5 h-3.5 ml-2 shrink-0" />
                  <span>管理员：<span className="font-mono">9208522@qq.com</span></span>
                  <RiFeedbackLine className="w-3.5 h-3.5 ml-2 shrink-0" />
                  <span>近7天反馈：{data.stats.feedback.recent} 条</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">加载失败，请刷新重试</div>
        )}
      </div>
    </AdminLayout>
  );
}
