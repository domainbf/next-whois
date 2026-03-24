import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiLoader4Line, RiSearchLine, RiRefreshLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { LIFECYCLE_TABLE } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

type Override = {
  id: string; tld: string;
  grace: number; redemption: number; pending_delete: number;
  registry: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

const EMPTY_FORM = { tld: "", grace: "0", redemption: "0", pending_delete: "0", registry: "", notes: "" };

export default function AdminTldLifecyclePage() {
  const [rows, setRows] = React.useState<Override[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Override | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tld-lifecycle");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRows(data.overrides);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: Override) {
    setEditing(row);
    setForm({
      tld: row.tld,
      grace: String(row.grace),
      redemption: String(row.redemption),
      pending_delete: String(row.pending_delete),
      registry: row.registry ?? "",
      notes: row.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.tld.trim()) return toast.error("TLD 不能为空");
    setSaving(true);
    try {
      const url = editing ? `/api/admin/tld-lifecycle?id=${editing.id}` : "/api/admin/tld-lifecycle";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tld: form.tld.trim().toLowerCase(),
          grace: Number(form.grace) || 0,
          redemption: Number(form.redemption) || 0,
          pending_delete: Number(form.pending_delete) || 0,
          registry: form.registry.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      toast.success(editing ? "规则已更新" : "规则已添加");
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Override) {
    if (!confirm(`确认删除 .${row.tld} 的自定义规则？将恢复默认内置值。`)) return;
    setDeleting(row.id);
    try {
      const res = await fetch(`/api/admin/tld-lifecycle?id=${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success(`已删除 .${row.tld} 规则，已恢复默认值`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = rows.filter(r =>
    !search || r.tld.includes(search.toLowerCase()) ||
    (r.registry ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const customTlds = new Set(rows.map(r => r.tld));
  const builtinFiltered = Object.entries(LIFECYCLE_TABLE)
    .filter(([tld]) =>
      !search ||
      tld.includes(search.toLowerCase())
    )
    .sort(([a], [b]) => a.localeCompare(b));

  const [showBuiltin, setShowBuiltin] = React.useState(false);

  function getBuiltIn(tld: string) {
    const entry = LIFECYCLE_TABLE[tld];
    if (!entry) return null;
    return `宽${entry.grace}d 赎${entry.redemption}d 删${entry.pendingDelete}d`;
  }

  const thClass = "py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide";
  const tdClass = "py-2.5 px-3 text-sm";

  return (
    <AdminLayout>
      <Head><title>TLD 生命周期规则 · 管理</title></Head>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">TLD 生命周期规则</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              自定义各 TLD 的宽限期、赎回期、待删除天数，优先级高于系统内置值
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RiRefreshLine className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
              刷新
            </Button>
            <Button size="sm" onClick={openAdd}>
              <RiAddLine className="w-3.5 h-3.5 mr-1.5" /> 添加规则
            </Button>
          </div>
        </div>

        <div className="relative max-w-xs">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-sm"
            placeholder="搜索 TLD / 注册局..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className={thClass}>TLD</th>
                <th className={cn(thClass, "text-center")}>宽限期</th>
                <th className={cn(thClass, "text-center")}>赎回期</th>
                <th className={cn(thClass, "text-center")}>待删除</th>
                <th className={thClass}>注册局</th>
                <th className={thClass}>内置值</th>
                <th className={cn(thClass, "text-right")}>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RiLoader4Line className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span className="text-sm">加载中...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    {search ? `未找到匹配 "${search}" 的规则` : "暂无自定义规则 — 所有 TLD 使用内置默认值"}
                  </td>
                </tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  <td className={cn(tdClass, "font-mono font-semibold")}>.{row.tld}</td>
                  <td className={cn(tdClass, "text-center tabular-nums")}>{row.grace}d</td>
                  <td className={cn(tdClass, "text-center tabular-nums")}>{row.redemption}d</td>
                  <td className={cn(tdClass, "text-center tabular-nums")}>{row.pending_delete}d</td>
                  <td className={cn(tdClass, "text-muted-foreground")}>{row.registry ?? "—"}</td>
                  <td className={cn(tdClass, "text-xs text-muted-foreground font-mono")}>{getBuiltIn(row.tld) ?? "无内置"}</td>
                  <td className={cn(tdClass, "text-right")}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <RiEditLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={deleting === row.id}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                        {deleting === row.id
                          ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                          : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          {rows.length > 0 ? `共 ${rows.length} 条自定义规则；` : "暂无自定义规则 — "}系统内置 {Object.keys(LIFECYCLE_TABLE).length} 个 TLD 的标准值
        </p>

        {/* Built-in reference table */}
        <div className="border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            onClick={() => setShowBuiltin(v => !v)}
          >
            <div>
              <span className="text-sm font-semibold">内置生命周期参考表</span>
              <span className="text-xs text-muted-foreground ml-2">
                {search ? `${builtinFiltered.length} 个匹配 "${search}"` : `共 ${Object.keys(LIFECYCLE_TABLE).length} 个 TLD`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {showBuiltin ? "收起 ▲" : "展开 ▼"}
            </span>
          </button>

          {showBuiltin && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/20 border-b border-t">
                  <tr>
                    <th className={thClass}>TLD</th>
                    <th className={cn(thClass, "text-center")}>宽限期</th>
                    <th className={cn(thClass, "text-center")}>赎回期</th>
                    <th className={cn(thClass, "text-center")}>待删除</th>
                    <th className={cn(thClass, "text-right")}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {builtinFiltered.map(([tld, entry]) => (
                    <tr
                      key={tld}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        customTlds.has(tld) && "opacity-40"
                      )}
                    >
                      <td className={cn(tdClass, "font-mono font-semibold")}>
                        .{tld}
                        {customTlds.has(tld) && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold">已覆盖</span>
                        )}
                      </td>
                      <td className={cn(tdClass, "text-center tabular-nums text-muted-foreground")}>{entry.grace}d</td>
                      <td className={cn(tdClass, "text-center tabular-nums text-muted-foreground")}>{entry.redemption}d</td>
                      <td className={cn(tdClass, "text-center tabular-nums text-muted-foreground")}>{entry.pendingDelete}d</td>
                      <td className={cn(tdClass, "text-right")}>
                        {!customTlds.has(tld) && (
                          <button
                            onClick={() => {
                              setEditing(null);
                              setForm({
                                tld,
                                grace: String(entry.grace),
                                redemption: String(entry.redemption),
                                pending_delete: String(entry.pendingDelete),
                                registry: "",
                                notes: "",
                              });
                              setDialogOpen(true);
                            }}
                            className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors font-medium"
                          >
                            添加覆盖
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `编辑 .${editing.tld} 规则` : "添加 TLD 规则"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">TLD（不含点）</Label>
              <Input
                className="mt-1.5"
                placeholder="com / io / cn / co.uk"
                value={form.tld}
                onChange={e => setForm(f => ({ ...f, tld: e.target.value }))}
                disabled={!!editing}
              />
              {!editing && form.tld && (
                <p className="text-xs text-muted-foreground mt-1">
                  内置值：{getBuiltIn(form.tld) ?? "无内置（将新增）"}
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">宽限期（天）</Label>
                <Input
                  className="mt-1.5 text-center"
                  type="number" min="0" max="365"
                  value={form.grace}
                  onChange={e => setForm(f => ({ ...f, grace: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">赎回期（天）</Label>
                <Input
                  className="mt-1.5 text-center"
                  type="number" min="0" max="365"
                  value={form.redemption}
                  onChange={e => setForm(f => ({ ...f, redemption: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">待删除（天）</Label>
                <Input
                  className="mt-1.5 text-center"
                  type="number" min="0" max="30"
                  value={form.pending_delete}
                  onChange={e => setForm(f => ({ ...f, pending_delete: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">注册局（可选）</Label>
              <Input
                className="mt-1.5"
                placeholder="Verisign / CNNIC / Nominet"
                value={form.registry}
                onChange={e => setForm(f => ({ ...f, registry: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">备注（可选）</Label>
              <TextArea
                className="mt-1.5 text-sm"
                rows={2}
                placeholder="自定义原因、数据来源等"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RiLoader4Line className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {editing ? "保存修改" : "添加规则"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
