import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiBellLine, RiCalendarLine, RiMailLine,
} from "@remixicon/react";

type Reminder = {
  id: string; domain: string; email: string; active: boolean;
  expiration_date: string | null; created_at: string;
  user_email: string | null;
};

export default function AdminRemindersPage() {
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [acting, setActing] = React.useState<string | null>(null);

  function load(q: string) {
    setLoading(true);
    fetch(`/api/admin/reminders?search=${encodeURIComponent(q)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) toast.error(data.error);
        else { setReminders(data.reminders || []); setTotal(data.total || 0); }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(""); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function deactivate(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/reminders?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, active: false } : r));
      toast.success("已停用订阅");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setActing(null);
    }
  }

  function fmt(d: string | null) {
    if (!d) return "未设置";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  return (
    <AdminLayout title="订阅提醒">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">订阅提醒</h2>
            <p className="text-xs text-muted-foreground mt-0.5">共 {total.toLocaleString()} 条记录</p>
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

        {loading ? (
          <div className="flex justify-center py-12"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
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
                  "glass-panel border rounded-xl p-4 flex items-center gap-3 group",
                  reminder.active ? "border-border" : "border-border/40 opacity-60"
                )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  reminder.active ? "bg-primary/10" : "bg-muted"
                )}>
                  {reminder.active
                    ? <RiBellLine className="w-4 h-4 text-primary" />
                    : <RiBellLine className="w-4 h-4 text-muted-foreground opacity-40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-mono">{reminder.domain}</p>
                    {!reminder.active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">已停用</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiMailLine className="w-3 h-3" />{reminder.email}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiCalendarLine className="w-3 h-3" />到期：{fmt(reminder.expiration_date)}
                    </span>
                  </div>
                </div>
                {reminder.active && (
                  <button
                    onClick={() => deactivate(reminder.id)}
                    disabled={acting === reminder.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    {acting === reminder.id
                      ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                      : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
            {reminders.length < total && (
              <p className="text-center text-xs text-muted-foreground py-2">显示前 50 条，共 {total} 条</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
