import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowLeftSLine, RiSearchLine, RiLoader4Line,
  RiCheckLine, RiFileCopyLine, RiFileList2Line,
  RiArrowLeftSFill, RiArrowRightSFill, RiAlertLine,
  RiGlobalLine, RiSmartphoneLine, RiAppsLine, RiThunderstormsLine,
  RiRefreshLine, RiWifiLine, RiWifiOffLine,
} from "@remixicon/react";
import type { IcpRecord, IcpResponse } from "@/pages/api/icp/query";
import type { IcpHealthResponse } from "@/pages/api/icp/health";

// ── Type definitions ─────────────────────────────────────────────────────────

const ICP_TYPES = [
  { id: "web",   label: "网站",       labelEn: "Website",      icon: RiGlobalLine,        color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-500/8 border-blue-500/30",    blacklist: false },
  { id: "app",   label: "APP",        labelEn: "App",          icon: RiSmartphoneLine,    color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/8 border-violet-500/30", blacklist: false },
  { id: "mapp",  label: "小程序",     labelEn: "Mini Program", icon: RiAppsLine,          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/30", blacklist: false },
  { id: "kapp",  label: "快应用",     labelEn: "Quick App",   icon: RiThunderstormsLine, color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/8 border-amber-500/30",   blacklist: false },
  { id: "bweb",  label: "违规网站",   labelEn: "Illegal Web",  icon: RiGlobalLine,        color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/8 border-red-500/30",       blacklist: true  },
  { id: "bapp",  label: "违规APP",    labelEn: "Illegal App",  icon: RiSmartphoneLine,   color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/8 border-red-500/30",       blacklist: true  },
  { id: "bmapp", label: "违规小程序", labelEn: "Illegal Mini", icon: RiAppsLine,          color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/8 border-red-500/30",       blacklist: true  },
  { id: "bkapp", label: "违规快应用", labelEn: "Illegal Quick",icon: RiThunderstormsLine, color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/8 border-red-500/30",       blacklist: true  },
] as const;

type IcpTypeId = typeof ICP_TYPES[number]["id"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation"
      title="复制"
    >
      {copied ? <RiCheckLine className="w-3 h-3 text-emerald-500" /> : <RiFileCopyLine className="w-3 h-3" />}
    </button>
  );
}

function InfoRow({ label, value, mono, wide }: { label: string; value?: string | number | null | boolean; mono?: boolean; wide?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value);
  return (
    <div className={cn("flex items-start gap-2 py-2 border-b border-border/40 last:border-0", wide && "flex-col gap-0.5")}>
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className={cn("text-xs break-all flex-1", mono && "font-mono")}>{str}</span>
        {str && <CopyButton text={str} />}
      </div>
    </div>
  );
}

function BlackListBadge({ level }: { level?: string | number | null }) {
  if (level === null || level === undefined) return null;
  const n = Number(level);
  if (n === 2) return <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-0 px-1.5">暂无违规</Badge>;
  return <Badge className="text-[9px] bg-red-500/10 text-red-500 border-0 px-1.5">威胁等级 {level}</Badge>;
}

function RecordCard({ record, isBlacklist }: { record: IcpRecord; isBlacklist: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4 space-y-0.5"
    >
      {/* Title row */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {record.domain && (
            <span className="font-mono font-semibold text-sm text-foreground">{record.domain}</span>
          )}
          {record.serviceName && record.serviceName !== record.domain && (
            <span className="text-sm font-medium text-foreground">{record.serviceName}</span>
          )}
          {record.version && (
            <Badge variant="outline" className="text-[9px] font-mono">{record.version}</Badge>
          )}
        </div>
        {isBlacklist && <BlackListBadge level={record.blackListLevel} />}
        {record.limitAccess === true || record.limitAccess === "是" || record.limitAccess === "1" ? (
          <Badge className="text-[9px] bg-orange-500/10 text-orange-500 border-0">限制接入</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoRow label="主办单位" value={record.unitName} />
        <InfoRow label="单位性质" value={record.natureName} />
        <InfoRow label="ICP备案号" value={record.mainLicence} mono />
        <InfoRow label="服务许可证" value={record.serviceLicence} mono />
        <InfoRow label="服务名称" value={record.serviceName !== record.domain ? record.serviceName : undefined} />
        <InfoRow label="内容类型" value={record.contentTypeName} />
        <InfoRow label="审核通过日期" value={record.updateRecordTime} />
        <InfoRow label="主体地址" value={record.mainUnitAddress} wide />
      </div>
    </motion.div>
  );
}

// ── API health check hook ────────────────────────────────────────────────────
type HealthStatus = "checking" | "online" | "offline";

function useApiHealth() {
  const [status, setStatus] = React.useState<HealthStatus>("checking");
  const [latency, setLatency] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | undefined>();
  const [checking, setChecking] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/icp/health");
      const data: IcpHealthResponse = await res.json();
      setStatus(data.online ? "online" : "offline");
      setLatency(data.latencyMs);
      setError(data.error);
    } catch {
      setStatus("offline");
      setLatency(null);
      setError("检测失败");
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => { check(); }, [check]);

  return { status, latency, error, checking, check };
}

function ApiStatusBadge({ status, latency, error, checking, onRefresh }: {
  status: HealthStatus; latency: number | null; error?: string; checking: boolean; onRefresh: () => void;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={checking}
      title={error ? `错误：${error}` : status === "online" ? `备案数据服务在线，延迟 ${latency}ms` : "备案数据服务离线，点击重新检测"}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border transition-all",
        status === "checking" && "border-border/50 text-muted-foreground bg-muted/30",
        status === "online"   && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8",
        status === "offline"  && "border-red-500/30 text-red-500 bg-red-500/8",
      )}
    >
      {checking ? (
        <RiLoader4Line className="w-3 h-3 animate-spin" />
      ) : status === "online" ? (
        <RiWifiLine className="w-3 h-3" />
      ) : status === "offline" ? (
        <RiWifiOffLine className="w-3 h-3" />
      ) : (
        <RiLoader4Line className="w-3 h-3 animate-spin" />
      )}
      {checking
        ? "检测中…"
        : status === "online"
        ? `在线${latency != null ? ` · ${latency}ms` : ""}`
        : status === "offline"
        ? `离线${error ? ` · ${error}` : ""}  ↺`
        : "检测中…"}
      {!checking && status === "offline" && <RiRefreshLine className="w-3 h-3" />}
    </button>
  );
}

function Pagination({ pageNum, pages, total, pageSize, onPage }: {
  pageNum: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const start = (pageNum - 1) * pageSize + 1;
  const end = Math.min(pageNum * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
      <span className="text-xs text-muted-foreground">
        第 {start}–{end} 条 / 共 {total} 条
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(pageNum - 1)}
          disabled={pageNum <= 1}
          className="p-1.5 rounded-lg border border-border/60 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RiArrowLeftSFill className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono px-2 py-1 rounded-lg border border-border/60 bg-muted/30 min-w-[4rem] text-center">
          {pageNum} / {pages}
        </span>
        <button
          onClick={() => onPage(pageNum + 1)}
          disabled={pageNum >= pages}
          className="p-1.5 rounded-lg border border-border/60 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RiArrowRightSFill className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function IcpPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<IcpTypeId>("web");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<IcpResponse | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { status: apiStatus, latency: apiLatency, error: apiError, checking: apiChecking, check: recheckApi } = useApiHealth();

  // Read initial query from URL
  React.useEffect(() => {
    const q = (router.query.q as string) || "";
    const t = (router.query.type as IcpTypeId) || "web";
    if (q) { setQuery(q); }
    if (ICP_TYPES.find(x => x.id === t)) setSelectedType(t);
  }, [router.query]);

  const handleSearch = React.useCallback(async (searchQuery?: string, type?: IcpTypeId, page = 1) => {
    const q = (searchQuery ?? query).trim();
    const t = type ?? selectedType;
    if (!q) {
      toast.error("请输入查询内容");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setCurrentPage(page);
    router.replace({ pathname: "/icp", query: { q, type: t } }, undefined, { shallow: true });

    try {
      const url = `/api/icp/query?type=${encodeURIComponent(t)}&search=${encodeURIComponent(q)}&pageNum=${page}&pageSize=10`;
      const res = await fetch(url);
      const data: IcpResponse = await res.json();
      setResult(data);
      if (!data.ok) {
        toast.error(data.error || "查询失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType, router]);

  const handlePage = (p: number) => {
    handleSearch(query, selectedType, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTypeChange = (t: IcpTypeId) => {
    setSelectedType(t);
    setResult(null);
    setCurrentPage(1);
  };

  const typeInfo = ICP_TYPES.find(x => x.id === selectedType)!;
  const isBlacklist = typeInfo.blacklist;

  return (
    <>
      <Head>
        <title key="site-title">ICP 备案查询 - Next Whois</title>
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon-sm" className="shrink-0">
                <RiArrowLeftSLine className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                <RiFileList2Line className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">ICP 备案查询</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">网站 · APP · 小程序 · 快应用备案信息</p>
              </div>
              <div className="ml-auto shrink-0">
                <ApiStatusBadge
                  status={apiStatus}
                  latency={apiLatency}
                  error={apiError}
                  checking={apiChecking}
                  onRefresh={recheckApi}
                />
              </div>
            </div>
          </div>

          {/* Offline warning banner */}
          {apiStatus === "offline" && !apiChecking && (
            <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 mb-4 text-sm">
              <RiAlertLine className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium text-orange-600 dark:text-orange-400">备案数据服务当前不可用</span>
                <span className="text-muted-foreground ml-1.5">
                  {apiError || "服务可能正在维护，查询可能失败"}，请稍后重试。
                </span>
              </div>
              <button onClick={recheckApi} className="text-xs text-orange-500 hover:text-orange-600 shrink-0 font-medium flex items-center gap-1">
                <RiRefreshLine className="w-3.5 h-3.5" />重试
              </button>
            </div>
          )}

          {/* Type selector */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {ICP_TYPES.map(t => {
                const Icon = t.icon;
                const active = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTypeChange(t.id as IcpTypeId)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active
                        ? cn(t.bg, t.color, "border-current/30")
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground bg-transparent",
                      t.blacklist && "border-dashed",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {isBlacklist && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500/80">
                <RiAlertLine className="w-3.5 h-3.5 shrink-0" />
                <span>当前查询违法违规应用数据库</span>
              </div>
            )}
          </div>

          {/* Search box */}
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(); }}
            className="flex gap-2 mb-6"
          >
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  selectedType.startsWith("b")
                    ? "输入域名、APP名称或企业名称..."
                    : "输入域名、备案号或企业名称..."
                }
                className="pl-9 font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={loading} className="shrink-0">
              {loading ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiSearchLine className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">查询</span>
            </Button>
          </form>

          {/* Hint chips */}
          {!result && !loading && (
            <div className="flex flex-wrap gap-2 mb-6">
              {["baidu.com", "京ICP证030173号", "深圳市腾讯计算机系统有限公司"].map(hint => (
                <button
                  key={hint}
                  onClick={() => { setQuery(hint); handleSearch(hint, selectedType, 1); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all font-mono"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <RiLoader4Line className="w-8 h-8 animate-spin" />
                <span className="text-sm">正在查询备案信息…</span>
              </motion.div>
            )}

            {/* Error */}
            {!loading && result && !result.ok && (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                <RiAlertLine className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{result.error || "查询失败"}</p>
                <p className="text-xs text-muted-foreground mt-1">请检查输入内容后重试</p>
              </motion.div>
            )}

            {/* No results */}
            {!loading && result?.ok && result.list.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/50 p-10 text-center">
                <RiFileList2Line className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium">未找到相关备案信息</p>
                <p className="text-xs text-muted-foreground mt-1">
                  搜索 <span className="font-mono">{result.search}</span> 在 {typeInfo.label} 数据库中无结果
                </p>
              </motion.div>
            )}

            {/* Results */}
            {!loading && result?.ok && result.list.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                {/* Result header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      找到 <span className="text-foreground font-bold">{result.total}</span> 条备案记录
                    </span>
                    <Badge variant="outline" className="text-[9px]">{typeInfo.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{result.search}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {result.list.map((record, i) => (
                    <RecordCard key={i} record={record} isBlacklist={isBlacklist} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  pageNum={currentPage}
                  pages={result.pages}
                  total={result.total}
                  pageSize={result.pageSize}
                  onPage={handlePage}
                />

                {/* Data note */}
                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                  备案数据来源：工业和信息化部 ICP/IP 地址/域名信息备案管理系统
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </ScrollArea>
    </>
  );
}
