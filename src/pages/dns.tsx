import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RiArrowLeftSLine, RiSearchLine, RiLoader4Line, RiCheckLine,
  RiErrorWarningLine, RiTimeLine, RiRefreshLine, RiFileCopyLine,
  RiShieldCheckLine, RiMailLine, RiServerLine, RiGlobalLine,
  RiKeyLine,
} from "@remixicon/react";

type RecordType = "A" | "AAAA" | "MX" | "NS" | "CNAME" | "TXT" | "SOA";

const RECORD_TYPES: { type: RecordType; color: string }[] = [
  { type: "A",     color: "text-blue-600 dark:text-blue-400" },
  { type: "AAAA",  color: "text-indigo-600 dark:text-indigo-400" },
  { type: "MX",    color: "text-violet-600 dark:text-violet-400" },
  { type: "NS",    color: "text-emerald-600 dark:text-emerald-400" },
  { type: "CNAME", color: "text-amber-600 dark:text-amber-400" },
  { type: "TXT",   color: "text-orange-600 dark:text-orange-400" },
  { type: "SOA",   color: "text-rose-600 dark:text-rose-400" },
];

type ResolverResult = {
  name: string; kind: "udp" | "doh";
  records: any[]; flat: string[]; latencyMs: number; error?: string;
};

type DnsResult = {
  name: string; type: RecordType; found: boolean;
  records: any[]; flat: string[]; resolvers: ResolverResult[]; latencyMs: number; error?: string;
  _label?: string;
};

