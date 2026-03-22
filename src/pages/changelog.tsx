import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/lib/site-settings";
import { useTranslation } from "@/lib/i18n";
import {
  RiArrowLeftSLine,
  RiHistoryLine,
  RiAddCircleLine,
  RiToolsLine,
  RiBugLine,
  RiFlashlightLine,
  RiStarLine,
} from "@remixicon/react";

type ChangeType = "feature" | "fix" | "improve" | "new";

interface Change {
  type: ChangeType;
  zh: string;
  en: string;
}

interface Version {
  version: string;
  date: string;
  highlight?: boolean;
  changes: Change[];
}

const VERSIONS: Version[] = [
  {
    version: "1.6",
    date: "2026-03",
    highlight: true,
    changes: [
      { type: "new", zh: "域名价值评分系统：100 分制多维评估（长度/后缀/关键词/模式）", en: "Domain value scoring: 100-point multi-dimensional evaluation (length/TLD/keywords/pattern)" },
      { type: "new", zh: "工具箱全分类点击量统计与永久排序", en: "Click tracking and permanent sorting across all toolbox categories" },
      { type: "new", zh: "关于我们 / 更新记录 / 支持后缀 / 友情链接 信息页", en: "About / Changelog / Supported TLDs / Friendly Links info pages" },
      { type: "improve", zh: "移动端 iOS Safari 点击输入框缩放问题全站修复", en: "Fixed iOS Safari page zoom on input focus across all pages" },
      { type: "fix", zh: "修复横向溢出导致反馈抽屉偏移问题", en: "Fixed horizontal overflow causing feedback drawer misalignment" },
    ],
  },
  {
    version: "1.5",
    date: "2026-02",
    changes: [
      { type: "new", zh: "Dashboard 新增订阅引导弹窗与品牌认领引导弹窗", en: "Dashboard: subscription guide modal and brand claim guide modal added" },
      { type: "new", zh: "/remind 页面：域名到期提醒管理，支持取消订阅", en: "/remind page: domain expiry reminder management with unsubscribe support" },
    ],
  },
  {
    version: "1.4",
    date: "2026-01",
    changes: [
      { type: "new", zh: "域名到期提醒系统：订阅后 90/30/7/1 天自动发送邮件", en: "Domain expiry reminder system: email alerts at 90/30/7/1 days before expiry" },
      { type: "new", zh: "RDAP 查询支持，优先于传统 WHOIS 协议", en: "RDAP query support, prioritized over legacy WHOIS protocol" },
      { type: "feature", zh: "域名含义翻译（基于天湖 API），支持显示英文含义", en: "Domain meaning translation (via Tianhu API) with English meaning display" },
      { type: "feature", zh: "域名市场价格标签：注册/续费/转入价格对比", en: "Domain market price tags: registration/renewal/transfer price comparison" },
      { type: "improve", zh: "查询结果页大幅重构，新增域名生命周期图", en: "Query result page overhauled, added domain lifecycle timeline" },
    ],
  },
  {
    version: "1.3",
    date: "2025-12",
    changes: [
      { type: "new", zh: "品牌认领（Brand Stamp）：DNS TXT 验证后展示品牌标签", en: "Brand Stamp: show verified brand tags via DNS TXT verification" },
      { type: "new", zh: "DNS 记录查询工具：A/MX/TXT/SPF/DMARC 多解析器", en: "DNS lookup tool: A/MX/TXT/SPF/DMARC multi-resolver" },
      { type: "new", zh: "SSL 证书检测工具", en: "SSL certificate checker tool" },
      { type: "feature", zh: "IP / ASN 查询：归属地 + 自治系统信息", en: "IP/ASN lookup: geolocation and autonomous system information" },
      { type: "improve", zh: "WHOIS 解析器优化，提升字段识别准确率", en: "WHOIS parser optimization, improved field recognition accuracy" },
    ],
  },
  {
    version: "1.2",
    date: "2025-11",
    changes: [
      { type: "new", zh: "用户系统：注册 / 登录 / 找回密码", en: "User system: register, login, forgot/reset password" },
      { type: "new", zh: "Dashboard：域名订阅管理与品牌认领列表", en: "Dashboard: domain subscription management and brand claims list" },
      { type: "feature", zh: "域名工具箱（/tools）：精选外部工具链接", en: "Domain toolbox (/tools): curated external tool links" },
      { type: "fix", zh: "修复多国 ccTLD WHOIS 服务器配置问题", en: "Fixed WHOIS server configs for multiple country ccTLDs" },
    ],
  },
  {
    version: "1.1",
    date: "2025-10",
    changes: [
      { type: "new", zh: "8 种语言支持：中/英/日/韩/德/法/俄/繁中", en: "8-language support: zh/en/ja/ko/de/fr/ru/zh-tw" },
      { type: "new", zh: "深色 / 浅色主题切换", en: "Dark/light theme toggle" },
      { type: "new", zh: "API 接口文档页（/docs）", en: "API documentation page (/docs)" },
      { type: "feature", zh: "CIDR 网段查询支持", en: "CIDR network range lookup support" },
      { type: "improve", zh: "移动端导航优化，底部抽屉菜单", en: "Mobile navigation optimized with bottom drawer menu" },
    ],
  },
  {
    version: "1.0",
    date: "2025-09",
    changes: [
      { type: "new", zh: "项目上线：域名 WHOIS 查询，支持 200+ 后缀", en: "Initial launch: domain WHOIS lookup with 200+ TLD support" },
      { type: "new", zh: "ASN 自治系统查询", en: "ASN autonomous system lookup" },
      { type: "new", zh: "IPv4 / IPv6 地址查询", en: "IPv4/IPv6 address lookup" },
      { type: "feature", zh: "PWA 支持，可安装到手机桌面", en: "PWA support for home screen installation" },
    ],
  },
];

