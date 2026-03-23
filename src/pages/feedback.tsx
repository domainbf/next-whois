import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowLeftSLine, RiFlagLine, RiCheckLine, RiLoader4Line,
  RiServerLine, RiLockLine, RiGlobalLine, RiHeart3Line,
  RiQuestionLine, RiBugLine, RiSparkling2Line,
} from "@remixicon/react";

type QueryType = "domain" | "dns" | "ssl" | "ip" | "general";

interface IssueOption {
  key: string;
  label: string;
  labelEn?: string;
}

const ISSUE_OPTIONS: Record<QueryType, IssueOption[]> = {
  domain: [
    { key: "inaccurate",   label: "数据不准确" },
    { key: "incomplete",   label: "数据不完整" },
    { key: "outdated",     label: "数据已过期" },
    { key: "parse_error",  label: "解析错误" },
    { key: "other",        label: "其他问题" },
  ],
  dns: [
    { key: "resolve_failed",  label: "查询失败 / 超时" },
    { key: "wrong_result",    label: "结果不正确" },
    { key: "missing_record",  label: "记录缺失" },
    { key: "inaccurate",      label: "数据不准确" },
    { key: "other",           label: "其他问题" },
  ],
  ssl: [
    { key: "cert_error",     label: "证书错误 / 不受信任" },
    { key: "chain_error",    label: "证书链错误" },
    { key: "expired_wrong",  label: "过期时间显示有误" },
    { key: "wrong_result",   label: "结果不正确" },
    { key: "other",          label: "其他问题" },
  ],
  ip: [
    { key: "wrong_location", label: "归属地不准确" },
    { key: "wrong_isp",      label: "ISP / 运营商有误" },
    { key: "wrong_asn",      label: "ASN 信息有误" },
    { key: "inaccurate",     label: "数据不准确" },
    { key: "other",          label: "其他问题" },
  ],
  general: [
    { key: "feature_request", label: "功能建议" },
    { key: "bug_report",      label: "程序错误" },
    { key: "question",        label: "使用问题" },
    { key: "other",           label: "其他反馈" },
  ],
};

const TYPE_META: Record<QueryType, { label: string; desc: string; icon: React.ElementType; color: string; placeholder: string }> = {
  domain: {
    label: "WHOIS / 域名数据反馈",
    desc: "帮助我们改进域名查询数据的准确性和完整性",
    icon: RiGlobalLine,
    color: "text-primary bg-primary/10",
    placeholder: "输入域名，如 google.com",
  },
  dns: {
    label: "DNS 查询问题反馈",
    desc: "反馈 DNS 记录查询结果的问题",
    icon: RiServerLine,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    placeholder: "输入域名，如 example.com",
  },
  ssl: {
    label: "SSL 证书检测反馈",
    desc: "反馈证书检测结果的问题",
    icon: RiLockLine,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    placeholder: "输入域名或 IP，如 github.com",
  },
  ip: {
    label: "IP / ASN 查询反馈",
    desc: "反馈 IP 归属地、ISP 或 ASN 信息的问题",
    icon: RiGlobalLine,
    color: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    placeholder: "输入 IP 或 ASN，如 8.8.8.8",
  },
  general: {
    label: "联系我们 / 意见反馈",
    desc: "功能建议、问题报告或其他任何反馈",
    icon: RiSparkling2Line,
    color: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    placeholder: "描述您的问题或需求（可选）",
  },
};

const FADE = { duration: 0.18, ease: "easeOut" as const };

export default function FeedbackPage() {
  const router = useRouter();

  const rawType = (router.query.type as string) || "general";
  const queryType: QueryType = ["domain", "dns", "ssl", "ip", "general"].includes(rawType)
    ? (rawType as QueryType)
    : "general";
  const initQuery = (router.query.q as string) || "";

  const meta = TYPE_META[queryType];
  const Icon = meta.icon;
  const options = ISSUE_OPTIONS[queryType];

  const [query, setQuery] = React.useState(initQuery);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [description, setDescription] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const openedAt = React.useRef(Date.now());
  const [hp, setHp] = React.useState("");

  React.useEffect(() => {
    setQuery((router.query.q as string) || "");
    setSelected(new Set());
    setDone(false);
    openedAt.current = Date.now();
  }, [router.query.q, router.query.type]);

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (queryType !== "general" && !query.trim()) {
      toast.error("请填写查询目标");
      return;
    }
    if (selected.size === 0) {
      toast.error("请至少选择一个问题类型");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || "（通用反馈）",
          queryType,
          issueTypes: Array.from(selected),
          description: description.trim(),
          email: email.trim(),
          _hp: hp,
          _t: openedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || "提交失败，请稍后再试"); return; }
      setDone(true);
    } catch {
      toast.error("提交失败，请检查网络连接");
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = queryType === "domain" ? "/" : queryType === "dns" ? "/dns" : queryType === "ssl" ? "/ssl" : queryType === "ip" ? "/ip" : "/";

  return (
    <>
      <Head>
        <title key="site-title">{meta.label} — NEXT WHOIS</title>
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href={backHref} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground touch-manipulation">
              <RiArrowLeftSLine className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", meta.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">{meta.label}</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-center py-16 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                  <RiCheckLine className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold">感谢您的反馈！</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    我们已收到您的反馈，会尽快进行处理和改进。
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setDone(false); setSelected(new Set()); setDescription(""); setQuery(""); }} className="rounded-xl gap-2">
                    <RiFlagLine className="w-4 h-4" />再提交一条
                  </Button>
                  <Button onClick={() => router.push(backHref)} className="rounded-xl">
                    返回
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE}
                onSubmit={submit}
                className="space-y-5"
              >
                {/* Query input — hidden for general type */}
                {queryType !== "general" && (
                  <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">查询目标</label>
                    <Input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={meta.placeholder}
                      className="h-10 rounded-xl font-mono"
                      autoFocus={!initQuery}
                    />
                  </div>
                )}

                {/* Issue type selector */}
                <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground">
                    问题类型 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggle(opt.key)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-sm font-medium border transition-all touch-manipulation text-left",
                          selected.has(opt.key)
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/40 border-border text-foreground hover:border-primary/40 hover:bg-muted/60"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground">详细描述（可选）</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, 500))}
                    placeholder={queryType === "general" ? "请告诉我们您的建议、需求或遇到的问题…" : "请描述您遇到的具体问题，例如正确的数据应该是什么…"}
                    rows={4}
                    className="w-full text-sm rounded-xl border border-border bg-muted/20 px-3 py-2.5 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
                </div>

                {/* Email */}
                <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground">联系邮箱（可选，用于回复）</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-10 rounded-xl"
                  />
                </div>

                {/* Honeypot — hidden */}
                <div style={{ display: "none" }} aria-hidden>
                  <input tabIndex={-1} value={hp} onChange={e => setHp(e.target.value)} autoComplete="off" />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || selected.size === 0}
                  className="w-full h-11 rounded-xl gap-2 text-sm font-semibold"
                >
                  {submitting
                    ? <RiLoader4Line className="w-4 h-4 animate-spin" />
                    : <RiFlagLine className="w-4 h-4" />
                  }
                  {submitting ? "提交中…" : "提交反馈"}
                </Button>

                <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
                  提交即代表您同意我们将此反馈用于改进服务 · 不会公开您的邮箱地址
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </main>
      </ScrollArea>
    </>
  );
}
