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
import { useSiteSettings } from "@/lib/site-settings";
import {
  RiArrowLeftSLine, RiSearchLine, RiLoader4Line,
  RiGlobalLine, RiMapPinLine, RiWifiLine, RiTimeLine,
  RiShieldLine, RiServerLine, RiFileCopyLine, RiCheckLine,
  RiAlertLine, RiExternalLinkLine,
} from "@remixicon/react";

type IpResult = {
  type: "ipv4" | "ipv6" | "asn";
  query: string;
  resolvedFrom: string | null;
  flag: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  zip: string | null;
  timezone: string | null;
  offset: number | null;
  currency: string | null;
  lat: number | null;
  lon: number | null;
  isp: string | null;
  org: string | null;
  as: string | null;
  asname: string | null;
  reverse: string | null;
  mobile: boolean | null;
  proxy: boolean | null;
  hosting: boolean | null;
  rdap: Record<string, string>;
  asn?: number;
  error?: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground touch-manipulation"
      title="复制"
    >
      {copied ? <RiCheckLine className="w-3 h-3 text-emerald-500" /> : <RiFileCopyLine className="w-3 h-3" />}
    </button>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value?: string | number | null; mono?: boolean; badge?: React.ReactNode }) {
  if (!value && value !== 0) return null;
  const str = String(value);
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={cn("text-sm break-all flex-1", mono && "font-mono")}>{str}</span>
        {badge}
        {str && <CopyButton text={str} />}
      </div>
    </div>
  );
}

function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean | null; trueLabel: string; falseLabel?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0",
      value
        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
    )}>
      {value ? trueLabel : (falseLabel || `非${trueLabel}`)}
    </span>
  );
}

const FADE = { duration: 0.18, ease: "easeOut" as const };

