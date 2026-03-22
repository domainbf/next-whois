import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSiteSettings } from "@/lib/site-settings";
import { useTranslation } from "@/lib/i18n";
import {
  RiArrowLeftSLine,
  RiLinksLine,
  RiExternalLinkLine,
  RiGlobalLine,
  RiSearchLine,
  RiServerLine,
  RiNewspaperLine,
  RiToolsLine,
  RiShoppingCartLine,
} from "@remixicon/react";

interface LinkItem {
  name: string;
  url: string;
  desc: string;
  descEn: string;
}

interface LinkGroup {
  id: string;
  icon: typeof RiGlobalLine;
  color: string;
  titleZh: string;
  titleEn: string;
  items: LinkItem[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    id: "lookup",
    icon: RiSearchLine,
    color: "text-blue-500",
    titleZh: "查询工具",
    titleEn: "Lookup Tools",
    items: [
      { name: "ICANN WHOIS", url: "https://lookup.icann.org", desc: "ICANN 官方 WHOIS 查询服务", descEn: "ICANN official WHOIS lookup service" },
      { name: "OneFour 查询", url: "https://yisi.yun", desc: "专业域名 WHOIS/RDAP 查询工具", descEn: "Professional WHOIS/RDAP lookup tool" },
      { name: "Domainr", url: "https://domainr.com", desc: "域名可用性实时查询", descEn: "Real-time domain availability search" },
      { name: "Completedns", url: "https://completedns.com", desc: "域名注册历史查询", descEn: "Domain registration history lookup" },
      { name: "Securitytrails", url: "https://securitytrails.com", desc: "域名历史主机与 DNS 查询", descEn: "Domain DNS and hosting history" },
      { name: "IPinfo", url: "https://ipinfo.io", desc: "IP 地址归属与 ASN 查询", descEn: "IP address geolocation and ASN lookup" },
    ],
  },
  {
    id: "market",
    icon: RiShoppingCartLine,
    color: "text-emerald-500",
    titleZh: "交易市场",
    titleEn: "Marketplaces",
    items: [
      { name: "Namebio", url: "https://namebio.com", desc: "国际域名历史成交行情数据", descEn: "Historical domain sales data and market trends" },
      { name: "Dan.com", url: "https://dan.com", desc: "国际主流域名停放销售平台", descEn: "Popular international domain marketplace" },
      { name: "Sedo", url: "https://sedo.com", desc: "全球最大域名停放销售平台", descEn: "World's largest domain parking and sales platform" },
      { name: "Afternic", url: "https://afternic.com", desc: "GoDaddy 旗下域名挂牌销售", descEn: "GoDaddy's premium domain listing service" },
      { name: "Alter", url: "https://alter.com", desc: "品牌域名交易平台", descEn: "Brandable domain name marketplace" },
      { name: "4.cn", url: "https://www.4.cn", desc: "国内主流域名停放销售平台", descEn: "Leading Chinese domain trading platform" },
    ],
  },
  {
    id: "registrar",
    icon: RiServerLine,
    color: "text-violet-500",
    titleZh: "域名注册商",
    titleEn: "Registrars",
    items: [
      { name: "Porkbun", url: "https://porkbun.com", desc: "全球米农公认的便宜注册商", descEn: "Globally recognized affordable domain registrar" },
      { name: "Namecheap", url: "https://namecheap.com", desc: "国际知名服务优秀的注册商", descEn: "International registrar with great service" },
      { name: "Dynadot", url: "https://dynadot.com", desc: "受欢迎的国外域名注册商", descEn: "Popular international domain registrar" },
      { name: "阿里云", url: "https://wanwang.aliyun.com", desc: "国内终端最喜欢的注册平台", descEn: "China's most popular domain registration platform" },
      { name: "Namesilo", url: "https://namesilo.com", desc: "支持支付宝的实惠注册商", descEn: "Affordable registrar supporting Alipay" },
      { name: "Godaddy", url: "https://godaddy.com", desc: "历史悠久的全球知名注册商", descEn: "World's largest and most recognized registrar" },
    ],
  },
  {
    id: "price",
    icon: RiToolsLine,
    color: "text-amber-500",
    titleZh: "价格比较",
    titleEn: "Price Comparison",
    items: [
      { name: "Domcomp", url: "https://www.domcomp.com", desc: "注册/续费/转入价格三合一比价", descEn: "Compare registration, renewal and transfer prices" },
      { name: "Tld-list", url: "https://tld-list.com", desc: "全球后缀注册价格总览", descEn: "Global TLD registration price overview" },
      { name: "NameBeta", url: "https://namebeta.com", desc: "多注册商域名价格实时对比", descEn: "Real-time domain price comparison" },
      { name: "哪煮米", url: "https://www.nazhumi.com", desc: "域名注册比价（人工维护）", descEn: "Domain price comparison (manually curated)" },
      { name: "tldes", url: "https://tldes.com/promo", desc: "99+ 注册商最低价查询", descEn: "Cheapest domains across 99+ registrars" },
    ],
  },
  {
    id: "news",
    icon: RiNewspaperLine,
    color: "text-sky-500",
    titleZh: "行业资讯",
    titleEn: "Industry News",
    items: [
      { name: "Dnjournal", url: "https://dnjournal.com", desc: "域名行业权威资讯与交易新闻", descEn: "Authority domain industry news and sales reports" },
      { name: "Domainnamewire", url: "https://domainnamewire.com", desc: "域名行业资讯与新闻", descEn: "Domain name industry news and analysis" },
      { name: "Domaingang", url: "https://domaingang.com", desc: "域名行业资讯与市场评论", descEn: "Domain industry news and market commentary" },
      { name: "Domain Sherpa", url: "https://domainsherpa.com", desc: "域名投资访谈与教育视频", descEn: "Domain investing interviews and education" },
      { name: "玩米网", url: "https://www.wanmi.cc", desc: "域名行情走势与交易社区", descEn: "Chinese domain market trends and community" },
    ],
  },
];

