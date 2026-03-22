import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiUserLine, RiMailLine, RiCalendarLine, RiPencilLine,
  RiUserForbidLine, RiUserFollowLine, RiCloseLine,
  RiSaveLine, RiShieldUserLine, RiFileTextLine,
} from "@remixicon/react";

type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  disabled: boolean;
  admin_notes: string | null;
};

function EditModal({ user, onClose, onSaved }: {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}) {
  const [name, setName] = React.useState(user.name || "");
  const [email, setEmail] = React.useState(user.email);
  const [notes, setNotes] = React.useState(user.admin_notes || "");
  const [disabled, setDisabled] = React.useState(user.disabled);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim(), admin_notes: notes.trim() || null, disabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("用户信息已更新");
      onSaved(data.user);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">编辑用户</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <RiUserLine className="w-3.5 h-3.5 text-muted-foreground" />昵称
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="用户昵称（可选）"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <RiMailLine className="w-3.5 h-3.5 text-muted-foreground" />邮箱地址
            </Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              type="email"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <RiFileTextLine className="w-3.5 h-3.5 text-muted-foreground" />管理员备注
            </Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="内部备注，仅管理员可见"
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between glass-panel border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">停用账户</p>
              <p className="text-xs text-muted-foreground mt-0.5">停用后用户将无法登录</p>
            </div>
            <button
              onClick={() => setDisabled(v => !v)}
              className={cn(
                "w-10 h-6 rounded-full transition-colors relative",
                disabled ? "bg-red-500" : "bg-muted"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                disabled ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-10 gap-2">
            {saving ? <><RiLoader4Line className="w-4 h-4 animate-spin" />保存中…</> : <><RiSaveLine className="w-4 h-4" />保存更改</>}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl h-10">
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [disabled, setDisabled] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [editUser, setEditUser] = React.useState<User | null>(null);

  function load(q: string) {
    setLoading(true);
    fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) toast.error(data.error);
        else {
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setDisabled(data.disabled || 0);
        }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(""); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`确定要永久删除用户 ${email} 吗？此操作不可撤销，将同时删除其所有数据。`)) return;
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

  async function toggleDisabled(user: User) {
    setToggling(user.id);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !user.disabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === user.id ? data.user : u));
      setDisabled(prev => user.disabled ? prev - 1 : prev + 1);
      toast.success(user.disabled ? "账户已恢复正常" : "账户已停用");
    } catch (e: any) {
      toast.error(e.message || "操作失败");
    } finally {
      setToggling(null);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  return (
    <AdminLayout title="用户管理">
      {editUser && (
        <EditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={updated => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">用户管理</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {total.toLocaleString()} 名用户
              {disabled > 0 && <span className="ml-1.5 text-red-500">（{disabled} 已停用）</span>}
            </p>
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
          <div className="flex justify-center py-12">
            <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiUserLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">没有找到用户</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id}
                className={cn(
                  "glass-panel border rounded-xl p-4 flex items-center gap-3 group transition-colors",
                  user.disabled
                    ? "border-red-200/50 dark:border-red-800/30 bg-red-50/20 dark:bg-red-950/10"
                    : "border-border"
                )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  user.email === ADMIN_EMAIL
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                    : user.disabled
                      ? "bg-red-100 dark:bg-red-950/40"
                      : "bg-gradient-to-br from-primary/20 to-violet-500/20"
                )}>
                  {user.email === ADMIN_EMAIL
                    ? <RiShieldUserLine className="w-4 h-4 text-white" />
                    : user.disabled
                      ? <RiUserForbidLine className="w-4 h-4 text-red-500" />
                      : <RiUserLine className="w-4 h-4 text-primary" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{user.name || "未设置昵称"}</p>
                    {user.email === ADMIN_EMAIL && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300 font-semibold border border-violet-200/50 dark:border-violet-700/30">
                        创始人
                      </span>
                    )}
                    {user.disabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold">
                        已停用
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
                    {user.id && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono">#{user.id}</span>
                    )}
                  </div>
                  {user.admin_notes && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 truncate">
                      备注：{user.admin_notes}
                    </p>
                  )}
                </div>

                {user.email !== ADMIN_EMAIL && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditUser(user)}
                      className="p-2 rounded-lg transition-colors text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500"
                      title="编辑用户"
                    >
                      <RiPencilLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleDisabled(user)}
                      disabled={toggling === user.id}
                      className={cn(
                        "p-2 rounded-lg transition-colors text-muted-foreground",
                        user.disabled
                          ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-500"
                          : "hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500"
                      )}
                      title={user.disabled ? "恢复账户" : "停用账户"}
                    >
                      {toggling === user.id
                        ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                        : user.disabled
                          ? <RiUserFollowLine className="w-3.5 h-3.5" />
                          : <RiUserForbidLine className="w-3.5 h-3.5" />
                      }
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      disabled={deleting === user.id}
                      className="p-2 rounded-lg transition-colors text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                      title="删除用户"
                    >
                      {deleting === user.id
                        ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                        : <RiDeleteBinLine className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
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
