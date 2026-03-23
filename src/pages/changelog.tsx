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
    version: "2.0",
    date: "2026-03",
    highlight: true,
    changes: [
      { type: "new", zh: "友情链接后台管理：数据库驱动，支持增删改查、显示/隐藏、分类分组、排序", en: "Friendly Links admin: DB-backed CRUD with show/hide toggle, category grouping, custom sort order" },
      { type: "new", zh: "关于我们页面全面可编辑：中/英简介、联系邮箱、GitHub 链接、原作者信息均可在管理后台配置", en: "About page fully admin-editable: zh/en intro, contact email, GitHub URL, author info all configurable" },
      { type: "new", zh: "致谢列表支持 JSON 自定义，留空使用内置默认，无需改代码", en: "Acknowledgements list supports JSON override; defaults preserved when field is empty" },
      { type: "new", zh: "原作者感谢卡片恢复：GitHub 链接 + 作者主页均可在管理设置中替换", en: "Author credit card restored with configurable GitHub repo and author homepage links" },
      { type: "new", zh: "人机验证（CAPTCHA）集成：支持 Cloudflare Turnstile 和 hCaptcha，管理后台配置密钥即生效", en: "CAPTCHA integration: Cloudflare Turnstile and hCaptcha supported; enable by setting keys in admin" },
      { type: "new", zh: "注册邮箱 OTP 验证：发送 6 位验证码，10 分钟有效，60 秒防频繁发送", en: "Email OTP at registration: 6-digit code, 10-minute validity, 60-second resend cooldown" },
      { type: "new", zh: "邀请码系统：后台生成/管理邀请码，可设置最大使用次数，支持注册时填写或已注册用户后台申请", en: "Invite code system: admin-generated codes with max-use limits; apply at registration or from dashboard" },
      { type: "new", zh: "注册访问控制：require_invite_code 开关，开启后注册必须填写有效邀请码", en: "Registration gating: require_invite_code toggle; valid code required when enabled" },
      { type: "new", zh: "Dashboard 订阅标签：未持有邀请码时显示锁定状态，内嵌邀请码申请表单", en: "Dashboard subscription tab: locked state with inline invite-code application form when no access" },
      { type: "feature", zh: "匿名查询去重：同一 IP 同一查询 24 小时内只记录一次，减少重复历史数据", en: "Anonymous query deduplication: same query within 24 h written only once to history" },
      { type: "improve", zh: "管理后台新增【人机验证】设置区块：服务商选择、Site Key、Secret Key 独立字段", en: "Admin Settings: new CAPTCHA section with provider dropdown, Site Key and Secret Key fields" },
      { type: "improve", zh: "管理后台新增【链接】导航项：直达友情链接管理页", en: "Admin nav: new 'Links' entry pointing to friendly links management page" },
    ],
  },
  {
    version: "1.9",
    date: "2026-03",
    highlight: false,
    changes: [
      { type: "improve", zh: "页面切换动画精简：时长 0.28 s → 0.22 s，曲线换用 ease-out-expo，去除 scale 抖动", en: "Page transition refined: 0.28 s → 0.22 s, ease-out-expo curve, scale jitter removed" },
      { type: "improve", zh: "动画层添加 will-change: opacity, transform，浏览器提前提升 GPU 合成层", en: "Animated wrapper gains will-change: opacity, transform for early GPU layer promotion" },
      { type: "improve", zh: "新增 prefers-reduced-motion 支持：偏好减少动效的用户全站动画近乎即时", en: "prefers-reduced-motion support: all animations near-instant for users who prefer reduced motion" },
      { type: "improve", zh: "全局启用 scroll-behavior: smooth（仅限非减动效模式）", en: "Global smooth scrolling enabled (respects prefers-reduced-motion)" },
      { type: "improve", zh: "_document 新增 preconnect + dns-prefetch 预连接（汇率 API / IANA RDAP）", en: "Document head: preconnect + dns-prefetch hints for exchange-rate API and IANA RDAP" },
    ],
  },
  {
    version: "1.8",
    date: "2026-03",
    changes: [
      { type: "improve", zh: "WHOIS 合并等待窗口从 600 ms 压缩至 350 ms，RDAP 优先结果更快返回", en: "WHOIS merge-wait window reduced 600 → 350 ms; RDAP-first results arrive ~250 ms earlier" },
      { type: "improve", zh: "渐进式容灾触发时间从 3500 ms 提前至 3000 ms，慢 TLD 最坏情况提速 500 ms", en: "Progressive fallback trigger lowered 3 500 → 3 000 ms; worst-case 500 ms faster for slow TLDs" },
      { type: "improve", zh: "whoiser 模块在进程启动时预热加载，首次查询无模块解析开销", en: "whoiser module eagerly warm-loaded at process start — no parse overhead on first query" },
      { type: "improve", zh: "常见 2 段域名（.com/.net 等）TLD 数据库查询从 4 次减为 2 次（去重）", en: "TLD DB calls halved for 2-part domains (.com/.net…): 4 queries → 2 via deduplication" },
    ],
  },
  {
    version: "1.7",
    date: "2026-03",
    changes: [
      { type: "improve", zh: "查询 API 新增 IP 滑动窗口限流（每 IP 每分钟 40 次），防止滥用爬取", en: "Lookup API: IP-based sliding-window rate limiting (40 req/min) to prevent abuse" },
      { type: "improve", zh: "查询 API 严格校验 HTTP 方法（仅 GET），拒绝非法请求", en: "Lookup API: strict HTTP method validation — only GET accepted" },
      { type: "improve", zh: "查询长度上限 300 字符，拒绝含控制字符的恶意输入", en: "Query length capped at 300 chars; control characters rejected with 400" },
      { type: "improve", zh: "限流响应头标准化：X-RateLimit-Limit / Remaining / Reset 三字段", en: "Standard rate-limit headers: X-RateLimit-Limit / Remaining / Reset" },
      { type: "improve", zh: "管理后台设置保存提示说明同步延迟（当前浏览器即时 · 其他会话 60 秒内）", en: "Admin settings save button now shows sync latency note (instant in current browser, ≤60 s elsewhere)" },
      { type: "feature", zh: "新增四项访问控制开关：禁用登录 / 维护模式 / 纯查询模式 / 隐藏原始 WHOIS", en: "Four new access-control toggles: disable login, maintenance mode, query-only mode, hide raw WHOIS" },
    ],
  },
  {
    version: "1.6",
    date: "2026-03",
    changes: [
      { type: "new", zh: "域名价值评分系统：100 分制多维评估（长度/后缀/关键词/拼写模式）", en: "Domain value scoring: 100-point multi-dimensional evaluation (length/TLD/keywords/pattern)" },
      { type: "new", zh: "支持后缀页：IANA 全量 1436 个 TLD，含 248 ccTLD + 1188 gTLD", en: "TLDs page: full IANA list of 1436 TLDs including 248 ccTLD and 1188 gTLD" },
      { type: "new", zh: "支持后缀页支持 ccTLD / gTLD 分类筛选，统计卡片可点击切换", en: "TLDs page: filterable by ccTLD/gTLD via clickable stat cards" },
      { type: "new", zh: "支持后缀页标注 WHOIS / RDAP 双协议支持情况，ccTLD 显示国家名称", en: "TLDs page: WHOIS/RDAP badge indicators per TLD with ccTLD country name display" },
      { type: "new", zh: "支持后缀页整合 IANA RDAP bootstrap 数据，gTLD 默认展示 RDAP 支持", en: "TLDs page: integrated IANA RDAP bootstrap data; gTLDs show RDAP support by default" },
      { type: "new", zh: "关于我们页：项目介绍、核心功能、技术栈、二次创作声明、致谢版块", en: "About page: project intro, features, tech stack, remix declaration, and acknowledgements" },
      { type: "new", zh: "致谢版块：列出 nazhumi.com / tian.hu / miqingju.com / yisi.yun 合作方", en: "Acknowledgements: nazhumi.com / tian.hu / miqingju.com / yisi.yun listed as partners" },
      { type: "new", zh: "更新记录页：版本时间线，支持类型分类（新增/功能/优化/修复）", en: "Changelog page: version timeline with categorized change types (new/feature/improve/fix)" },
      { type: "new", zh: "友情链接页：域名行业精选工具与资源导航", en: "Friendly Links page: curated domain industry tools and resources" },
      { type: "new", zh: "工具箱全分类点击量统计，按热度永久排序", en: "Toolbox: click count tracking across all categories with persistent sort by popularity" },
      { type: "improve", zh: "移动端 iOS Safari 点击输入框自动缩放问题全站修复", en: "Fixed iOS Safari page zoom on input focus globally" },
      { type: "fix", zh: "修复横向溢出导致反馈抽屉触发偏移的问题", en: "Fixed horizontal overflow causing feedback drawer misalignment" },
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
        <title key="site-title">{`${isChinese ? "更新记录" : "Changelog"} — ${siteName}`}</title>
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
