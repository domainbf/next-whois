import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import {
  RiUserLine, RiShieldCheckLine, RiBellLine, RiSearchLine,
  RiSettings4Line, RiLoader4Line, RiArrowRightLine,
} from "@remixicon/react";

type Stats = { users: number; stamps: number; activeReminders: number; searches: number };

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: React.ElementType; label: string; value: number | undefined;
  href: string; color: string;
}) {
  return (
    <Link href={href}
      className="glass-panel border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">
          {value === undefined ? <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /> : value.toLocaleString()}
        </p>
      </div>
      <RiArrowRightLine className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}

export default function AdminIndexPage() {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={RiUserLine} label="注册用户" value={stats?.users} href="/admin/users" color="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" />
          <StatCard icon={RiShieldCheckLine} label="品牌认领" value={stats?.stamps} href="/admin/stamps" color="bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" />
          <StatCard icon={RiBellLine} label="活跃订阅" value={stats?.activeReminders} href="/admin/reminders" color="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={RiSearchLine} label="查询记录" value={stats?.searches} href="/admin/users" color="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" />
        </div>

        <div className="glass-panel border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <RiSettings4Line className="w-4 h-4 text-primary" />
            快捷操作
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/admin/settings", label: "网站设置", desc: "修改标题、图标、页脚" },
              { href: "/admin/users", label: "用户管理", desc: "查看注册用户列表" },
              { href: "/admin/stamps", label: "品牌审核", desc: "审核品牌认领申请" },
              { href: "/admin/reminders", label: "提醒管理", desc: "管理域名到期订阅" },
            ].map(({ href, label, desc }) => (
              <Link key={href} href={href}
                className="glass-panel border border-border/60 rounded-xl p-3 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