function classifyTxt(val: string): { label: string; color: string } {
  if (/^v=spf1/i.test(val))    return { label: "SPF",   color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
  if (/^v=DMARC1/i.test(val))  return { label: "DMARC", color: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" };
  if (/^v=DKIM1/i.test(val) || (/k=rsa/i.test(val) && /p=/.test(val))) return { label: "DKIM", color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
  if (/^v=BIMI1/i.test(val))   return { label: "BIMI",  color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
  return { label: "TXT", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
      title="复制"
    >
      {copied ? <RiCheckLine className="w-3 h-3 text-emerald-500" /> : <RiFileCopyLine className="w-3 h-3" />}
    </button>
  );
}

function ResolverDots({ resolvers }: { resolvers: ResolverResult[] }) {
  return (
    <div className="flex items-center gap-0.5" title={resolvers.map(r => `${r.name}: ${r.error ?? r.latencyMs + "ms"}`).join(" | ")}>
      {resolvers.map(r => (
        <div
          key={r.name}
          className={cn(
            "rounded-full",
            r.kind === "doh" ? "w-2 h-2 ring-1 ring-inset ring-primary/20" : "w-2 h-2",
            r.error
              ? r.error === "no_record" ? "bg-muted-foreground/25" : "bg-red-400/70"
              : "bg-emerald-400"
          )}
        />
      ))}
    </div>
  );
}

function RecordTypeBadge({ type }: { type: RecordType }) {
  const meta = RECORD_TYPES.find(r => r.type === type);
  return (
    <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-muted/50", meta?.color)}>
      {type}
    </span>
  );
}

function ResultCard({ result }: { result: DnsResult }) {
  if (!result.found) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border/60 bg-muted/5">
        <RecordTypeBadge type={result.type} />
        {result._label && <span className="text-xs font-mono text-muted-foreground/60">{result._label}</span>}
        <span className="text-xs text-muted-foreground">无记录</span>
        <ResolverDots resolvers={result.resolvers} />
        <span className="ml-auto text-[10px] text-muted-foreground">{result.latencyMs}ms</span>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2 border-b border-border/50 bg-muted/20">
        <RecordTypeBadge type={result.type} />
        {result._label && (
          <span className="text-[11px] font-mono text-muted-foreground truncate">{result._label}</span>
        )}
        <ResolverDots resolvers={result.resolvers} />
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {result.flat.length} 条 · {result.latencyMs}ms
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {result.flat.map((flat, i) => {
          const isTxt = result.type === "TXT";
          const cls = isTxt ? classifyTxt(flat) : null;
          return (
            <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 group hover:bg-muted/10 transition-colors">
              {isTxt && cls && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 leading-tight", cls.color)}>
                  {cls.label}
                </span>
              )}
              <span className="text-sm font-mono break-all flex-1 leading-relaxed">{flat}</span>
              <CopyButton text={flat} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function fetchDns(name: string, type: RecordType, label?: string): Promise<DnsResult> {
  const r = await fetch(`/api/dns/records?name=${encodeURIComponent(name)}&type=${type}`);
  const data: DnsResult = await r.json();
  if (label) data._label = label;
  return data;
}

const COMMON_DKIM_SELECTORS = ["google", "dkim", "k1", "k2", "s1", "s2", "mail", "smtp", "default", "selector1", "selector2"];

export default function DnsPage() {
  const router = useRouter();
  const [domain, setDomain] = React.useState("");
  const [activeTypes, setActiveTypes] = React.useState<RecordType[]>(["A"]);
  const [results, setResults] = React.useState<DnsResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [queried, setQueried] = React.useState<string | null>(null);
  const [isEmailPreset, setIsEmailPreset] = React.useState(false);
  const [dkimSelector, setDkimSelector] = React.useState("");
  const [dkimResult, setDkimResult] = React.useState<DnsResult | null>(null);
  const [dkimLoading, setDkimLoading] = React.useState(false);
  const [totalMs, setTotalMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    const q = router.query.q as string;
    const t = router.query.type as string;
    if (q) {
      setDomain(q);
      const types: RecordType[] = t ? (t.split(",").filter(x => RECORD_TYPES.find(r => r.type === x)) as RecordType[]) : ["A"];
      setActiveTypes(types);
      setTimeout(() => doQuery(q, types), 80);
    }
  }, []);

  async function doQuery(d?: string, types?: RecordType[]) {
    const name = (d ?? domain).trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    const qTypes = types ?? activeTypes;
    if (!name) { toast.error("请输入域名"); return; }

    const isEmail = qTypes.includes("MX") && qTypes.includes("TXT");
    setLoading(true);
    setQueried(name);
    setResults([]);
    setDkimResult(null);
    setTotalMs(null);
    setIsEmailPreset(isEmail);

    router.replace({ pathname: "/dns", query: { q: name, type: qTypes.join(",") } }, undefined, { locale: false, shallow: true });

    const t0 = Date.now();
    try {
      const jobs: Promise<DnsResult>[] = qTypes.map(type => fetchDns(name, type));

      // For email preset: auto-add DMARC via _dmarc subdomain
      if (isEmail) {
        jobs.push(fetchDns(`_dmarc.${name}`, "TXT", `_dmarc.${name}`));
      }

      const settled = await Promise.allSettled(jobs);
      const all: DnsResult[] = settled.map((s, i) => {
        if (s.status === "fulfilled") return s.value;
        const type = i < qTypes.length ? qTypes[i] : "TXT";
        return { name: i < qTypes.length ? name : `_dmarc.${name}`, type, found: false, records: [], flat: [], resolvers: [], latencyMs: 0, error: "请求失败" };
      });

      setResults(all);
      setTotalMs(Date.now() - t0);
    } catch (e: any) {
      toast.error(e.message || "查询失败");
    } finally {
      setLoading(false);
    }
  }

  async function queryDkim(selector?: string) {
    const sel = (selector ?? dkimSelector).trim();
    if (!sel || !queried) return;
    setDkimLoading(true);
    try {
      const dkimName = `${sel}._domainkey.${queried}`;
      const result = await fetchDns(dkimName, "TXT", dkimName);
      setDkimResult(result);
    } catch {
      toast.error("DKIM 查询失败");
    } finally {
      setDkimLoading(false);
    }
  }

  async function autoDetectDkim() {
    if (!queried) return;
    setDkimLoading(true);
    try {
      const settled = await Promise.allSettled(
        COMMON_DKIM_SELECTORS.map(sel =>
          fetchDns(`${sel}._domainkey.${queried}`, "TXT", `${sel}._domainkey.${queried}`)
        )
      );
      const found = settled
        .filter((s): s is PromiseFulfilledResult<DnsResult> => s.status === "fulfilled" && s.value.found)
        .map(s => s.value);
      if (found.length === 0) {
        toast("未在常见选择器中找到 DKIM 记录");
        setDkimResult({ name: queried, type: "TXT", found: false, records: [], flat: [], resolvers: [], latencyMs: 0, _label: "auto-detect (无结果)" });
      } else {
        setDkimResult(found[0]);
        if (found[0]._label) {
          const sel = found[0]._label.split("._domainkey.")[0];
          setDkimSelector(sel);
        }
        toast.success(`找到 DKIM: ${found[0]._label}`);
      }
    } catch {
      toast.error("DKIM 自动检测失败");
    } finally {
      setDkimLoading(false);
    }
  }

  function toggleType(type: RecordType) {
    setActiveTypes(prev =>
      prev.includes(type)
        ? prev.length === 1 ? prev : prev.filter(t => t !== type)
        : [...prev, type]
    );
    setIsEmailPreset(false);
  }

  const mainResults = results.filter(r => !r._label || r._label === r.name);
  const subResults  = results.filter(r => r._label && r._label !== r.name);

  // Email security detection from results
  const hasMX    = results.some(r => r.type === "MX" && r.found);
  const hasSPF   = results.some(r => r.type === "TXT" && r.flat.some(f => /^v=spf1/i.test(f)));
  const hasDMARC = [...results, ...(dkimResult ? [dkimResult] : [])].some(
    r => r.type === "TXT" && r.flat.some(f => /^v=DMARC1/i.test(f))
  ) || subResults.some(r => r.found && r.flat.some(f => /^v=DMARC1/i.test(f)));
  const hasDKIM  = dkimResult?.found && dkimResult.flat.some(f => /^v=DKIM1/i.test(f) || (/k=rsa/i.test(f) && /p=/.test(f)));

  return (
    <>
      <Head><title key="site-title">DNS 查询 — NEXT WHOIS</title></Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
              <RiArrowLeftSLine className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <RiServerLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">DNS 查询</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">4×UDP + 2×DoH 并行 · A/MX/TXT/SPF/DMARC/DKIM</p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
            <form onSubmit={e => { e.preventDefault(); doQuery(); }} className="flex gap-2">
              <div className="relative flex-1">
                <RiGlobalLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="pl-9 h-10 rounded-xl font-mono text-sm"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={loading} className="h-10 px-4 rounded-xl gap-2 shrink-0">
                {loading ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiSearchLine className="w-4 h-4" />}
                查询
              </Button>
            </form>

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground">快捷：</span>
              {([
                { label: "基础解析", icon: RiGlobalLine, types: ["A", "AAAA", "CNAME"] as RecordType[] },
                { label: "邮件安全", icon: RiMailLine,   types: ["MX", "TXT"] as RecordType[], email: true },
                { label: "域名服务器",icon: RiServerLine, types: ["NS", "SOA"] as RecordType[] },
              ]).map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setActiveTypes(p.types); setIsEmailPreset(!!p.email); }}
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-colors",
                    JSON.stringify(activeTypes.slice().sort()) === JSON.stringify(p.types.slice().sort())
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <p.icon className="w-3 h-3" />{p.label}
                </button>
              ))}
            </div>

            {/* Record type toggles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground shrink-0">记录类型：</span>
              {RECORD_TYPES.map(({ type, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    "text-[11px] font-mono font-bold px-2 py-0.5 rounded border transition-all",
                    activeTypes.includes(type)
                      ? cn(color, "border-current/30 bg-current/10")
                      : "text-muted-foreground/50 border-border/40 hover:text-muted-foreground hover:border-border"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RiLoader4Line className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">4×UDP + 2×DoH 并行查询中…</p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-3">
              {/* Stats bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold text-muted-foreground">
                  {queried} · {results.filter(r => r.found).length}/{results.length} 有记录
                  {totalMs !== null && <span className="ml-1 text-muted-foreground/60">· {totalMs}ms</span>}
                </p>
                <button
                  onClick={() => doQuery()}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                  title="刷新"
                >
                  <RiRefreshLine className="w-3.5 h-3.5" />
                </button>
                {/* Resolver legend */}
                <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />UDP
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-primary/30" />DoH
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/25" />无记录
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400/70" />错误
                  </div>
                </div>
              </div>

              {/* Resolver stats */}
              {results[0]?.resolvers?.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  {results[0].resolvers.map(r => (
                    <span key={r.name} className="flex items-center gap-1">
                      <span className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full",
                        r.error ? (r.error === "no_record" ? "bg-muted-foreground/30" : "bg-red-400/70") : "bg-emerald-400"
                      )} />
                      {r.name}
                      {!r.error && <span className="text-muted-foreground/50">{r.latencyMs}ms</span>}
                      {r.error && r.error !== "no_record" && <span className="text-red-400/70">{r.error}</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Main results */}
              {mainResults.map(r => <ResultCard key={r.type + r.name} result={r} />)}

              {/* DMARC sub-results */}
              {subResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <RiShieldCheckLine className="w-3.5 h-3.5" />自动子域查询
                  </p>
                  {subResults.map(r => <ResultCard key={r._label} result={r} />)}
                </div>
              )}

              {/* Email security section */}
              {isEmailPreset && (
                <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <RiShieldCheckLine className="w-3.5 h-3.5 text-primary" />邮件安全概览
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { k: "MX",    found: hasMX,    desc: "邮件服务器" },
                      { k: "SPF",   found: hasSPF,   desc: "发送授权" },
                      { k: "DMARC", found: hasDMARC, desc: "_dmarc 子域" },
                      { k: "DKIM",  found: !!hasDKIM, desc: dkimResult ? dkimSelector || "已检测" : "需检测" },
                    ] as const).map(({ k, found, desc }) => (
                      <div key={k} className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold",
                        found
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted border-border text-muted-foreground opacity-60"
                      )}>
                        {found
                          ? <RiCheckLine className="w-3.5 h-3.5 shrink-0" />
                          : <RiErrorWarningLine className="w-3.5 h-3.5 shrink-0" />
                        }
                        <span>{k}</span>
                        <span className="text-[10px] font-normal ml-auto opacity-70">{desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* DKIM checker */}
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <RiKeyLine className="w-3 h-3" />DKIM 检测
                      <span className="text-muted-foreground/50">（需要知道选择器）</span>
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={dkimSelector}
                        onChange={e => setDkimSelector(e.target.value)}
                        placeholder="选择器 selector（如 google、k1、dkim）"
                        className="h-8 text-xs rounded-lg font-mono flex-1"
                        onKeyDown={e => e.key === "Enter" && queryDkim()}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => queryDkim()}
                        disabled={dkimLoading || !dkimSelector.trim()}
                        className="h-8 px-3 text-xs rounded-lg shrink-0"
                      >
                        {dkimLoading ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : "查询"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={autoDetectDkim}
                        disabled={dkimLoading}
                        className="h-8 px-3 text-xs rounded-lg shrink-0"
                        title={`自动尝试: ${COMMON_DKIM_SELECTORS.join(", ")}`}
                      >
                        {dkimLoading ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : "自动检测"}
                      </Button>
                    </div>
                    {dkimResult && <ResultCard result={dkimResult} />}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && results.length === 0 && !queried && (
            <div className="text-center py-12 space-y-2">
              <RiServerLine className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">输入域名，查询任意 DNS 记录</p>
              <p className="text-xs text-muted-foreground/60">支持 A · AAAA · MX · NS · CNAME · TXT · SOA</p>
              <p className="text-xs text-muted-foreground/60">TXT 自动识别 SPF / DMARC / DKIM / BIMI</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground/50 pb-2">
            <span className="flex items-center gap-1"><RiTimeLine className="w-3 h-3" />数据实时获取，不缓存</span>
            <span>|</span>
            <span>UDP: Google · Cloudflare · Quad9 · OpenDNS &nbsp;|&nbsp; DoH: Cloudflare · Google</span>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}
