import React from "react";
import Head from "next/head";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";
import { getOrigin } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  RiArrowLeftSLine, RiFileCopyLine,
  RiGlobalLine, RiImageLine, RiSignalWifiLine,
  RiShieldCheckLine, RiMapPinLine, RiListCheck2,
  RiFileList2Line,
} from "@remixicon/react";
import { VERSION } from "@/lib/env";
import { useClipboard } from "@/lib/utils";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/site-settings";

// ── Syntax-highlighted JSON block ────────────────────────────────────────────
function JsonHighlight({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts: React.ReactNode[] = [];
        let remaining = line;
        let keyIdx = 0;

        while (remaining.length > 0) {
          const wsMatch = remaining.match(/^(\s+)/);
          if (wsMatch && !remaining.match(/^\s*"/)) {
            parts.push(<span key={`ws0-${keyIdx}`}>{wsMatch[1]}</span>);
            remaining = remaining.slice(wsMatch[1].length);
            keyIdx++;
            continue;
          }
          const keyMatch = remaining.match(/^(\s*)"((?:[^"\\]|\\.)+)"(\s*:\s*)/);
          if (keyMatch) {
            parts.push(<span key={`ws-${keyIdx}`}>{keyMatch[1]}</span>);
            parts.push(<span key={`k-${keyIdx}`} className="text-sky-400">&quot;{keyMatch[2]}&quot;</span>);
            parts.push(<span key={`c-${keyIdx}`}>{keyMatch[3]}</span>);
            remaining = remaining.slice(keyMatch[0].length);
            keyIdx++;
            continue;
          }
          const strMatch = remaining.match(/^"((?:[^"\\]|\\.)*)"(,?\s*)/);
          if (strMatch) {
            parts.push(
              <span key={`s-${keyIdx}`} className={strMatch[1] === "..." || strMatch[1].length > 60 ? "text-zinc-500" : "text-emerald-400"}>
                &quot;{strMatch[1]}&quot;
              </span>
            );
            parts.push(<span key={`sc-${keyIdx}`}>{strMatch[2]}</span>);
            remaining = remaining.slice(strMatch[0].length);
            keyIdx++;
            continue;
          }
          const numMatch = remaining.match(/^(-?\d+\.?\d*)(,?\s*)/);
          if (numMatch) {
            parts.push(<span key={`n-${keyIdx}`} className="text-amber-400">{numMatch[1]}</span>);
            parts.push(<span key={`nc-${keyIdx}`}>{numMatch[2]}</span>);
            remaining = remaining.slice(numMatch[0].length);
            keyIdx++;
            continue;
          }
          const boolMatch = remaining.match(/^(true|false|null)(,?\s*)/);
          if (boolMatch) {
            parts.push(<span key={`b-${keyIdx}`} className="text-purple-400">{boolMatch[1]}</span>);
            parts.push(<span key={`bc-${keyIdx}`}>{boolMatch[2]}</span>);
            remaining = remaining.slice(boolMatch[0].length);
            keyIdx++;
            continue;
          }
          const bracketMatch = remaining.match(/^([{}\[\],])(.*)/);
          if (bracketMatch) {
            parts.push(<span key={`br-${keyIdx}`} className="text-zinc-500">{bracketMatch[1]}</span>);
            remaining = bracketMatch[2];
            keyIdx++;
            continue;
          }
          parts.push(<span key={`r-${keyIdx}`}>{remaining}</span>);
          break;
        }
        return <div key={i} className="whitespace-pre">{parts.length > 0 ? parts : " "}</div>;
      })}
    </>
  );
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  const copy = useClipboard();
  const isJson = language === "json" || children.trimStart().startsWith("{");
  return (
    <div className="relative group">
      <ScrollArea className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950">
        <pre className="w-max min-w-full text-zinc-200 p-3 sm:p-4 text-[10px] sm:text-xs font-mono leading-relaxed">
          <code className="block">{isJson ? <JsonHighlight content={children} /> : children}</code>
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <button
        onClick={() => copy(children)}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-200">
        <RiFileCopyLine className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function InlineCodeScroll({ children, codeClassName }: { children: string; codeClassName?: string }) {
  return (
    <div className="inline-block max-w-full align-middle">
      <ScrollArea className="max-w-full rounded-md">
        <code className={`block whitespace-nowrap ${codeClassName || "font-mono text-xs bg-muted px-1 py-0.5 rounded"}`}>
          {children}
        </code>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function ParamsTable({ params, t }: {
  params: { name: string; type: string; required: boolean; description: string; default?: string }[];
  t: (key: TranslationKey) => string;
}) {
  return (
    <ScrollArea className="w-full rounded-md border border-border/60">
      <table className="min-w-[680px] w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 pl-3 font-medium text-muted-foreground">{t("docs.parameter")}</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">{t("type")}</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">{t("docs.required")}</th>
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">{t("docs.default")}</th>
            <th className="text-left py-2 font-medium text-muted-foreground">{t("docs.description_col")}</th>
          </tr>
        </thead>
        <tbody>
          {params.map(p => (
            <tr key={p.name} className="border-b border-border/50">
              <td className="py-2 pr-4 pl-3 font-mono text-foreground">{p.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{p.type}</td>
              <td className="py-2 pr-4">
                {p.required
                  ? <Badge className="text-[9px] bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0">{t("docs.required")}</Badge>
                  : <Badge variant="outline" className="text-[9px]">{t("docs.optional")}</Badge>}
              </td>
              <td className="py-2 pr-4 font-mono text-muted-foreground">{p.default || "—"}</td>
              <td className="py-2 text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// ── Section divider with category label ─────────────────────────────────────
function SectionHeader({ icon: Icon, label, color }: {
  icon: typeof RiGlobalLine; label: string; color: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
      <span className="text-sm font-bold">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// ── Endpoint anchor card title ───────────────────────────────────────────────
function EndpointTitle({ method, path }: { method: string; path: string }) {
  return (
    <CardTitle className="flex items-center gap-2 text-base flex-wrap">
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs font-bold">
        {method}
      </Badge>
      <InlineCodeScroll codeClassName="font-mono text-sm">{path}</InlineCodeScroll>
    </CardTitle>
  );
}

// ── Sub-section heading ──────────────────────────────────────────────────────
function SubHead({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{label}</h3>
  );
}

// ── Notes list ──────────────────────────────────────────────────────────────
function Notes({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

// ── Quick nav pill ───────────────────────────────────────────────────────────
const PILL_COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-500/10   text-blue-600   dark:text-blue-400   border-blue-500/20   hover:bg-blue-500/20   hover:border-blue-500/40",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40",
  emerald:"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40",
  pink:   "bg-pink-500/10   text-pink-600   dark:text-pink-400   border-pink-500/20   hover:bg-pink-500/20   hover:border-pink-500/40",
  rose:   "bg-rose-500/10   text-rose-600   dark:text-rose-400   border-rose-500/20   hover:bg-rose-500/20   hover:border-rose-500/40",
  zinc:   "bg-muted/50      text-foreground/70                    border-border/60     hover:bg-muted        hover:border-border",
};

function NavPill({ href, color = "zinc", children }: { href: string; color?: string; children: React.ReactNode }) {
  const colorCls = PILL_COLOR_MAP[color] ?? PILL_COLOR_MAP.zinc;
  return (
    <a href={href} className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${colorCls}`}>
      {children}
    </a>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return { props: { origin: getOrigin(context.req) } };
}

export default function DocsPage({ origin }: { origin: string }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const siteLabel = settings.site_logo_text || "NEXT WHOIS";
  const docTitle = `${t("docs.title")} — ${siteLabel}`;

  return (
    <>
      <Head>
        <title key="site-title">{docTitle}</title>
        <meta key="og:title" property="og:title" content={docTitle} />
        <meta key="og:image" property="og:image" content={`${origin}/banner.png`} />
        <meta key="twitter:title" name="twitter:title" content={docTitle} />
        <meta key="twitter:image" name="twitter:image" content={`${origin}/banner.png`} />
      </Head>
      <div className="w-full h-[calc(100vh-4rem)] overflow-y-auto overflow-x-clip">
        <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 min-h-[calc(100vh-4rem)]">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon-sm" className="shrink-0">
                <RiArrowLeftSLine className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("docs.title")}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">v{VERSION}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("docs.description")}</p>

          {/* Quick navigation */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 mb-8">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2.5 px-0.5">快速跳转</p>
            <div className="flex flex-wrap gap-2">
              <NavPill href="#whois"       color="blue">   <RiGlobalLine      className="w-3 h-3" />WHOIS / 查询</NavPill>
              <NavPill href="#dns-records" color="violet">  <RiSignalWifiLine  className="w-3 h-3" />DNS 记录</NavPill>
              <NavPill href="#dns-txt"     color="violet">  <RiListCheck2      className="w-3 h-3" />DNS TXT</NavPill>
              <NavPill href="#ssl"         color="emerald"> <RiShieldCheckLine className="w-3 h-3" />SSL 证书</NavPill>
              <NavPill href="#ip"          color="orange">  <RiMapPinLine      className="w-3 h-3" />IP / ASN</NavPill>
              <NavPill href="#og"          color="pink">    <RiImageLine       className="w-3 h-3" />OG 卡片</NavPill>
              <NavPill href="#icp"         color="rose">    <RiFileList2Line   className="w-3 h-3" />ICP 备案</NavPill>
              <NavPill href="#rate-limit"  color="zinc">                                             限流规则</NavPill>
            </div>
          </div>

          <div className="space-y-8">

            {/* ══════════════════════════════════════════
                WHOIS & 查询
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiGlobalLine} label="WHOIS & 查询" color="bg-blue-500/10 text-blue-500" />

            <Card id="whois">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/lookup" />
                <p className="text-sm text-muted-foreground mt-1">
                  统一查询入口，支持域名 WHOIS/RDAP、IPv4、IPv6、ASN（自治系统）、CIDR 网段五种查询类型，自动识别输入格式并路由到对应协议。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "query", type: "string", required: true, description: "查询内容：域名 / IPv4 / IPv6 / ASN（如 AS15169）/ CIDR（如 1.1.1.0/24）" },
                  ]} />
                </div>

                {/* Query type examples */}
                <div>
                  <SubHead label="查询类型 · 示例请求" />
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">域名（WHOIS / RDAP 优先）</p>
                      <CodeBlock>{`curl "${origin}/api/lookup?query=google.com"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">IPv4 地址</p>
                      <CodeBlock>{`curl "${origin}/api/lookup?query=8.8.8.8"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">IPv6 地址</p>
                      <CodeBlock>{`curl "${origin}/api/lookup?query=2001:4860:4860::8888"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">ASN（自治系统号）</p>
                      <CodeBlock>{`curl "${origin}/api/lookup?query=AS15169"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">CIDR 网段</p>
                      <CodeBlock>{`curl "${origin}/api/lookup?query=1.1.1.0/24"`}</CodeBlock>
                    </div>
                  </div>
                </div>

                <div>
                  <SubHead label={`${t("docs.success_response")} — 域名查询`} />
                  <CodeBlock>{`{
  "status": true,
  "time": 1.23,
  "cached": false,
  "source": "rdap",
  "result": {
    "domain": "google.com",
    "registrar": "MarkMonitor Inc.",
    "registrarURL": "http://www.markmonitor.com",
    "ianaId": "292",
    "whoisServer": "whois.markmonitor.com",
    "creationDate": "1997-09-15T04:00:00Z",
    "expirationDate": "2028-09-14T04:00:00Z",
    "updatedDate": "2019-09-09T15:39:04Z",
    "status": [
      { "status": "clientDeleteProhibited", "url": "..." },
      { "status": "clientTransferProhibited", "url": "..." }
    ],
    "nameServers": ["ns1.google.com", "ns2.google.com", "ns3.google.com", "ns4.google.com"],
    "dnssec": "unsigned",
    "domainAge": 28,
    "remainingDays": 945,
    "rawWhoisContent": "Domain Name: GOOGLE.COM\nRegistry Domain ID: ...",
    "rawRdapContent": "{\n  \"objectClassName\": \"domain\",\n  ...\n}"
  }
}`}</CodeBlock>
                </div>

                <div>
                  <SubHead label={`${t("docs.success_response")} — IP / ASN 查询`} />
                  <CodeBlock>{`{
  "status": true,
  "time": 0.87,
  "cached": false,
  "source": "rdap",
  "result": {
    "domain": "8.8.8.8",
    "registrar": "ARIN",
    "cidr": "8.8.8.0/24",
    "country": "US",
    "creationDate": "1992-12-01T00:00:00Z",
    "status": [{ "status": "active", "url": "" }],
    "nameServers": [],
    "rawRdapContent": "..."
  }
}`}</CodeBlock>
                </div>

                <div>
                  <SubHead label={t("docs.error_response")} />
                  <CodeBlock>{`{
  "status": false,
  "time": 0.45,
  "error": "No match for domain \"EXAMPLE.INVALID\""
}`}</CodeBlock>
                </div>

                <div>
                  <SubHead label="注意事项" />
                  <Notes items={[
                    <>域名查询优先使用 RDAP 协议，失败时自动回退到 WHOIS；<code className="font-mono text-xs">source</code> 字段指示实际使用的协议</>,
                    <>缓存命中时 <code className="font-mono text-xs">cached: true</code>，<code className="font-mono text-xs">time: 0</code>；缓存 TTL：<code className="font-mono text-xs">s-maxage=3600</code></>,
                    <>IP / ASN / CIDR 查询通过 IANA RDAP bootstrap 路由到对应地区注册局（ARIN / RIPE / APNIC 等）</>,
                    <>接口限流：每 IP 每分钟最多 <strong>40 次</strong>请求，超出返回 HTTP 429</>,
                  ]} />
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                DNS 工具
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiSignalWifiLine} label="DNS 工具" color="bg-violet-500/10 text-violet-500" />

            <Card id="dns-records">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/dns/records" />
                <p className="text-sm text-muted-foreground mt-1">
                  通过 Google、Cloudflare、Quad9、AdGuard 四个 DoH（DNS over HTTPS）解析器并行查询任意 DNS 记录，返回去重合并结果及每个解析器的延迟。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "name", type: "string", required: true, description: "要查询的域名，如 google.com 或 _dmarc.google.com" },
                    { name: "type", type: "string", required: false, default: "A", description: "记录类型：A · AAAA · MX · NS · CNAME · TXT · SOA · CAA · SRV" },
                  ]} />
                </div>
                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <CodeBlock>{`curl "${origin}/api/dns/records?name=google.com&type=MX"`}</CodeBlock>
                    <CodeBlock>{`curl "${origin}/api/dns/records?name=google.com&type=AAAA"`}</CodeBlock>
                    <CodeBlock>{`curl "${origin}/api/dns/records?name=_dmarc.google.com&type=TXT"`}</CodeBlock>
                  </div>
                </div>
                <div>
                  <SubHead label={t("docs.success_response")} />
                  <CodeBlock>{`{
  "name": "google.com",
  "type": "MX",
  "found": true,
  "records": [
    { "priority": 10, "exchange": "smtp.google.com" }
  ],
  "flat": ["10 smtp.google.com"],
  "resolvers": [
    { "name": "Google DoH",     "kind": "doh", "records": [...], "flat": [...], "latencyMs": 42 },
    { "name": "Cloudflare DoH", "kind": "doh", "records": [...], "flat": [...], "latencyMs": 38 },
    { "name": "Quad9 DoH",      "kind": "doh", "records": [...], "flat": [...], "latencyMs": 55 },
    { "name": "AdGuard DoH",    "kind": "doh", "records": [...], "flat": [...], "latencyMs": 61 }
  ],
  "latencyMs": 63
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label="注意事项" />
                  <Notes items={[
                    <>请求不缓存（<code className="font-mono text-xs">Cache-Control: no-store</code>），数据实时获取</>,
                    <>TXT 记录返回原始值，可自行解析 SPF / DMARC / DKIM / BIMI</>,
                    <>记录不存在时 <code className="font-mono text-xs">found: false</code>，<code className="font-mono text-xs">flat: []</code></>,
                    "单个解析器超时 7 秒，四个并行执行，整体通常在 1–2 秒内完成",
                  ]} />
                </div>
              </CardContent>
            </Card>

            <Card id="dns-txt">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/dns/txt" />
                <p className="text-sm text-muted-foreground mt-1">
                  专用 TXT 记录查询，通过 Google、Cloudflare、Quad9、OpenDNS 四个标准 DNS 解析器（系统 DNS，非 DoH）并行解析，适合验证 SPF、DMARC、DKIM 等邮件安全配置。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "name", type: "string", required: true, description: "要查询的域名或子域，如 google.com 或 _dmarc.example.com" },
                  ]} />
                </div>
                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <CodeBlock>{`# 查询 SPF 记录
curl "${origin}/api/dns/txt?name=google.com"`}</CodeBlock>
                    <CodeBlock>{`# 查询 DMARC 记录
curl "${origin}/api/dns/txt?name=_dmarc.google.com"`}</CodeBlock>
                    <CodeBlock>{`# 查询 DKIM 记录
curl "${origin}/api/dns/txt?name=google._domainkey.gmail.com"`}</CodeBlock>
                  </div>
                </div>
                <div>
                  <SubHead label={t("docs.success_response")} />
                  <CodeBlock>{`{
  "name": "google.com",
  "found": true,
  "records": [
    ["v=spf1 include:_spf.google.com ~all"],
    ["docusign=1b0a6754-49b1-4db5-8540-d2c12664b289"],
    ["globalsign-smime-dv=CDYX+XFHUw2wml6/Gb8+59BsH31KzUr6c1l2BPvqKX8="]
  ],
  "flat": [
    "v=spf1 include:_spf.google.com ~all",
    "docusign=1b0a6754-49b1-4db5-8540-d2c12664b289",
    "globalsign-smime-dv=CDYX+XFHUw2wml6/Gb8+59BsH31KzUr6c1l2BPvqKX8="
  ],
  "resolvers": [
    { "name": "Google DNS",  "records": [...], "flat": [...], "latencyMs": 18 },
    { "name": "Cloudflare",  "records": [...], "flat": [...], "latencyMs": 15 },
    { "name": "Quad9",       "records": [...], "flat": [...], "latencyMs": 23 },
    { "name": "OpenDNS",     "records": [...], "flat": [...], "latencyMs": 31 }
  ],
  "latencyMs": 35
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label={`${t("docs.error_response")} / 未找到`} />
                  <CodeBlock>{`{
  "name": "_dmarc.example.invalid",
  "found": false,
  "records": [],
  "flat": [],
  "resolvers": [...],
  "latencyMs": 42,
  "error": "ENOTFOUND"
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label="与 /api/dns/records?type=TXT 的区别" />
                  <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/40 border-b border-border/60">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">特性</th>
                          <th className="text-left py-2 px-3 font-semibold text-violet-600 dark:text-violet-400">/api/dns/txt</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">/api/dns/records?type=TXT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        <tr>
                          <td className="py-2 px-3 text-muted-foreground">解析协议</td>
                          <td className="py-2 px-3">标准 DNS（UDP/TCP）</td>
                          <td className="py-2 px-3">DoH（HTTPS 封装）</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-muted-foreground">解析器</td>
                          <td className="py-2 px-3">8.8.8.8 / 1.1.1.1 / 9.9.9.9 / 208.67.222.222</td>
                          <td className="py-2 px-3">Google / Cloudflare / Quad9 / AdGuard DoH</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-muted-foreground">适用场景</td>
                          <td className="py-2 px-3">邮件安全验证（SPF/DMARC/DKIM）</td>
                          <td className="py-2 px-3">通用 DNS 记录查询，支持更多类型</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                SSL 证书
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiShieldCheckLine} label="SSL 证书检测" color="bg-emerald-500/10 text-emerald-500" />

            <Card id="ssl">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/ssl/cert" />
                <p className="text-sm text-muted-foreground mt-1">
                  直连目标主机（默认 443 端口），执行 TLS 握手并返回 SSL 证书详情：有效期、颁发机构、SAN 列表、证书链、密码套件、剩余有效天数等。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "hostname", type: "string", required: true, description: "目标主机名或 IP，如 google.com、github.com 或 1.1.1.1" },
                    { name: "port", type: "number", required: false, default: "443", description: "目标 TLS 端口（默认 443，SMTPS 用 465，IMAPS 用 993 等）" },
                  ]} />
                </div>
                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <CodeBlock>{`curl "${origin}/api/ssl/cert?hostname=github.com"`}</CodeBlock>
                    <CodeBlock>{`# 检测非标准端口
curl "${origin}/api/ssl/cert?hostname=mail.example.com&port=465"`}</CodeBlock>
                  </div>
                </div>
                <div>
                  <SubHead label={t("docs.success_response")} />
                  <CodeBlock>{`{
  "ok": true,
  "hostname": "github.com",
  "port": 443,
  "authorized": true,
  "authError": null,
  "protocol": "TLSv1.3",
  "cipher": "TLS_AES_128_GCM_SHA256",
  "subject": { "CN": "github.com", "O": "GitHub, Inc.", "C": "US" },
  "issuer": { "CN": "DigiCert TLS Hybrid ECC SHA384 2020 CA1", "O": "DigiCert Inc" },
  "valid_from": "2024-03-07T00:00:00.000Z",
  "valid_to": "2025-03-07T23:59:59.000Z",
  "days_remaining": 120,
  "is_expired": false,
  "is_expiring_soon": false,
  "fingerprint256": "AA:BB:CC:...",
  "serialNumber": "0A:1B:2C:...",
  "sans": [
    { "type": "DNS", "value": "github.com" },
    { "type": "DNS", "value": "www.github.com" }
  ],
  "chain": [
    { "subject": "CN=DigiCert...", "issuer": "CN=...", "valid_to": "..." }
  ],
  "latencyMs": 185
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label={t("docs.error_response")} />
                  <CodeBlock>{`{
  "ok": false,
  "hostname": "expired.badssl.com",
  "port": 443,
  "authorized": false,
  "authError": "certificate has expired",
  "error": "certificate has expired",
  "latencyMs": 210
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label="注意事项" />
                  <Notes items={[
                    <><code className="font-mono text-xs">authorized: false</code> 表示证书验证失败（过期 / 自签名 / 域名不匹配等），<code className="font-mono text-xs">authError</code> 包含具体原因</>,
                    <><code className="font-mono text-xs">is_expiring_soon</code> 在证书剩余有效期 ≤ 30 天时为 <code className="font-mono text-xs">true</code></>,
                    "证书链（chain）包含从服务器到根 CA 的完整中间证书信息",
                    "连接超时 10 秒，对方主机不可达时返回 ok: false + error 字段",
                  ]} />
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                IP & ASN
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiMapPinLine} label="IP & ASN 归属查询" color="bg-orange-500/10 text-orange-500" />

            <Card id="ip">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/ip/lookup" />
                <p className="text-sm text-muted-foreground mt-1">
                  查询 IP 地址、主机名或 ASN 的归属地、ISP、时区、代理检测，并附加 RDAP 注册信息。支持 IPv4、IPv6、ASN 和主机名（自动 DNS 解析）。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "q", type: "string", required: true, description: "IPv4 地址、IPv6 地址、主机名（自动 DNS 解析），或 ASN（如 AS15169）" },
                  ]} />
                </div>
                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <CodeBlock>{`# IPv4 地址
curl "${origin}/api/ip/lookup?q=8.8.8.8"`}</CodeBlock>
                    <CodeBlock>{`# IPv6 地址
curl "${origin}/api/ip/lookup?q=2001:4860:4860::8888"`}</CodeBlock>
                    <CodeBlock>{`# 主机名（自动解析为 IP 再查询）
curl "${origin}/api/ip/lookup?q=dns.google"`}</CodeBlock>
                    <CodeBlock>{`# ASN 归属网段
curl "${origin}/api/ip/lookup?q=AS15169"`}</CodeBlock>
                  </div>
                </div>
                <div>
                  <SubHead label={t("docs.success_response")} />
                  <CodeBlock>{`{
  "type": "ipv4",
  "query": "8.8.8.8",
  "resolvedFrom": null,
  "flag": "🇺🇸",
  "country": "United States",
  "countryCode": "US",
  "region": "California",
  "city": "Mountain View",
  "timezone": "America/Los_Angeles",
  "offset": -28800,
  "lat": 37.4056,
  "lon": -122.0775,
  "isp": "Google LLC",
  "org": "AS15169 Google LLC",
  "as": "AS15169 Google LLC",
  "asname": "GOOGLE",
  "reverse": "dns.google",
  "mobile": false,
  "proxy": false,
  "hosting": true,
  "rdap": {
    "name": "GOGL",
    "handle": "NET-8-8-8-0-1",
    "startAddress": "8.8.8.0",
    "endAddress": "8.8.8.255",
    "ipVersion": "v4",
    "contact_org": "Google LLC"
  }
}`}</CodeBlock>
                </div>
                <div>
                  <SubHead label="注意事项" />
                  <Notes items={[
                    <>归属地数据源：<code className="font-mono text-xs">ip-api.com</code>，实时查询</>,
                    "RDAP 数据来源于 ARIN / RIPE / APNIC 等官方注册局，实时查询",
                    <>主机名输入时先通过系统 DNS 解析为 IP，<code className="font-mono text-xs">resolvedFrom</code> 字段记录原始主机名</>,
                    <><code className="font-mono text-xs">mobile</code>、<code className="font-mono text-xs">proxy</code>、<code className="font-mono text-xs">hosting</code> 检测仅供参考，准确率因 IP 数据库而异</>,
                  ]} />
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                工具 API
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiImageLine} label="工具 API" color="bg-pink-500/10 text-pink-500" />

            <Card id="og">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/og" />
                <p className="text-sm text-muted-foreground mt-1">
                  {t("docs.og_description")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "query", type: "string", required: false, description: t("docs.og_query_desc"), default: "—" },
                    { name: "w", type: "number", required: false, description: t("docs.og_width_desc"), default: "1200" },
                    { name: "h", type: "number", required: false, description: t("docs.og_height_desc"), default: "630" },
                    { name: "theme", type: "string", required: false, description: t("docs.og_theme_desc"), default: "light" },
                  ]} />
                </div>
                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <CodeBlock>{`curl "${origin}/api/og?query=google.com&theme=dark" -o og.png`}</CodeBlock>
                    <CodeBlock>{`# 自定义尺寸（适合 Twitter Card）
curl "${origin}/api/og?query=example.com&w=1200&h=600" -o card.png`}</CodeBlock>
                  </div>
                </div>
                <div>
                  <SubHead label={t("docs.preview")} />
                  <div className="rounded-lg border overflow-hidden bg-muted/30">
                    <img src="/api/og?query=google.com" alt="OG Image Preview" className="w-full h-auto" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">/api/og?query=google.com</p>
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                ICP 备案查询
            ══════════════════════════════════════════ */}
            <SectionHeader icon={RiFileList2Line} label="ICP 备案查询" color="bg-rose-500/10 text-rose-500" />

            <Card id="icp">
              <CardHeader className="pb-4">
                <EndpointTitle method="GET" path="/api/icp/query" />
                <p className="text-sm text-muted-foreground mt-1">
                  查询中国工信部 ICP 备案信息，支持网站、APP、小程序、快应用及对应违法违规数据库，可按域名、备案号或企业名称搜索，结果支持分页。
                </p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <SubHead label={t("docs.parameters")} />
                  <ParamsTable t={t} params={[
                    { name: "type", type: "string", required: true, description: "查询类型（见下表）：web · app · mapp · kapp · bweb · bapp · bmapp · bkapp" },
                    { name: "search", type: "string", required: true, description: "搜索内容：域名（如 baidu.com）、ICP备案号（如 京ICP证030173号）或企业名称" },
                    { name: "pageNum", type: "number", required: false, default: "1", description: "页码（从 1 开始）" },
                    { name: "pageSize", type: "number", required: false, default: "10", description: "每页条数（最大 50）" },
                  ]} />
                </div>

                <div>
                  <SubHead label="查询类型说明" />
                  <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/40 border-b border-border/60">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">type</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">说明</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">数据库</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {[
                          ["web",   "网站",       "正常备案"],
                          ["app",   "APP",        "正常备案"],
                          ["mapp",  "小程序",     "正常备案"],
                          ["kapp",  "快应用",     "正常备案"],
                          ["bweb",  "违法违规网站",  "黑名单"],
                          ["bapp",  "违法违规APP",   "黑名单"],
                          ["bmapp", "违法违规小程序", "黑名单"],
                          ["bkapp", "违法违规快应用", "黑名单"],
                        ].map(([id, label, db]) => (
                          <tr key={id}>
                            <td className="py-2 px-3 font-mono text-foreground">{id}</td>
                            <td className="py-2 px-3 text-muted-foreground">{label}</td>
                            <td className="py-2 px-3">
                              <span className={db === "黑名单"
                                ? "text-red-500 text-[10px] font-medium"
                                : "text-emerald-600 dark:text-emerald-400 text-[10px] font-medium"
                              }>{db}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <SubHead label={t("docs.example_request")} />
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">按域名查询网站备案</p>
                      <CodeBlock>{`curl "${origin}/api/icp/query?type=web&search=baidu.com"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">按备案号查询</p>
                      <CodeBlock>{`curl "${origin}/api/icp/query?type=web&search=京ICP证030173号"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">按企业名称查询（分页）</p>
                      <CodeBlock>{`curl "${origin}/api/icp/query?type=web&search=深圳市腾讯计算机系统有限公司&pageNum=2&pageSize=20"`}</CodeBlock>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">查询违法违规 APP</p>
                      <CodeBlock>{`curl "${origin}/api/icp/query?type=bapp&search=example"`}</CodeBlock>
                    </div>
                  </div>
                </div>

                <div>
                  <SubHead label={t("docs.success_response")} />
                  <CodeBlock>{`{
  "ok": true,
  "type": "web",
  "search": "baidu.com",
  "pageNum": 1,
  "pageSize": 10,
  "total": 1,
  "pages": 1,
  "list": [
    {
      "domain": "baidu.com",
      "domainId": "12345678",
      "limitAccess": false,
      "mainLicence": "京ICP证030173号",
      "natureName": "企业",
      "serviceLicence": "京ICP备030173号",
      "unitName": "北京百度网讯科技有限公司",
      "updateRecordTime": "2023-09-01",
      "contentTypeName": "信息服务",
      "mainUnitAddress": "北京市海淀区上地十街10号",
      "cityId": "110100",
      "countyId": "110108"
    }
  ]
}`}</CodeBlock>
                </div>

                <div>
                  <SubHead label="响应字段说明" />
                  <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/40 border-b border-border/60">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">字段</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {[
                          ["total / pages", "总记录数 / 总页数"],
                          ["domain", "备案的域名"],
                          ["domainId", "域名 ID"],
                          ["limitAccess", "是否限制接入"],
                          ["mainLicence", "ICP 备案主体许可证号"],
                          ["serviceLicence", "ICP 备案服务许可证号"],
                          ["natureName", "主办单位性质（企业 / 事业单位 / 个人等）"],
                          ["unitName", "主办单位名称"],
                          ["updateRecordTime", "审核通过日期"],
                          ["contentTypeName", "服务前置审批项 / 内容类型"],
                          ["mainUnitAddress", "主体地址"],
                          ["serviceName", "服务名称（APP、小程序或快应用名称）"],
                          ["version", "服务版本"],
                          ["blackListLevel", "威胁等级（仅违规类型返回，值为 2 表示暂无违规信息）"],
                        ].map(([field, desc]) => (
                          <tr key={field}>
                            <td className="py-2 px-3 font-mono text-foreground">{field}</td>
                            <td className="py-2 px-3 text-muted-foreground">{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <SubHead label="注意事项" />
                  <Notes items={[
                    "数据来源：工业和信息化部 ICP/IP 地址/域名信息备案管理系统",
                    <>违规类型（bweb / bapp 等）返回的 <code className="font-mono text-xs">blackListLevel</code> 字段：值为 2 表示暂无违法违规信息</>,
                    "接口响应时间约 1–5 秒，请勿频繁轮询",
                    "支持按域名、备案号（如 京ICP证030173号）或企业全称三种搜索方式",
                  ]} />
                </div>

              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════
                限流规则
            ══════════════════════════════════════════ */}
            <Card id="rate-limit">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{t("docs.rate_limiting")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/40 border-b border-border/60">
                      <tr>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">接口</th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">限流规则</th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">缓存</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/lookup</td>
                        <td className="py-2 px-3">每 IP 每分钟 <strong>40 次</strong>（滑动窗口）</td>
                        <td className="py-2 px-3"><code className="font-mono">s-maxage=3600</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/dns/records</td>
                        <td className="py-2 px-3">每 IP 每分钟 <strong>60 次</strong></td>
                        <td className="py-2 px-3"><code className="font-mono">no-store</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/dns/txt</td>
                        <td className="py-2 px-3">每 IP 每分钟 <strong>60 次</strong></td>
                        <td className="py-2 px-3"><code className="font-mono">no-store</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/ssl/cert</td>
                        <td className="py-2 px-3">每 IP 每分钟 <strong>20 次</strong></td>
                        <td className="py-2 px-3"><code className="font-mono">no-store</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/ip/lookup</td>
                        <td className="py-2 px-3">每 IP 每分钟 <strong>30 次</strong></td>
                        <td className="py-2 px-3"><code className="font-mono">no-store</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/icp/query</td>
                        <td className="py-2 px-3">无限流</td>
                        <td className="py-2 px-3"><code className="font-mono">no-store</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono">/api/og</td>
                        <td className="py-2 px-3">无限流</td>
                        <td className="py-2 px-3"><code className="font-mono">s-maxage=86400</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  <span>/api/lookup 命中缓存时：</span>
                  <InlineCodeScroll>{`"cached": true`}</InlineCodeScroll>
                  <span>且</span>
                  <InlineCodeScroll>{`"time": 0`}</InlineCodeScroll>
                  <span>。超出限流返回 HTTP 429，响应头包含</span>
                  <InlineCodeScroll>X-RateLimit-Limit / Remaining / Reset</InlineCodeScroll>
                  <span>。</span>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="mt-12 mb-8 text-center">
            <p className="text-xs text-muted-foreground">
              Next Whois v{VERSION} ·{" "}
              <a href="https://github.com/zmh-program/next-whois-ui" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                GitHub
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