const TYPE_CONFIG: Record<ChangeType, { icon: typeof RiAddCircleLine; color: string; label: string; labelEn: string }> = {
  new: { icon: RiAddCircleLine, color: "text-emerald-500", label: "新增", labelEn: "New" },
  feature: { icon: RiStarLine, color: "text-blue-500", label: "功能", labelEn: "Feature" },
  improve: { icon: RiFlashlightLine, color: "text-amber-500", label: "优化", labelEn: "Improve" },
  fix: { icon: RiBugLine, color: "text-red-500", label: "修复", labelEn: "Fix" },
};

export default function ChangelogPage() {
  const { locale } = useTranslation();
  const settings = useSiteSettings();
  const isChinese = locale === "zh" || locale === "zh-tw";
  const siteName = settings.site_logo_text || "NEXT WHOIS";

  return (
    <>
      <Head>
        <title key="site-title">{isChinese ? "更新记录" : "Changelog"} — {siteName}</title>
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
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <RiHistoryLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">
                  {isChinese ? "更新记录" : "Changelog"}
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isChinese ? "每个版本的新功能与修复" : "Features and fixes in each release"}
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {VERSIONS.length} {isChinese ? "个版本" : "releases"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {VERSIONS.map((v, vi) => (
              <motion.div
                key={v.version}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: vi * 0.06 }}
                className={`glass-panel border rounded-xl overflow-hidden ${v.highlight ? "border-primary/40" : "border-border"}`}
              >
                <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${v.highlight ? "border-primary/20 bg-primary/5" : "border-border/60 bg-muted/20"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${v.highlight ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground"}`}>
                      <RiToolsLine className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">v{v.version}</span>
                      {v.highlight && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground border-0">
                          {isChinese ? "最新" : "Latest"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">{v.date}</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {v.changes.map((c, ci) => {
                    const cfg = TYPE_CONFIG[c.type];
                    return (
                      <div key={ci} className="flex items-start gap-2.5">
                        <cfg.icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                        <span className="text-[12px] text-foreground/80 leading-snug">
                          {isChinese ? c.zh : c.en}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              {isChinese ? "所有版本号遵循语义化版本规范" : "All versions follow Semantic Versioning"}
            </p>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}
