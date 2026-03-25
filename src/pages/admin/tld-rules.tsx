import React from "react";
import Head from "next/head";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiLoader4Line,
  RiSearchLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiRobot2Line,
  RiExternalLinkLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiPlayCircleLine,
  RiStopCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TldRule = {
  tld: string;
  grace_period_days: number;
  redemption_period_days: number;
  pending_delete_days: number;
  total_release_days: number;
  source_url: string | null;
  confidence: "high" | "ai" | "est";
  scraped_at: string | null;
  updated_at: string;
};

// Complete list of all IANA-delegated country code TLDs (ccTLDs).
// All 2-letter ISO 3166-1 alpha-2 codes currently in IANA root zone.
// source_url intentionally omitted → API defaults to https://www.iana.org/domains/root/db/{tld}.html
const BATCH_TLDS: { tld: string; source_url?: string }[] = [
  // A
  { tld: "ac" }, { tld: "ad" }, { tld: "ae" }, { tld: "af" }, { tld: "ag" },
  { tld: "ai" }, { tld: "al" }, { tld: "am" }, { tld: "ao" }, { tld: "aq" },
  { tld: "ar" }, { tld: "as" }, { tld: "at" }, { tld: "au" }, { tld: "aw" },
  { tld: "ax" }, { tld: "az" },
  // B
  { tld: "ba" }, { tld: "bb" }, { tld: "bd" }, { tld: "be" }, { tld: "bf" },
  { tld: "bg" }, { tld: "bh" }, { tld: "bi" }, { tld: "bj" }, { tld: "bm" },
  { tld: "bn" }, { tld: "bo" }, { tld: "br" }, { tld: "bs" }, { tld: "bt" },
  { tld: "bw" }, { tld: "by" }, { tld: "bz" },
  // C
  { tld: "ca" }, { tld: "cc" }, { tld: "cd" }, { tld: "cf" }, { tld: "cg" },
  { tld: "ch" }, { tld: "ci" }, { tld: "ck" }, { tld: "cl" }, { tld: "cm" },
  { tld: "cn" }, { tld: "co" }, { tld: "cr" }, { tld: "cu" }, { tld: "cv" },
  { tld: "cw" }, { tld: "cx" }, { tld: "cy" }, { tld: "cz" },
  // D
  { tld: "de" }, { tld: "dj" }, { tld: "dk" }, { tld: "dm" }, { tld: "do" },
  { tld: "dz" },
  // E
  { tld: "ec" }, { tld: "ee" }, { tld: "eg" }, { tld: "er" }, { tld: "es" },
  { tld: "et" }, { tld: "eu" },
  // F
  { tld: "fi" }, { tld: "fj" }, { tld: "fk" }, { tld: "fm" }, { tld: "fo" },
  { tld: "fr" },
  // G
  { tld: "ga" }, { tld: "gd" }, { tld: "ge" }, { tld: "gf" }, { tld: "gg" },
  { tld: "gh" }, { tld: "gi" }, { tld: "gl" }, { tld: "gm" }, { tld: "gn" },
  { tld: "gp" }, { tld: "gq" }, { tld: "gr" }, { tld: "gs" }, { tld: "gt" },
  { tld: "gu" }, { tld: "gw" }, { tld: "gy" },
  // H
  { tld: "hk" }, { tld: "hm" }, { tld: "hn" }, { tld: "hr" }, { tld: "ht" },
  { tld: "hu" },
  // I
  { tld: "id" }, { tld: "ie" }, { tld: "il" }, { tld: "im" }, { tld: "in" },
  { tld: "io" }, { tld: "iq" }, { tld: "ir" }, { tld: "is" }, { tld: "it" },
  // J
  { tld: "je" }, { tld: "jm" }, { tld: "jo" }, { tld: "jp" },
  // K
  { tld: "ke" }, { tld: "kg" }, { tld: "kh" }, { tld: "ki" }, { tld: "km" },
  { tld: "kn" }, { tld: "kp" }, { tld: "kr" }, { tld: "kw" }, { tld: "ky" },
  { tld: "kz" },
  // L
  { tld: "la" }, { tld: "lb" }, { tld: "lc" }, { tld: "li" }, { tld: "lk" },
  { tld: "lr" }, { tld: "ls" }, { tld: "lt" }, { tld: "lu" }, { tld: "lv" },
  { tld: "ly" },
  // M
  { tld: "ma" }, { tld: "mc" }, { tld: "md" }, { tld: "me" }, { tld: "mg" },
  { tld: "mh" }, { tld: "mk" }, { tld: "ml" }, { tld: "mm" }, { tld: "mn" },
  { tld: "mo" }, { tld: "mp" }, { tld: "mq" }, { tld: "mr" }, { tld: "ms" },
  { tld: "mt" }, { tld: "mu" }, { tld: "mv" }, { tld: "mw" }, { tld: "mx" },
  { tld: "my" }, { tld: "mz" },
  // N
  { tld: "na" }, { tld: "nc" }, { tld: "ne" }, { tld: "nf" }, { tld: "ng" },
  { tld: "ni" }, { tld: "nl" }, { tld: "no" }, { tld: "np" }, { tld: "nr" },
  { tld: "nu" }, { tld: "nz" },
  // O
  { tld: "om" },
  // P
  { tld: "pa" }, { tld: "pe" }, { tld: "pf" }, { tld: "pg" }, { tld: "ph" },
  { tld: "pk" }, { tld: "pl" }, { tld: "pm" }, { tld: "pn" }, { tld: "pr" },
  { tld: "ps" }, { tld: "pt" }, { tld: "pw" }, { tld: "py" },
  // Q
  { tld: "qa" },
  // R
  { tld: "re" }, { tld: "ro" }, { tld: "rs" }, { tld: "ru" }, { tld: "rw" },
  // S
  { tld: "sa" }, { tld: "sb" }, { tld: "sc" }, { tld: "sd" }, { tld: "se" },
  { tld: "sg" }, { tld: "sh" }, { tld: "si" }, { tld: "sk" }, { tld: "sl" },
  { tld: "sm" }, { tld: "sn" }, { tld: "so" }, { tld: "sr" }, { tld: "ss" },
  { tld: "st" }, { tld: "su" }, { tld: "sv" }, { tld: "sx" }, { tld: "sy" },
  { tld: "sz" },
  // T
  { tld: "tc" }, { tld: "td" }, { tld: "tf" }, { tld: "tg" }, { tld: "th" },
  { tld: "tj" }, { tld: "tk" }, { tld: "tl" }, { tld: "tm" }, { tld: "tn" },
  { tld: "to" }, { tld: "tr" }, { tld: "tt" }, { tld: "tv" }, { tld: "tw" },
  { tld: "tz" },
  // U
  { tld: "ua" }, { tld: "ug" }, { tld: "uk" }, { tld: "us" }, { tld: "uy" },
  { tld: "uz" },
  // V
  { tld: "va" }, { tld: "vc" }, { tld: "ve" }, { tld: "vg" }, { tld: "vi" },
  { tld: "vn" }, { tld: "vu" },
  // W
  { tld: "wf" }, { tld: "ws" },
  // Y
  { tld: "ye" }, { tld: "yt" },
  // Z
  { tld: "za" }, { tld: "zm" }, { tld: "zw" },
];

