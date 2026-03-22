import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/lib/site-settings";
import { useTranslation } from "@/lib/i18n";
import {
  RiArrowLeftSLine,
  RiGlobalLine,
  RiSearchLine,
  RiLoader4Line,
  RiCheckLine,
} from "@remixicon/react";

interface TldEntry {
  tld: string;
  type: "rdap" | "whois" | "both" | "none";
  whoisServer?: string;
  rdapUrl?: string;
}

function getSourceBadge(type: TldEntry["type"], isChinese: boolean) {
  switch (type) {
    case "both":
      return <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30 hover:bg-emerald-500/15">RDAP+WHOIS</Badge>;
    case "rdap":
      return <Badge className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-400/30 hover:bg-blue-500/15">RDAP</Badge>;
    case "whois":
      return <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-400/30 hover:bg-violet-500/15">WHOIS</Badge>;
    default:
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">{isChinese ? "有限" : "Limited"}</Badge>;
  }
}

export default function TldsPage() {
  const { locale } = useTranslation();
  const settings = useSiteSettings();
  const isChinese = locale === "zh" || locale === "zh-tw";
  const siteName = settings.site_logo_text || "NEXT WHOIS";

  const [search, setSearch] = React.useState("");
  const [tlds, setTlds] = React.useState<TldEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/whois-servers")
      .then((r) => r.json())
      .then((data) => {
        if (data?.servers) {
          const entries: TldEntry[] = Object.entries(
            data.servers as Record<string, string | null | Record<string, unknown>>
          )
            .map(([tld, cfg]) => {
              let whoisServer: string | undefined;
              let type: TldEntry["type"] = "none";
              if (typeof cfg === "string" && cfg) {
                whoisServer = cfg;
                type = "whois";
              } else if (cfg && typeof cfg === "object") {
                const host = (cfg as any).host || (cfg as any).url || (cfg as any).scraper;
                if (host) { whoisServer = String(host); type = "whois"; }
              }
              return { tld, type, whoisServer } as TldEntry;
            })
            .filter((e) => e.type !== "none")
            .sort((a, b) => a.tld.localeCompare(b.tld));
          setTlds(entries);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\./, "");
    if (!q) return tlds;
    return tlds.filter((t) => t.tld.includes(q));
  }, [tlds, search]);

  const totalCount = tlds.length;

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
                  {isChinese ? "支持 WHOIS / RDAP 查询的所有域名后缀" : "All TLDs supported for WHOIS/RDAP lookup"}
                </p>
              </div>
            </div>
          </div>

          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-2.5 mb-5"
            >
              <div className="glass-panel border border-border rounded-xl p-3 text-center">
                <RiGlobalLine className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold tabular-nums">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground">{isChinese ? "支持后缀总数" : "Total TLDs"}</p>
              </div>
              <div className="glass-panel border border-border rounded-xl p-3 text-center">
                <RiCheckLine className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                <p className="text-lg font-bold tabular-nums">{filtered.length}</p>
                <p className="text-[10px] text-muted-foreground">{isChinese ? "搜索结果" : "Filtered"}</p>
              </div>
            </motion.div>
          )}

          <div className="mb-5">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isChinese ? "搜索后缀，如 com / io / cn ..." : "Search TLD, e.g. com / io / cn ..."}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RiLoader4Line className="w-6 h-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">{isChinese ? "加载中..." : "Loading..."}</p>
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
                {isChinese ? `显示 ${filtered.length} 个后缀` : `Showing ${filtered.length} TLDs`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map((entry, i) => (
                  <motion.div
                    key={entry.tld}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.4) }}
                  >
                    <Link
                      href={`/${entry.tld}.com`}
                      className="glass-panel border border-border rounded-xl p-3 flex flex-col gap-1.5 hover:border-primary/30 hover:bg-muted/30 transition-all group block"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-sm font-bold truncate group-hover:text-primary transition-colors">
                          .{entry.tld}
                        </span>
                        {getSourceBadge(entry.type, isChinese)}
                      </div>
                      {entry.whoisServer && (
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {entry.whoisServer}
                        </p>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          <div className="mt-10 pt-6 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              {isChinese
                ? "点击任意后缀可直接查询示例域名 · 如需添加新后缀请联系管理员"
                : "Click any TLD to run a sample lookup · Contact admin to add new TLDs"}
            </p>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}
