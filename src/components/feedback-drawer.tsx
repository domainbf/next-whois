"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { RiCloseLine, RiFlagLine, RiCheckLine, RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ISSUE_TYPES = [
  { key: "inaccurate", label: "数据不准确" },
  { key: "incomplete", label: "数据不完整" },
  { key: "outdated",   label: "数据已过期" },
  { key: "parse_error",label: "解析错误"   },
  { key: "other",      label: "其他"       },
] as const;

type IssueKey = (typeof ISSUE_TYPES)[number]["key"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  query: string;
  queryType: string;
}

export function FeedbackDrawer({ open, onOpenChange, query, queryType }: Props) {
  const [selected, setSelected] = React.useState<Set<IssueKey>>(new Set());
  const [description, setDescription] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const openedAtRef = React.useRef<number>(0);
  const honeypotRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  function reset() {
    setSelected(new Set());
    setDescription("");
    setEmail("");
    setDone(false);
  }

  function toggle(key: IssueKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) {
      toast.warning("请选择至少一个问题类型");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query, queryType,
          issueTypes: Array.from(selected),
          description: description.trim(),
          email: email.trim(),
          _hp: honeypotRef.current?.value ?? "",
          _t: openedAtRef.current,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      setDone(true);
    } catch {
      toast.error("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DrawerContent className="max-h-[88vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <DrawerTitle className="text-sm font-semibold flex items-center gap-1.5">
              <RiFlagLine className="w-3.5 h-3.5 text-amber-500" />
              反馈 <span className="font-mono text-muted-foreground font-normal">{query}</span>
            </DrawerTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">报告查询结果中的问题</p>
          </div>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <RiCloseLine className="w-4 h-4 text-muted-foreground" />
            </button>
          </DrawerClose>
        </div>

        <div className="overflow-y-auto px-4 pb-8">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <RiCheckLine className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold">感谢您的反馈！</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">我们会尽快处理您报告的问题。如果您留下了邮箱，我们会在处理后通知您。</p>
              <button
                onClick={() => { reset(); onOpenChange(false); }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
              >
                关闭
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Honeypot — hidden from real users, bots fill it */}
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-background">
                  {queryType}
                </span>
                <span className="font-mono font-medium text-foreground truncate">{query}</span>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">选择问题类型</p>
                <div className="grid grid-cols-3 gap-2">
                  {ISSUE_TYPES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className={cn(
                        "py-2 px-2 rounded-xl text-xs font-semibold border transition-all active:scale-95",
                        selected.has(key)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="补充说明（可选，最多 500 字）"
                  rows={3}
                  className="w-full text-sm rounded-xl border border-border bg-muted/30 px-3 py-2.5 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{description.length}/500</p>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="联系邮箱（可选，方便我们回复您）"
                className="w-full text-sm rounded-xl border border-border bg-muted/30 px-3 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />

              <button
                onClick={submit}
                disabled={submitting || selected.size === 0}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 active:scale-[0.98]"
              >
                {submitting ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : null}
                提交反馈
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
