import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiUserLine, RiMailLine, RiCalendarLine,
} from "@remixicon/react";

type User = {
  id: string; email: string; name: string | null; created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  function load(q: string) {
    setLoading(true);
    fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) toast.error(data.error);
        else { setUsers(data.users || []); setTotal(data.total || 0); }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(""); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    load(search);
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`确定要删除用户 ${email} 吗？此操作不可撤销。`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(prev => prev - 1);
      toast.success("用户已删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  return (
    <AdminLayout title="用户管理">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">用户管理</h2>
            <p className="text-xs text-muted-foreground mt-0.5">共 {total.toLocaleString()} 名注册用户</p>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索邮箱或昵称…"
                className="pl-8 h-9 rounded-xl text-sm w-52"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 rounded-xl px-4">搜索</Button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiUserLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">没有找到用户</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id}
                className="glass-panel border border-border rounded-xl p-4 flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0">
                  <RiUserLine className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{user.name || "未设置昵称"}</p>
                    {user.email === "9208522@qq.com" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300 font-semibold border border-violet-200/50 dark:border-violet-700/30">
                        创始人
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiMailLine className="w-3 h-3" />{user.email}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RiCalendarLine className="w-3 h-3" />{fmt(user.created_at)}
                    </span>
                  </div>
                </div>
                {user.email !== "9208522@qq.com" && (
                  <button
                    onClick={() => deleteUser(user.id, user.email)}
                    disabled={deleting === user.id}
                    className={cn(
                      "p-2 rounded-lg transition-colors text-muted-foreground",
                      "hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500",
                      "opacity-0 group-hover:opacity-100"
                    )}>
                    {deleting === user.id
                      ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                      : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
            {users.length < total && (
              <p className="text-center text-xs text-muted-foreground py-2">显示前 50 条，共 {total} 条</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