export default function IpPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const siteLabel = settings.site_logo_text || "X.RW";
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<IpResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.q as string;
    if (q) {
      setQuery(q);
      setTimeout(() => doQuery(q), 50);
    }
  }, [router.isReady]);

  async function doQuery(q?: string) {
    const input = (q ?? query).trim();
    if (!input) { toast.error("请输入 IP 地址、主机名或 ASN"); return; }

    setLoading(true);
    setResult(null);
    router.replace({ pathname: "/ip", query: { q: input } }, undefined, { locale: false, shallow: true });

    try {
      const res = await fetch(`/api/ip/lookup?q=${encodeURIComponent(input)}`);
      const data: IpResult = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || "查询失败");
    } finally {
      setLoading(false);
    }
  }

  const hasResult = !loading && !!result;

  return (
    <>
      <Head><title key="site-title">{`IP / ASN 查询 — ${siteLabel}`}</title></Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground touch-manipulation">
              <RiArrowLeftSLine className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <RiGlobalLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">IP / ASN 查询</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">归属地 · ISP · ASN · 代理检测 · RDAP · 时区</p>
              </div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); doQuery(); }} className="flex gap-2">
            <div className="relative flex-1">
              <RiGlobalLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="8.8.8.8 · 2001:db8:: · AS15169 · example.com"
                className="pl-9 h-10 rounded-xl font-mono text-base sm:text-sm"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="h-10 px-4 rounded-xl gap-2 shrink-0">
              {loading ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : <RiSearchLine className="w-4 h-4" />}
              查询
            </Button>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground">示例：</span>
            {["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "AS15169", "AS13335"].map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => { setQuery(ex); doQuery(ex); }}
                className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-violet-300 dark:hover:border-violet-700 transition-colors touch-manipulation"
              >
                {ex}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-violet-500/20" />
                    <RiLoader4Line className="w-6 h-6 animate-spin text-violet-500 absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">正在查询归属地和 RDAP 信息…</p>
                    <p className="text-xs text-muted-foreground mt-1">ip-api.com · ARIN / RIPE / APNIC</p>
                  </div>
                </div>
              </motion.div>
            ) : hasResult ? (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE} className="space-y-4">

                {result!.type === "asn" ? (
                  <>
                    <div className="glass-panel border border-violet-200 dark:border-violet-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                        <RiServerLine className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">AS{result!.asn}</p>
                        <p className="text-sm text-muted-foreground">{result!.rdap.name || "—"}</p>
                      </div>
                    </div>
                    {Object.keys(result!.rdap).length > 0 && (
                      <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                          <RiServerLine className="w-3.5 h-3.5 text-muted-foreground" />
                          <h3 className="text-sm font-bold">RDAP 信息</h3>
                        </div>
                        <div className="px-5">
                          {result!.rdap.name && <InfoRow label="名称" value={result!.rdap.name} />}
                          {result!.rdap.handle && <InfoRow label="Handle" value={result!.rdap.handle} mono />}
                          {result!.rdap.startAutnum && <InfoRow label="ASN 范围" value={result!.rdap.endAutnum ? `${result!.rdap.startAutnum} – ${result!.rdap.endAutnum}` : result!.rdap.startAutnum} mono />}
                          {result!.rdap.contact_name && <InfoRow label="联系人" value={result!.rdap.contact_name} />}
                          {result!.rdap.contact_org && <InfoRow label="组织" value={result!.rdap.contact_org} />}
                          {result!.rdap.contact_email && <InfoRow label="邮箱" value={result!.rdap.contact_email} mono />}
                          {result!.rdap.description && <InfoRow label="描述" value={result!.rdap.description} />}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="glass-panel border border-border rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 text-5xl leading-none mt-0.5 select-none">
                          {result!.flag || "🌐"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xl font-bold font-mono">{result!.query}</p>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
                              result!.type === "ipv6"
                                ? "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400"
                                : "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                            )}>
                              {result!.type.toUpperCase()}
                            </span>
                            {result!.proxy && <BoolBadge value={result!.proxy} trueLabel="代理/VPN" />}
                            {result!.hosting && <BoolBadge value={result!.hosting} trueLabel="数据中心" />}
                            {result!.mobile && <BoolBadge value={result!.mobile} trueLabel="移动网络" />}
                          </div>
                          {result!.resolvedFrom && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              由 <span className="font-mono">{result!.resolvedFrom}</span> 解析
                            </p>
                          )}
                          <p className="text-base font-semibold mt-2">
                            {[result!.city, result!.region, result!.country].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-sm text-muted-foreground">{result!.isp || result!.org || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                        <RiMapPinLine className="w-3.5 h-3.5 text-muted-foreground" />
                        <h3 className="text-sm font-bold">地理位置</h3>
                        {result!.lat !== null && result!.lon !== null && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${result!.lat}&mlon=${result!.lon}&zoom=10`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1 text-[10px] text-primary hover:underline"
                          >
                            地图 <RiExternalLinkLine className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="px-5">
                        <InfoRow label="国家" value={result!.country ? `${result!.flag || ""} ${result!.country} (${result!.countryCode})` : null} />
                        <InfoRow label="省/区域" value={result!.region} />
                        <InfoRow label="城市" value={result!.city} />
                        <InfoRow label="区县" value={result!.district} />
                        <InfoRow label="邮编" value={result!.zip} mono />
                        <InfoRow label="坐标" value={result!.lat !== null ? `${result!.lat}, ${result!.lon}` : null} mono />
                        <InfoRow label="货币" value={result!.currency} />
                      </div>
                    </div>

                    {result!.lat !== null && result!.lon !== null && (
                      <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${result!.lat}&mlon=${result!.lon}&zoom=10`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="h-36 bg-muted/30 flex items-center justify-center relative group">
                            <img
                              src={`https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${result!.lon},${result!.lat}&z=8&l=map&size=600,200&pt=${result!.lon},${result!.lat},pm2rdm`}
                              alt="地图预览"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2">
                              <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded flex items-center gap-1">
                                在 OpenStreetMap 查看 <RiExternalLinkLine className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>
                        </a>
                      </div>
                    )}

                    <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                        <RiWifiLine className="w-3.5 h-3.5 text-muted-foreground" />
                        <h3 className="text-sm font-bold">网络信息</h3>
                      </div>
                      <div className="px-5">
                        <InfoRow label="ISP" value={result!.isp} />
                        <InfoRow label="组织" value={result!.org} />
                        <InfoRow label="ASN" value={result!.as} mono />
                        <InfoRow label="ASN 名称" value={result!.asname} />
                        <InfoRow label="反向 DNS" value={result!.reverse} mono />
                      </div>
                    </div>

                    {result!.timezone && (
                      <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                          <RiTimeLine className="w-3.5 h-3.5 text-muted-foreground" />
                          <h3 className="text-sm font-bold">时区</h3>
                        </div>
                        <div className="px-5">
                          <InfoRow label="时区" value={result!.timezone} mono />
                          <InfoRow label="UTC 偏移" value={result!.offset !== null ? `UTC${result!.offset >= 0 ? "+" : ""}${result!.offset / 3600}` : null} mono />
                        </div>
                      </div>
                    )}

                    <div className="glass-panel border border-border rounded-2xl p-4 flex flex-wrap gap-3">
                      {[
                        { label: "代理/VPN",   value: result!.proxy,   icon: RiShieldLine },
                        { label: "数据中心/托管", value: result!.hosting, icon: RiServerLine },
                        { label: "移动网络",    value: result!.mobile,  icon: RiWifiLine },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium",
                          value === true
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                            : "bg-muted border-border text-muted-foreground opacity-60"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                          <span className={cn("text-[10px] font-bold", value === true ? "text-amber-600" : "text-muted-foreground")}>
                            {value === true ? "是" : value === false ? "否" : "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {result!.rdap && Object.keys(result!.rdap).length > 0 && (
                      <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                          <RiServerLine className="w-3.5 h-3.5 text-muted-foreground" />
                          <h3 className="text-sm font-bold">RDAP 网络信息</h3>
                        </div>
                        <div className="px-5">
                          {result!.rdap.name && <InfoRow label="网络名称" value={result!.rdap.name} />}
                          {result!.rdap.handle && <InfoRow label="Handle" value={result!.rdap.handle} mono />}
                          {result!.rdap.startAddress && <InfoRow label="网段起始" value={result!.rdap.startAddress} mono />}
                          {result!.rdap.endAddress && <InfoRow label="网段结束" value={result!.rdap.endAddress} mono />}
                          {result!.rdap.ipVersion && <InfoRow label="IP 版本" value={result!.rdap.ipVersion} />}
                          {result!.rdap.contact_org && <InfoRow label="注册机构" value={result!.rdap.contact_org} />}
                          {result!.rdap.description && <InfoRow label="描述" value={result!.rdap.description} />}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60">
                      <RiAlertLine className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>归属地由 ip-api.com 提供；RDAP 数据来自 ARIN/RIPE/APNIC 官方接口。代理检测仅供参考。</span>
                      <Link href={`/feedback?type=ip&q=${encodeURIComponent(result!.query)}`} className="ml-auto shrink-0 hover:text-foreground transition-colors">
                        意见反馈
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
                <div className="text-center py-14 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/8 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                    <RiGlobalLine className="w-7 h-7 text-violet-500/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">输入 IP 地址、主机名或 ASN 编号</p>
                  <p className="text-xs text-muted-foreground/60">支持 IPv4 · IPv6 · 主机名（自动解析）· AS 号</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </ScrollArea>
    </>
  );
}