const card = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.28, delay: i * 0.07, ease: [0.32, 0.72, 0, 1] },
  }),
};

export default function LinksPage() {
  const { locale } = useTranslation();
  const settings = useSiteSettings();
  const isChinese = locale === "zh" || locale === "zh-tw";
  const siteName = settings.site_logo_text || "NEXT WHOIS";

  return (
    <>
      <Head>
        <title key="site-title">{isChinese ? "友情链接" : "Friendly Links"} — {siteName}</title>
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
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <RiLinksLine className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">
                  {isChinese ? "友情链接" : "Friendly Links"}
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isChinese ? "精选域名行业相关工具与资源" : "Curated domain industry tools and resources"}
                </p>
              </div>
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
              {LINK_GROUPS.reduce((s, g) => s + g.items.length, 0)} {isChinese ? "个链接" : "links"}
            </span>
          </div>

          <div className="space-y-8">
            {LINK_GROUPS.map((group, gi) => (
              <section key={group.id}>
                <div className="flex items-center gap-3 mb-3">
                  <group.icon className={`w-4 h-4 ${group.color}`} />
                  <h2 className="text-sm font-bold tracking-tight">
                    {isChinese ? group.titleZh : group.titleEn}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">{group.items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item, ii) => (
                    <motion.a
                      key={item.url}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      custom={gi * 10 + ii}
                      initial="hidden"
                      animate="visible"
                      variants={card}
                      whileTap={{ scale: 0.96 }}
                      className="group glass-panel border border-border rounded-xl p-3 flex items-start gap-3 hover:border-primary/30 hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <RiGlobalLine className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-semibold truncate">{item.name}</span>
                          <RiExternalLinkLine className="w-2.5 h-2.5 text-muted-foreground/40 group-hover:text-primary/50 transition-colors shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                          {isChinese ? item.desc : item.descEn}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 text-center space-y-1">
            <p className="text-[11px] text-muted-foreground/50">
              {isChinese ? "如需申请友链，请联系管理员" : "Contact admin to apply for a friendly link"}
            </p>
          </div>
        </main>
      </ScrollArea>
    </>
  );
}
