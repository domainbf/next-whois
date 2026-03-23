import React from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "@/components/admin-layout";
import {
  RiUserLine, RiShieldCheckLine, RiBellLine, RiSearchLine,
  RiSettings4Line, RiLoader4Line, RiArrowRightLine, RiUserForbidLine,
  RiFeedbackLine, RiTimeLine, RiGhostLine, RiVipCrownLine,
  RiAddLine, RiBarChartLine,
} from "@remixicon/react";

type Stats = {
  users: number;
  disabledUsers: number;
  stamps: number;
  verifiedStamps: number;
  activeReminders: number;
  searches: number;
  feedback: number;
  anonSearches: number;
  todaySearches: number;
  todayUsers: number;
  subscribedUsers: number;
  recentUsers: { id: string; email: string; name: string | null; created_at: string; disabled: boolean }[];
  recentSearches: { id: string; query: string; query_type: string; created_at: string; user_id: string | null }[];
};

function StatCard({ icon: Icon, label, value, sub, subValue, href, color, badge }: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  sub?: string;
  subValue?: number;
  href: string;
  color: string;
  badge?: { label: string; value: number; color: string };
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href, undefined, { locale: false })}
      className="glass-panel border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all group text-left w-full active:scale-[0.98]"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">
          {value === undefined ? <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /> : value.toLocaleString()}
        </p>
        {sub && subValue !== undefined && subValue > 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}: {subValue.toLocaleString()}</p>
        )}
        {badge && badge.value > 0 && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-1 inline-block ${badge.color}`}>
            {badge.label} {badge.value}
          </span>
        )}
      </div>
      <RiArrowRightLine className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
    </button>
  );
}

function fmt(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default function AdminIndexPage() {
  const router = useRouter();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("加载失败"));
  }, []);

  const QUICK_ACTIONS = [
    { href: "/admin/search-records", label: "查询记录", desc: "查看统计、分类、逐条清理" },
    { href: "/admin/settings",       label: "网站设置", desc: "标题、OG标签、公告" },
    { href: "/admin/users",          label: "用户管理", desc: "编辑、订阅、停用、删除" },
    { href: "/admin/stamps",         label: "品牌审核", desc: "审核品牌认领申请" },
    { href: "/admin/reminders",      label: "提醒管理", desc: "管理域名到期订阅" },
    { href: "/admin/feedback",       label: "用户反馈", desc: "查看用户提交的反馈" },
    { href: "/admin/tld-fallback",   label: "TLD 兜底", desc: "查看并管理第三方备用查询" },
    { href: "/admin/system",         label: "系统状态", desc: "数据库、查询趋势" },
  ];

  return (
    <AdminLayout title="概览">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold">系统概览</h2>
          <p className="text-xs text-muted-foreground mt-0.5">所有核心数据汇总</p>
        </div>

        {error && (
          <div className="glass-panel border border-red-200/50 bg-red-50/30 dark:bg-red-950/20 rounded-xl p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Today quick stats bar */}
        {stats && (stats.todayUsers > 0 || stats.todaySearches > 0) && (
          <div className="glass-panel border border-primary/20 bg-primary/5 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
            <span className="text-xs font-semibold text-primary">今日动态</span>
            {stats.todayUsers > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RiAddLine className="w-3 h-3 text-emerald-500" />
                <span className="font-semibold text-foreground">{stats.todayUsers}</span> 新用户
              </span>
            )}
            {stats.todaySearches > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RiSearchLine className="w-3 h-3 text-blue-500" />
                <span className="font-semibold text-foreground">{stats.todaySearches}</span> 次查询
              </span>
            )}
            {stats.anonSearches > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RiGhostLine className="w-3 h-3 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.anonSearches}</span> 条匿名记录
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard
            icon={RiUserLine} label="注册用户" value={stats?.users}
            sub="已停用" subValue={stats?.disabledUsers}
            href="/admin/users"
            color="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
            badge={stats?.subscribedUsers ? { label: "订阅用户", value: stats.subscribedUsers, color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" } : undefined}
          />
          <StatCard
            icon={RiShieldCheckLine} label="品牌认领" value={stats?.stamps}
            sub="已认证" subValue={stats?.verifiedStamps}
            href="/admin/stamps"
            color="bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
          />
          <StatCard
            icon={RiSearchLine} label="全部查询" value={stats?.searches}
            sub="匿名记录" subValue={stats?.anonSearches}
            href="/admin/search-records"
            color="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
          />
          <StatCard
            icon={RiBellLine} label="活跃订阅" value={stats?.activeReminders}
            href="/admin/reminders"
            color="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={RiFeedbackLine} label="用户反馈" value={stats?.feedback}
            href="/admin/feedback"
            color="bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400"
          />
          <StatCard
            icon={RiVipCrownLine} label="订阅用户" value={stats?.subscribedUsers}
            href="/admin/users"
            color="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Recent users */}
        {stats?.recentUsers && stats.recentUsers.length > 0 && (
          <div className="glass-panel border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <RiTimeLine className="w-4 h-4 text-primary" />最近注册
              </h3>
              <button onClick={() => router.push("/admin/users", undefined, { locale: false })} className="text-xs text-primary hover:underline">查看全部</button>
            </div>
            <div className="space-y-2">
              {stats.recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0">
                    <RiUserLine className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{u.name || u.email}</p>
                    {u.name && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.disabled && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold">停用</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{fmt(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches */}
        {stats?.recentSearches && stats.recentSearches.length > 0 && (
          <div className="glass-panel border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <RiSearchLine className="w-4 h-4 text-primary" />最近查询
              </h3>
              <button onClick={() => router.push("/admin/search-records", undefined, { locale: false })} className="text-xs text-primary hover:underline">查看全部</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.recentSearches.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 glass-panel border border-border/60 rounded-lg px-2.5 py-1.5">
                  {!s.user_id && <RiGhostLine className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />}
                  <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0">{s.query_type}</span>
                  <span className="text-xs font-mono font-semibold truncate max-w-[120px]">{s.query}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmt(s.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="glass-panel border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <RiSettings4Line className="w-4 h-4 text-primary" />快捷操作
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(({ href, label, desc }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href, undefined, { locale: false })}
                className="glass-panel border border-border/60 rounded-xl p-3 hover:border-primary/30 hover:bg-primary/5 transition-all group text-left active:scale-[0.98]"
              >
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
