import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiShieldCheckLine, RiShieldLine, RiCalendarLine, RiMailLine,
} from "@remixicon/react";

type Stamp = {
  id: string; domain: string; tag_name: string; tag_style: string;
  verified: boolean; verified_at: string | null; created_at: string;
  user_email: string | null;
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

export default function AdminStampsPage() {
  const [stamps, setStamps] = React.useState<Stamp[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [acting, setActing] = React.useState<string | null>(null);

  function load(q: string) {
    setLoading(true);
    fetch(`/api/admin/stamps?search=${encodeURIComponent(q)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) toast.error(data.error);
        else { setStamps(data.stamps || []); setTotal(data.total || 0); }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(""); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function toggleVerify(id: string, current: boolean) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/stamps?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStamps(prev => prev.map(s =>
        s.id === id ? { ...s, verified: !current, verified_at: !current ? new Date().toISOString() : null } : s
      ));
      toast.success(current ? "已撤销认证" : "已认证");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setActing(null);
    }
  }

  async function deleteStamp(id: string, domain: string) {
    if (!confirm(`确定要删除 ${domain} 的品牌认领吗？`)) return;
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

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  return (
    <AdminLayout title="品牌认领">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">品牌认领</h2>
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
        ) : stamps.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiShieldCheckLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">没有找到记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stamps.map(stamp => (
              <div key={stamp.id}
                className="glass-panel border border-border rounded-xl p-4 flex items-center gap-3 group">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  stamp.verified ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"
                )}>
                  {stamp.verified
                    ? <RiShieldCheckLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <RiShieldLine className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-mono">{stamp.domain}</p>
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", TAG_COLORS[stamp.tag_style] || TAG_COLORS.personal)}>
                      {stamp.tag_name}
                    </span>
                    {stamp.verified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                        已认证
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {stamp.user_email && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <RiMailLine className="w-3 h-3" />{stamp.user_email}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiCalendarLine className="w-3 h-3" />{fmt(stamp.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleVerify(stamp.id, stamp.verified)}
                    disabled={acting === stamp.id}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                      stamp.verified
                        ? "bg-muted text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600"
                        : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                    )}>
                    {acting === stamp.id
                      ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                      : stamp.verified ? "撤销认证" : "认证"}
                  </button>
                  <button
                    onClick={() => deleteStamp(stamp.id, stamp.domain)}
                    disabled={acting === stamp.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors">
                    <RiDeleteBinLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {stamps.length < total && (
              <p className="text-center text-xs text-muted-foreground py-2">显示前 50 条，共 {total} 条</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
