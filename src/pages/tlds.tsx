import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/lib/site-settings";
import { useTranslation } from "@/lib/i18n";
import {
  RiArrowLeftSLine,
  RiGlobalLine,
  RiSearchLine,
  RiLoader4Line,
  RiFlagLine,
  RiStarLine,
} from "@remixicon/react";
import type { TldInfo, IanaTldsResponse } from "./api/iana-tlds";

type FilterType = "all" | "cctld" | "gtld";

export default function TldsPage() {
  const { locale } = useTranslation();
  const settings = useSiteSettings();
  const isChinese = locale === "zh" || locale === "zh-tw";
  const siteName = settings.site_logo_text || "NEXT WHOIS";

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<FilterType>("all");
  const [data, setData] = React.useState<IanaTldsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/iana-tlds")
      .then((r) => r.json())
      .then((d: IanaTldsResponse) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase().replace(/^\./, "");
    let list = data.tlds;
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (!q) return list;
    return list.filter(
      (t) =>
        t.tld.includes(q) ||
        (t.country && t.country.includes(q)) ||
        (t.countryEn && t.countryEn.toLowerCase().includes(q))
    );
  }, [data, search, typeFilter]);

  const handleFilterClick = (f: FilterType) => {
    setTypeFilter((prev) => (prev === f ? "all" : f));
  };

  return (
    <>
      <Head>
        <title key="site-title">{isChinese ? "支持后缀" : "Supported TLDs"} — {siteName}</title>
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-16">

          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/about"
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <RiArrowLeftSLine className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <RiGlobalLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">
                  {isChinese ? "支持后缀" : "Supported TLDs"}
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isChinese
                    ? "IANA 全量后缀列表，标注 WHOIS/RDAP 查询支持情况"
                    : "Full IANA TLD list with WHOIS/RDAP support status"}
                </p>
              </div>
            </div>
          </div>

          {!loading && data && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-2.5 mb-5"
            >
              <button
                onClick={() => handleFilterClick("cctld")}
                className={[
                  "glass-panel border rounded-xl p-3 text-center transition-all cursor-pointer",
                  typeFilter === "cctld"
                    ? "border-blue-500/60 bg-blue-500/8 ring-1 ring-blue-500/30"
                    : "border-border hover:border-blue-400/40 hover:bg-blue-500/5",
                ].join(" ")}
              >
                <RiFlagLine className={["w-4 h-4 mx-auto mb-1 transition-colors", typeFilter === "cctld" ? "text-blue-500" : "text-blue-400/70"].join(" ")} />
                <p className="text-lg font-bold tabular-nums">{data.ccTldCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isChinese ? "国别域名 (ccTLD)" : "Country Code (ccTLD)"}
                </p>
              </button>
              <button
                onClick={() => handleFilterClick("gtld")}
                className={[
                  "glass-panel border rounded-xl p-3 text-center transition-all cursor-pointer",
                  typeFilter === "gtld"
                    ? "border-violet-500/60 bg-violet-500/8 ring-1 ring-violet-500/30"
                    : "border-border hover:border-violet-400/40 hover:bg-violet-500/5",
                ].join(" ")}
              >
                <RiStarLine className={["w-4 h-4 mx-auto mb-1 transition-colors", typeFilter === "gtld" ? "text-violet-500" : "text-violet-400/70"].join(" ")} />
                <p className="text-lg font-bold tabular-nums">{data.gTldCount}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isChinese ? "通用顶级 (gTLD)" : "Generic (gTLD)"}
                </p>
              </button>
            </motion.div>
          )}

          <div className="mb-5">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isChinese
                    ? "搜索后缀、国家名称，如 com / 中国 / china ..."
                    : "Search TLD or country, e.g. com / china ..."
                }
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RiLoader4Line className="w-6 h-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isChinese ? "正在加载 IANA 后缀列表..." : "Loading IANA TLD list..."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <RiGlobalLine className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {isChinese ? "未找到匹配的后缀" : "No matching TLDs found"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground mb-3">
                {isChinese
                  ? `显示 ${filtered.length} 个后缀（共 ${data?.total ?? 0} 个）`
                  : `Showing ${filtered.length} of ${data?.total ?? 0} TLDs`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map((entry) => (
                  <TldCard key={entry.tld} entry={entry} isChinese={isChinese} />
                ))}
              </div>
            </>
          )}

          <div className="mt-10 pt-6 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              {isChinese
                ? "点击统计卡片可按类型筛选 · 数据来源 IANA"
                : "Click the cards above to filter by type · Data source: IANA"}
            </p>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}

const TldCard = React.memo(function TldCard({
  entry,
  isChinese,
}: {
  entry: TldInfo;
  isChinese: boolean;
}) {
  const isCc = entry.type === "cctld";
  const countryLabel = isChinese ? entry.country : entry.countryEn;

  return (
    <div className="glass-panel border border-border rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-sm font-bold truncate">
          .{entry.tld}
        </span>
        {isCc && countryLabel ? (
          <span className="text-[9px] px-1.5 py-0 h-4 leading-4 rounded-sm bg-blue-500/12 text-blue-600 dark:text-blue-400 border border-blue-400/30 truncate max-w-[80px] inline-block">
            {countryLabel}
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0 h-4 leading-4 rounded-sm bg-violet-500/12 text-violet-600 dark:text-violet-400 border border-violet-400/30 inline-block">
            gTLD
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 min-h-[14px]">
        {entry.hasWhois && (
          <span className="text-[9px] px-1.5 py-0 h-4 leading-4 rounded-sm bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30 inline-flex items-center">
            WHOIS
          </span>
        )}
        {entry.hasRdap && (
          <span className="text-[9px] px-1.5 py-0 h-4 leading-4 rounded-sm bg-sky-500/12 text-sky-600 dark:text-sky-400 border border-sky-400/30 inline-flex items-center">
            RDAP
          </span>
        )}
        {!entry.hasWhois && !entry.hasRdap && (
          <span className="text-[10px] text-muted-foreground/40">
            {isChinese ? "暂无服务器" : "No server"}
          </span>
        )}
      </div>
    </div>
  );
});
