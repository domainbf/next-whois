import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RiLoader4Line, RiSearchLine, RiDeleteBinLine,
  RiFeedbackLine, RiMailLine, RiCalendarLine, RiGlobalLine,
} from "@remixicon/react";

type FeedbackItem = {
  id: string;
  query: string;
  query_type: string | null;
  issue_types: string;
  description: string | null;
  email: string | null;
  created_at: string;
};

const ISSUE_LABELS: Record<string, { label: string; color: string }> = {
  inaccurate:  { label: "数据不准确",  color: "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400" },
  incomplete:  { label: "数据不完整",  color: "bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" },
  outdated:    { label: "数据已过期",  color: "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400" },
  parse_error: { label: "解析错误",    color: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" },
  other:       { label: "其他",        color: "bg-muted text-muted-foreground" },
};

export default function AdminFeedbackPage() {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  function load(q: string) {
    setLoading(true);
    fetch(`/api/admin/feedback?search=${encodeURIComponent(q)}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) toast.error(data.error);
        else { setItems(data.feedback || []); setTotal(data.total || 0); }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(""); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function deleteItem(id: string) {
    if (!confirm("确定要删除这条反馈吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/feedback?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setItems(prev => prev.filter(f => f.id !== id));
      setTotal(prev => prev - 1);
      toast.success("反馈已删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function parseIssues(raw: string): string[] {
    try { return JSON.parse(raw); } catch { return raw ? [raw] : []; }
  }

  return (
    <AdminLayout title="用户反馈">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">用户反馈</h2>
            <p className="text-xs text-muted-foreground mt-0.5">共 {total.toLocaleString()} 条反馈记录</p>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索查询、邮箱或描述…"
                className="pl-8 h-9 rounded-xl text-sm w-56"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 rounded-xl px-4">搜索</Button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RiLoader4Line className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RiFeedbackLine className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">暂无反馈记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const issues = parseIssues(item.issue_types);
              const isExpanded = expanded === item.id;
              return (
                <div key={item.id}
                  className="glass-panel border border-border rounded-xl overflow-hidden group">
                  <button
                    className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <RiFeedbackLine className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground uppercase font-medium shrink-0">
                          {item.query_type || "domain"}
                        </span>
                        <p className="text-sm font-semibold font-mono truncate">{item.query}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {issues.map(issue => {
                          const meta = ISSUE_LABELS[issue] || ISSUE_LABELS.other;
                          return (
                            <span key={issue} className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", meta.color)}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {item.email && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <RiMailLine className="w-3 h-3" />{item.email}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <RiCalendarLine className="w-3 h-3" />{fmt(item.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                      disabled={deleting === item.id}
                      className={cn(
                        "p-2 rounded-lg transition-colors text-muted-foreground shrink-0",
                        "hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500",
                        "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {deleting === item.id
                        ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                        : <RiDeleteBinLine className="w-3.5 h-3.5" />
                      }
                    </button>
                  </button>

                  {isExpanded && item.description && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mt-3 mb-1 font-medium">用户描述</p>
                      <p className="text-sm text-foreground/80 bg-muted/30 rounded-xl px-3 py-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  )}
                  {isExpanded && !item.description && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mt-3 italic">用户未填写描述</p>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length < total && (
              <p className="text-center text-xs text-muted-foreground py-2">显示前 50 条，共 {total} 条</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
