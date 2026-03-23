import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiKeyLine, RiAddLine, RiDeleteBinLine, RiFileCopyLine,
  RiToggleLine, RiToggleFill, RiLoader4Line, RiCloseLine,
  RiCheckLine,
} from "@remixicon/react";

type InviteCode = {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  max_uses: number;
  use_count: number;
  created_at: string;
};

export default function InviteCodesPage() {
  const [codes, setCodes] = React.useState<InviteCode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [count, setCount] = React.useState("1");
  const [maxUses, setMaxUses] = React.useState("1");
  const [description, setDescription] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/invite-codes");
      const d = await r.json();
      if (d.codes) setCodes(d.codes);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(count) || 1, max_uses: parseInt(maxUses) || 1, description }),
      });
      const d = await r.json();
      if (d.created) {
        toast.success(`生成 ${d.created.length} 个邀请码`);
        setShowCreate(false);
        setDescription("");
        setCount("1");
        setMaxUses("1");
        load();
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code: InviteCode) {
    await fetch("/api/admin/invite-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: code.id, is_active: !code.is_active }),
    });
    setCodes(cs => cs.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c));
    toast.success(code.is_active ? "已停用" : "已启用");
  }

  async function deleteCode(code: InviteCode) {
    if (!confirm(`确认删除邀请码 ${code.code}？`)) return;
    await fetch("/api/admin/invite-codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: code.id }),
    });
    setCodes(cs => cs.filter(c => c.id !== code.id));
    toast.success("已删除");
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const active = codes.filter(c => c.is_active && c.use_count < c.max_uses).length;
  const used = codes.filter(c => c.use_count >= c.max_uses).length;

  return (
    <AdminLayout title="邀请码管理">
      <Head><title>邀请码管理 · Admin</title></Head>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <RiKeyLine className="w-5 h-5 text-primary" />邀请码管理
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {codes.length} 个 · 可用 {active} 个 · 已耗尽 {used} 个
            </p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-xl h-8" onClick={() => setShowCreate(true)}>
            <RiAddLine className="w-3.5 h-3.5" />生成邀请码
          </Button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
            <div className="relative z-10 w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">生成邀请码</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-muted">
                  <RiCloseLine className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">生成数量</Label>
                    <Input type="number" min="1" max="50" value={count} onChange={e => setCount(e.target.value)} className="h-9 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">最多使用次数</Label>
                    <Input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} className="h-9 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">备注 <span className="text-muted-foreground font-normal">（可选）</span></Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="这批邀请码的用途" className="h-9 rounded-xl" maxLength={100} />
                </div>
                <Button type="submit" disabled={creating} className="w-full h-9 rounded-xl gap-1.5">
                  {creating ? <><RiLoader4Line className="w-3.5 h-3.5 animate-spin" />生成中…</> : <><RiKeyLine className="w-3.5 h-3.5" />生成</>}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            暂无邀请码，点击右上角生成
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-semibold">邀请码</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">备注</th>
                  <th className="text-center px-3 py-2.5 font-semibold">使用</th>
                  <th className="text-center px-3 py-2.5 font-semibold">状态</th>
                  <th className="text-right px-4 py-2.5 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {codes.map(c => {
                  const exhausted = c.use_count >= c.max_uses;
                  return (
                    <tr key={c.id} className={cn("hover:bg-muted/20 transition-colors", !c.is_active && "opacity-50")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold tracking-wider">{c.code}</span>
                          <button
                            onClick={() => copy(c.code)}
                            className="text-muted-foreground/50 hover:text-primary transition-colors"
                            title="复制"
                          >
                            {copied === c.code
                              ? <RiCheckLine className="w-3.5 h-3.5 text-emerald-500" />
                              : <RiFileCopyLine className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {new Date(c.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{c.description || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          exhausted ? "bg-muted text-muted-foreground" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                        )}>
                          {c.use_count}/{c.max_uses}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          exhausted ? "bg-muted text-muted-foreground" :
                          c.is_active ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" :
                          "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                        )}>
                          {exhausted ? "已耗尽" : c.is_active ? "可用" : "已停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(c)}
                            title={c.is_active ? "停用" : "启用"}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {c.is_active
                              ? <RiToggleFill className="w-4 h-4 text-emerald-500" />
                              : <RiToggleLine className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteCode(c)}
                            title="删除"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <RiDeleteBinLine className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