type BatchStatus = "idle" | "running" | "done";
type BatchItem = {
  tld: string;
  status: "pending" | "ok" | "error" | "skipped";
  msg?: string;
};

export default function AdminTldRulesPage() {
  const [rules, setRules] = React.useState<TldRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [scraping, setScraping] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ tld: "", source_url: "" });
  const [lastResult, setLastResult] = React.useState<any>(null);

  // Batch state
  const [batchStatus, setBatchStatus] = React.useState<BatchStatus>("idle");
  const [batchItems, setBatchItems] = React.useState<BatchItem[]>([]);
  const [batchIdx, setBatchIdx] = React.useState(0);
  const batchAbortRef = React.useRef(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tld-rules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRules(data.rules ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    const tld = form.tld.toLowerCase().replace(/^\./, "").trim();
    if (!tld) {
      toast.error("请填写 TLD");
      return;
    }
    setScraping(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/tld-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tld, source_url: form.source_url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "抓取失败");
      setLastResult(data);
      toast.success(`.${tld} 规则提取成功！`);
      setForm({ tld: "", source_url: "" });
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "抓取失败";
      toast.error(msg);
      setLastResult({ error: msg });
    } finally {
      setScraping(false);
    }
  }

  async function handleDelete(tld: string) {
    if (!confirm(`确定删除 .${tld} 的规则吗？`)) return;
    setDeleting(tld);
    try {
      const res = await fetch("/api/admin/tld-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tld }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      toast.success(`已删除 .${tld}`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  // ── Batch scrape ──────────────────────────────────────────────────────────
  function startBatch() {
    // Only scrape TLDs not already in DB
    const existing = new Set(rules.map(r => r.tld));
    const todo = BATCH_TLDS.filter(t => !existing.has(t.tld));
    if (todo.length === 0) {
      toast.info("所有预置 TLD 已抓取完毕，无需重复");
      return;
    }
    batchAbortRef.current = false;
    setBatchItems(todo.map(t => ({ tld: t.tld, status: "pending" })));
    setBatchIdx(0);
    setBatchStatus("running");
  }

  function stopBatch() {
    batchAbortRef.current = true;
    setBatchStatus("done");
    toast.info("已停止批量抓取");
  }

  // Drive batch processing via effect
  React.useEffect(() => {
    if (batchStatus !== "running") return;
    if (batchIdx >= batchItems.length) {
      setBatchStatus("done");
      toast.success(`批量抓取完成，共处理 ${batchItems.length} 个 TLD`);
      load();
      return;
    }
    if (batchAbortRef.current) return;

    const item = batchItems[batchIdx];
    const batchTld = BATCH_TLDS.find(t => t.tld === item.tld);

    (async () => {
      setBatchItems(prev =>
        prev.map((it, i) => i === batchIdx ? { ...it, status: "pending" } : it)
      );
      try {
        const res = await fetch("/api/admin/tld-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tld: item.tld,
            source_url: batchTld?.source_url,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const isRateLimit = res.status === 429;
          setBatchItems(prev =>
            prev.map((it, i) =>
              i === batchIdx
                ? { ...it, status: isRateLimit ? "skipped" : "error", msg: data.error }
                : it
            )
          );
        } else {
          setBatchItems(prev =>
            prev.map((it, i) =>
              i === batchIdx
                ? { ...it, status: "ok", msg: `总${data.total_release_days}天` }
                : it
            )
          );
        }
      } catch (err: any) {
        setBatchItems(prev =>
          prev.map((it, i) =>
            i === batchIdx ? { ...it, status: "error", msg: err.message } : it
          )
        );
      } finally {
        if (!batchAbortRef.current) {
          // 1.5s delay between requests to be polite to external servers
          await new Promise(r => setTimeout(r, 1500));
          setBatchIdx(i => i + 1);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchStatus, batchIdx]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rules;
    return rules.filter(r => r.tld.includes(q));
  }, [rules, search]);

  function confidenceBadge(c: string) {
    if (c === "high") return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">官方</span>;
    if (c === "ai") return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">AI</span>;
    return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">估算</span>;
  }

  const batchDone = batchItems.filter(i => i.status === "ok").length;
  const batchErr = batchItems.filter(i => i.status === "error").length;
  const batchSkip = batchItems.filter(i => i.status === "skipped").length;
  const batchPct = batchItems.length
    ? Math.round(((batchDone + batchErr + batchSkip) / batchItems.length) * 100)
    : 0;

  return (
    <AdminLayout>
      <Head><title>TLD 生命周期规则 - AI 抓取</title></Head>

      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-semibold">TLD 生命周期规则 — AI 自动抓取</h1>
          <p className="text-sm text-muted-foreground mt-1">
            从注册局官网爬取域名宽限期规则，通过 GLM-4-Flash 精准提取天数，用于域名释放时间计算。
          </p>
        </div>

        {/* Single scrape form */}
        <div className="border rounded-xl p-5 space-y-4 bg-card">
          <h2 className="font-medium flex items-center gap-2">
            <RiRobot2Line className="w-4 h-4 text-blue-500" />
            抓取单个 TLD
          </h2>
          <form onSubmit={handleScrape} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TLD（不含点）</Label>
              <Input
                placeholder="如 mk"
                value={form.tld}
                onChange={e => setForm(f => ({ ...f, tld: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                注册局页面 URL
                <span className="ml-1 text-muted-foreground/60">（可选，留空自动用 IANA 官方页）</span>
              </Label>
              <Input
                placeholder={form.tld
                  ? `https://www.iana.org/domains/root/db/${form.tld.toLowerCase().replace(/^\./, "")}.html`
                  : "留空则自动使用 IANA 官方页面"}
                value={form.source_url}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={scraping} className="h-9 gap-1.5 shrink-0">
              {scraping ? (
                <><RiLoader4Line className="w-4 h-4 animate-spin" />抓取中…</>
              ) : (
                <><RiRobot2Line className="w-4 h-4" />抓取</>
              )}
            </Button>
          </form>

          {scraping && (
            <p className="text-xs text-muted-foreground animate-pulse">
              正在爬取页面，调用 GLM-4-Flash 提取规则，请稍等 5-15 秒…
            </p>
          )}

          {lastResult && (
            <div className={cn(
              "rounded-lg p-4 text-sm border",
              lastResult.error
                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            )}>
              {lastResult.error ? (
                <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                  <RiErrorWarningLine className="w-4 h-4 mt-0.5 shrink-0" />
                  {lastResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                    <RiCheckboxCircleLine className="w-4 h-4" />
                    .{lastResult.tld} 提取成功
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">宽限期</div>
                      <div className="font-bold text-lg">{lastResult.grace_period_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">赎回期</div>
                      <div className="font-bold text-lg">{lastResult.redemption_period_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">待删除期</div>
                      <div className="font-bold text-lg">{lastResult.pending_delete_days}天</div>
                    </div>
                    <div className="bg-white dark:bg-black/20 rounded px-3 py-2">
                      <div className="text-muted-foreground">总释放天数</div>
                      <div className="font-bold text-lg">{lastResult.total_release_days}天</div>
                    </div>
                  </div>
                  {lastResult.reasoning && (
                    <p className="text-xs text-muted-foreground italic">{lastResult.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batch scrape */}
        <div className="border rounded-xl p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <RiPlayCircleLine className="w-4 h-4 text-violet-500" />
              国别域名 (ccTLD) 批量抓取
              <span className="text-xs text-muted-foreground font-normal">
                — 全部 {BATCH_TLDS.length} 个 ISO 3166-1 国别域名，跳过已有数据，自动使用 IANA 页面
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {batchStatus === "running" ? (
                <Button variant="outline" size="sm" onClick={stopBatch} className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
                  <RiStopCircleLine className="w-4 h-4" />停止
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={startBatch} className="gap-1.5">
                  <RiPlayCircleLine className="w-4 h-4" />
                  {batchStatus === "done" ? "重新批量" : "开始批量抓取"}
                </Button>
              )}
            </div>
          </div>

          {batchItems.length > 0 && (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {batchStatus === "running"
                      ? `正在处理 .${batchItems[batchIdx]?.tld ?? "…"} (${batchIdx + 1}/${batchItems.length})`
                      : `完成 ${batchDone} ✓  失败 ${batchErr} ✗  跳过 ${batchSkip}`}
                  </span>
                  <span>{batchPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${batchPct}%` }}
                  />
                </div>
              </div>

              {/* Item list */}
              <div className="max-h-48 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 gap-1">
                {batchItems.map((it, i) => (
                  <div
                    key={it.tld}
                    title={it.msg}
                    className={cn(
                      "text-xs px-2 py-1 rounded flex items-center gap-1",
                      it.status === "ok" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      it.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      it.status === "skipped" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      it.status === "pending" && i === batchIdx && batchStatus === "running" && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                      it.status === "pending" && i !== batchIdx && "bg-muted text-muted-foreground",
                    )}
                  >
                    {it.status === "pending" && i === batchIdx && batchStatus === "running"
                      ? <RiLoader4Line className="w-3 h-3 animate-spin shrink-0" />
                      : it.status === "ok"
                      ? <RiCheckboxCircleLine className="w-3 h-3 shrink-0" />
                      : it.status === "error"
                      ? <RiErrorWarningLine className="w-3 h-3 shrink-0" />
                      : null}
                    .{it.tld}
                    {it.msg && it.status === "ok" && (
                      <span className="text-muted-foreground ml-auto">{it.msg}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchItems.length === 0 && (
            <p className="text-xs text-muted-foreground">
              点击"开始批量抓取"，系统会依次处理所有预置 TLD（已存在的自动跳过），每条间隔 1.5 秒避免对注册局造成压力。
            </p>
          )}
        </div>

        {/* Rules table */}
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <RiSearchLine className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索 TLD…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} 条</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
              <RiRefreshLine className="w-3.5 h-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RiLoader4Line className="w-5 h-5 animate-spin mr-2" />加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {rules.length === 0 ? "暂无规则，请在上方抓取第一个 TLD 或批量抓取" : "无匹配结果"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">TLD</th>
                    <th className="text-right px-3 py-2.5 font-medium">宽限期</th>
                    <th className="text-right px-3 py-2.5 font-medium">赎回期</th>
                    <th className="text-right px-3 py-2.5 font-medium">待删期</th>
                    <th className="text-right px-3 py-2.5 font-medium">总天数</th>
                    <th className="text-left px-3 py-2.5 font-medium">来源</th>
                    <th className="text-left px-3 py-2.5 font-medium">置信度</th>
                    <th className="text-left px-3 py-2.5 font-medium">更新时间</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(r => (
                    <tr key={r.tld} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-medium">.{r.tld}</td>
                      <td className="px-3 py-2.5 text-right">{r.grace_period_days}d</td>
                      <td className="px-3 py-2.5 text-right">{r.redemption_period_days}d</td>
                      <td className="px-3 py-2.5 text-right">{r.pending_delete_days}d</td>
                      <td className="px-3 py-2.5 text-right font-medium">{r.total_release_days}d</td>
                      <td className="px-3 py-2.5">
                        {r.source_url ? (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[160px] truncate"
                          >
                            <RiExternalLinkLine className="w-3 h-3 shrink-0" />
                            <span className="truncate">{new URL(r.source_url).hostname}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{confidenceBadge(r.confidence)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {r.updated_at ? new Date(r.updated_at).toLocaleDateString("zh-CN") : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deleting === r.tld}
                          onClick={() => handleDelete(r.tld)}
                        >
                          {deleting === r.tld
                            ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                            : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1.5">
          <p className="font-medium">使用说明</p>
          <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>单个抓取：只需填写 TLD，URL 可留空（自动用 IANA 官方页）；也可填自定义注册局政策页面 URL</li>
            <li>批量抓取：一键处理全部 {BATCH_TLDS.length} 个 ISO 3166-1 国别域名 (ccTLD)，已有数据的自动跳过，每条间隔 1.5 秒</li>
            <li>系统爬取页面正文，调用 GLM-4-Flash 自动提取宽限期等4个数字</li>
            <li>提取结果自动保存，优先级高于代码内置静态值，直接用于域名释放时间计算和订阅提醒</li>
            <li>同一 TLD 每小时限制抓取一次，防止被注册局封禁</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
