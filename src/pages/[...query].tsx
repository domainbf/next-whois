import { lookupWhoisWithCache } from "@/lib/whois/lookup";
import {
  cleanDomain,
  cn,
  getWindowHref,
  isValidDomainTld,
  toSearchURI,
  useClipboard,
  useSaver,
} from "@/lib/utils";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { getOrigin } from "@/lib/seo";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import {
  RiCameraLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiLinkM,
  RiBarChartBoxAiFill,
  RiShareLine,
  RiTwitterXLine,
  RiFacebookFill,
  RiRedditLine,
  RiWhatsappLine,
  RiTelegramLine,
  RiTimeLine,
  RiExchangeDollarFill,
  RiBillLine,
  RiDownloadLine,
  RiServerLine,
  RiGlobalLine,
  RiForbidLine,
  RiLockLine,
  RiPauseCircleLine,
  RiScalesLine,
  RiLoopLeftLine,
  RiDeleteBin2Line,
  RiCheckLine,
  RiShoppingCartLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiCalendar2Line,
  RiStickyNoteLine,
  RiTimerLine,
  RiCalendarEventLine,
  RiShieldCheckLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiSearchLine,
  RiCheckboxCircleLine,
  RiCheckboxBlankCircleLine,
  RiFlagLine,
} from "@remixicon/react";
import { getTopRegistrars, DomainPricing } from "@/lib/pricing/client";
import { FeedbackDrawer } from "@/components/feedback-drawer";
import { computeLifecycle, fmtDate, fmtDateTime, fmtCountdown } from "@/lib/lifecycle";
import React, { useEffect, useMemo } from "react";
import { addHistory, detectQueryType } from "@/lib/history";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { WhoisAnalyzeResult, WhoisResult } from "@/lib/whois/types";
import {
  getEppStatusInfo,
  getEppStatusColor,
  getEppStatusDisplayName,
  getEppStatusLink,
  getEppStatusDescription,
} from "@/lib/whois/epp_status";
import { SearchBox } from "@/components/search_box";
import {
  KeyboardShortcut,
  SearchHotkeysText,
} from "@/components/search_shortcuts";
import { useTranslation, TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSearchHotkeys } from "@/hooks/useSearchHotkeys";

const REGISTRAR_ICONS: Record<string, { slug: string | null; color: string }> =
  {
    godaddy: { slug: "godaddy", color: "#1BDBDB" },
    namecheap: { slug: "namecheap", color: "#DE3723" },
    cloudflare: { slug: "cloudflare", color: "#F38020" },
    google: { slug: "google", color: "#000000" },
    googledomains: { slug: "google", color: "#000000" },
    ovh: { slug: "ovh", color: "#123F6D" },
    ovhcloud: { slug: "ovh", color: "#123F6D" },
    ionos: { slug: "ionos", color: "#003D8F" },
    "1and1": { slug: "ionos", color: "#003D8F" },
    "1&1": { slug: "ionos", color: "#003D8F" },
    uniteddomains: { slug: "ionos", color: "#003D8F" },
    gandi: { slug: "gandi", color: "#6640FE" },
    porkbun: { slug: "porkbun", color: "#EF7878" },
    hetzner: { slug: "hetzner", color: "#D50C2D" },
    hostinger: { slug: "hostinger", color: "#673DE6" },
    alibaba: { slug: "alibabacloud", color: "#FF6A00" },
    alibabacloud: { slug: "alibabacloud", color: "#FF6A00" },
    aliyun: { slug: "alibabacloud", color: "#FF6A00" },
    hichina: { slug: "alibabacloud", color: "#FF6A00" },
    wanwang: { slug: "alibabacloud", color: "#FF6A00" },
    tencent: { slug: "/registrar-icons/tencent.png", color: "#EB1923" },
    dnspod: { slug: "/registrar-icons/dnspod.png", color: "#EB1923" },
    digitalocean: { slug: "digitalocean", color: "#0080FF" },
    squarespace: { slug: "squarespace", color: "#000000" },
    wix: { slug: "wix", color: "#0C6EFC" },
    wordpress: { slug: "wordpress", color: "#21759B" },
    automattic: { slug: "wordpress", color: "#21759B" },
    netlify: { slug: "netlify", color: "#00C7B7" },
    vercel: { slug: "vercel", color: "#000000" },
    namedotcom: { slug: "/registrar-icons/namecom.png", color: "#236BFF" },
    "name.com": { slug: "/registrar-icons/namecom.png", color: "#236BFF" },
    namesilo: { slug: "namesilo", color: "#031B4E" },
    dynadot: { slug: "/registrar-icons/dynadot.png", color: "#4E2998" },
    enom: { slug: "/registrar-icons/enom.png", color: "#F09B1B" },
    tucows: { slug: "/registrar-icons/tucows.png", color: "#F09B1B" },
    networksolutions: {
      slug: "/registrar-icons/networksolutions.png",
      color: "#2E8B57",
    },
    markmonitor: { slug: "/registrar-icons/markmonitor.png", color: "#2B5797" },
    amazon: { slug: "/registrar-icons/amazon.png", color: "#FF9900" },
    aws: { slug: "/registrar-icons/amazon.png", color: "#FF9900" },
    hover: { slug: "/registrar-icons/hover.png", color: "#3B7DDD" },
    rebel: { slug: "/registrar-icons/hover.png", color: "#3B7DDD" },
    epik: { slug: "/registrar-icons/epik.png", color: "#4A90D9" },
    dreamhost: { slug: "/registrar-icons/dreamhost.png", color: "#0073EC" },
    bluehost: { slug: "/registrar-icons/bluehost.png", color: "#003580" },
    hostgator: { slug: "/registrar-icons/hostgator.png", color: "#F8A41B" },
    siteground: { slug: "/registrar-icons/siteground.png", color: "#7B3FA0" },
    fastdomain: { slug: "/registrar-icons/fastdomain.png", color: "#003580" },
    huawei: { slug: "huawei", color: "#FF0000" },
    baidu: { slug: "baidu", color: "#2932E1" },
    ename: { slug: "/registrar-icons/ename.png", color: "#2C7BE5" },
    "ename technology": {
      slug: "/registrar-icons/ename.png",
      color: "#2C7BE5",
    },
    xinnet: { slug: "/registrar-icons/xinnet.png", color: "#E60012" },
    "identity digital": {
      slug: "/registrar-icons/identitydigital.png",
      color: "#1A1A2E",
    },
    donuts: { slug: "/registrar-icons/identitydigital.png", color: "#1A1A2E" },
    "registry operator": {
      slug: "/registrar-icons/identitydigital.png",
      color: "#1A1A2E",
    },
    "360": { slug: "/registrar-icons/360.png", color: "#2FC332" },
    qihoo: { slug: "/registrar-icons/360.png", color: "#2FC332" },
    westcn: { slug: "/registrar-icons/westcn.png", color: "#2B7DE9" },
    "west.cn": { slug: "/registrar-icons/westcn.png", color: "#2B7DE9" },
    vultr: { slug: "/registrar-icons/vultr.png", color: "#007BFC" },
    scaleway: { slug: "/registrar-icons/scaleway.png", color: "#4F0599" },
    csc: { slug: "/registrar-icons/csc.png", color: "#00529B" },
    cscglobal: { slug: "/registrar-icons/csc.png", color: "#00529B" },
    webcom: { slug: null, color: "#1166BB" },
    "web.com": { slug: null, color: "#1166BB" },
    registercom: { slug: "/registrar-icons/registercom.png", color: "#00A651" },
    "register.com": {
      slug: "/registrar-icons/registercom.png",
      color: "#00A651",
    },
    domaincom: { slug: "/registrar-icons/domaincom.png", color: "#2B74B4" },
    "domain.com": { slug: "/registrar-icons/domaincom.png", color: "#2B74B4" },
    gname: { slug: "/registrar-icons/gname.png", color: "#1E90FF" },
    shopify: { slug: "/registrar-icons/shopify.png", color: "#7AB55C" },
    oracle: { slug: "oracle", color: "#F80000" },
    gmo: { slug: "/registrar-icons/gmo.png", color: "#FF6600" },
    onamae: { slug: "/registrar-icons/gmo.png", color: "#FF6600" },
    gabia: { slug: "/registrar-icons/gabia.png", color: "#EE2737" },
    regru: { slug: "/registrar-icons/regru.png", color: "#FF6B00" },
    "reg.ru": { slug: "/registrar-icons/regru.png", color: "#FF6B00" },
    rucenter: { slug: "/registrar-icons/rucenter.png", color: "#005BAC" },
    "ru-center": { slug: "/registrar-icons/rucenter.png", color: "#005BAC" },
    strato: { slug: "/registrar-icons/strato.png", color: "#2DB928" },
    spaceship: { slug: "/registrar-icons/spaceship.png", color: "#6366F1" },
    centralnic: { slug: "/registrar-icons/centralnic.png", color: "#1D6AE5" },
    keysystems: { slug: "/registrar-icons/centralnic.png", color: "#1D6AE5" },
    rrpproxy: { slug: "/registrar-icons/centralnic.png", color: "#1D6AE5" },
    bigrock: { slug: "/registrar-icons/bigrock.png", color: "#FF6C2C" },
    resellerclub: {
      slug: "/registrar-icons/resellerclub.png",
      color: "#F99D1C",
    },
    publicdomainregistry: { slug: null, color: "#0066FF" },
    pdr: { slug: null, color: "#0066FF" },
    internetbs: { slug: null, color: "#2196F3" },
    "internet.bs": { slug: null, color: "#2196F3" },
  };

const NS_BRANDS: {
  brand: string;
  domains: string[];
  slug: string | null;
  color: string;
}[] = [
  {
    brand: "GoDaddy",
    domains: ["domaincontrol.com"],
    slug: "godaddy",
    color: "#1BDBDB",
  },
  {
    brand: "Cloudflare",
    domains: [
      "cloudflare.com",
      "foundationdns.com",
      "foundationdns.net",
      "foundationdns.org",
    ],
    slug: "cloudflare",
    color: "#F38020",
  },
  {
    brand: "Namecheap",
    domains: ["registrar-servers.com", "namecheaphosting.com"],
    slug: "namecheap",
    color: "#DE3723",
  },
  {
    brand: "Porkbun",
    domains: ["porkbun.com"],
    slug: "porkbun",
    color: "#EF7878",
  },
  {
    brand: "Hetzner",
    domains: [
      "hetzner.com",
      "hetzner.de",
      "first-ns.de",
      "second-ns.de",
      "second-ns.com",
      "your-server.de",
    ],
    slug: "hetzner",
    color: "#D50C2D",
  },
  {
    brand: "OVHcloud",
    domains: ["ovh.net", "ovh.ca", "anycast.me"],
    slug: "ovh",
    color: "#123F6D",
  },
  {
    brand: "IONOS",
    domains: ["ui-dns.com", "ui-dns.org", "ui-dns.de", "ui-dns.biz"],
    slug: "ionos",
    color: "#003D8F",
  },
  { brand: "Gandi", domains: ["gandi.net"], slug: "gandi", color: "#6640FE" },
  {
    brand: "DigitalOcean",
    domains: ["digitalocean.com"],
    slug: "digitalocean",
    color: "#0080FF",
  },
  {
    brand: "Hostinger",
    domains: ["dns-parking.com", "main-hosting.eu"],
    slug: "hostinger",
    color: "#673DE6",
  },
  {
    brand: "Netlify",
    domains: ["netlify.com"],
    slug: "netlify",
    color: "#00C7B7",
  },
  {
    brand: "NS1",
    domains: ["nsone.net"],
    slug: "/registrar-icons/ns1.png",
    color: "#760DDE",
  },
  {
    brand: "Vercel",
    domains: ["vercel-dns.com"],
    slug: "vercel",
    color: "#000000",
  },
  { brand: "Wix", domains: ["wixdns.net"], slug: "wix", color: "#0C6EFC" },
  {
    brand: "Squarespace",
    domains: ["squarespace-dns.com", "squarespace.com"],
    slug: "squarespace",
    color: "#000000",
  },
  {
    brand: "WordPress",
    domains: ["wordpress.com"],
    slug: "wordpress",
    color: "#21759B",
  },
  {
    brand: "AWS Route 53",
    domains: ["awsdns"],
    slug: "/registrar-icons/amazon.png",
    color: "#232F3E",
  },
  {
    brand: "Azure DNS",
    domains: [
      "azure-dns.com",
      "azure-dns.net",
      "azure-dns.org",
      "azure-dns.info",
    ],
    slug: "/registrar-icons/azure.png",
    color: "#0078D4",
  },
  {
    brand: "Google",
    domains: ["googledomains.com", "google.com"],
    slug: "google",
    color: "#000000",
  },
  {
    brand: "Akamai",
    domains: ["linode.com", "akam.net", "akamaiedge.net"],
    slug: "akamai",
    color: "#0096D6",
  },
  {
    brand: "Hurricane Electric",
    domains: ["dns.he.net"],
    slug: "/registrar-icons/he.png",
    color: "#E40000",
  },
  {
    brand: "DNSPod",
    domains: [
      "dnspod.net",
      "qq.com",
      "dnsv2.com",
      "dnsv3.com",
      "dnsv4.com",
      "dnsv5.com",
      "iidns.com",
    ],
    slug: "/registrar-icons/dnspod.png",
    color: "#4478E6",
  },
  {
    brand: "Tencent Cloud",
    domains: ["tencentcloudcns.com"],
    slug: "/registrar-icons/tencent.png",
    color: "#EB1923",
  },
  {
    brand: "DNSimple",
    domains: ["dnsimple.com", "dnsimple-edge.net"],
    slug: "/registrar-icons/dnsimple.png",
    color: "#205EBB",
  },
  {
    brand: "ClouDNS",
    domains: ["cloudns.net"],
    slug: "/registrar-icons/cloudns.png",
    color: "#4FA3D7",
  },
  { brand: "FreeDNS", domains: ["afraid.org"], slug: null, color: "#27AE60" },
  {
    brand: "Name.com",
    domains: ["name.com"],
    slug: "/registrar-icons/namecom.png",
    color: "#236BFF",
  },
  {
    brand: "Hover",
    domains: ["hover.com"],
    slug: "/registrar-icons/hover.png",
    color: "#3B7DDD",
  },
  {
    brand: "Dynadot",
    domains: ["dynadot.com"],
    slug: "/registrar-icons/dynadot.png",
    color: "#4E2998",
  },
  {
    brand: "Enom",
    domains: ["name-services.com"],
    slug: "/registrar-icons/enom.png",
    color: "#F09B1B",
  },
  {
    brand: "Network Solutions",
    domains: ["worldnic.com"],
    slug: "/registrar-icons/networksolutions.png",
    color: "#2E8B57",
  },
  {
    brand: "NameSilo",
    domains: ["dnsowl.com", "namesilo.com"],
    slug: "namesilo",
    color: "#031B4E",
  },
  {
    brand: "Alibaba Cloud",
    domains: ["hichina.com", "alidns.com", "net.cn", "aliyun.com"],
    slug: "alibabacloud",
    color: "#FF6A00",
  },
  {
    brand: "Baidu Cloud",
    domains: ["bdydns.cn", "bdydns.com"],
    slug: "baidu",
    color: "#2932E1",
  },
  {
    brand: "Huawei Cloud",
    domains: [
      "huaweicloud-dns.com",
      "huaweicloud-dns.cn",
      "huaweicloud-dns.net",
      "hwclouds-dns.com",
      "hwclouds-dns.net",
      "huawei.com",
    ],
    slug: "huawei",
    color: "#FF0000",
  },
  {
    brand: "Tucows",
    domains: ["tucows.com"],
    slug: "/registrar-icons/tucows.png",
    color: "#F09B1B",
  },
  {
    brand: "360",
    domains: ["360safe.com"],
    slug: "/registrar-icons/360.png",
    color: "#2FC332",
  },
  {
    brand: "eName",
    domains: ["ename.net", "ename.com"],
    slug: "/registrar-icons/ename.png",
    color: "#2C7BE5",
  },
  {
    brand: "Xinnet",
    domains: ["xinnet.com", "xincache.com"],
    slug: "/registrar-icons/xinnet.png",
    color: "#E60012",
  },
  {
    brand: "West.cn",
    domains: ["myhostadmin.net", "west-dns.com", "est.cn"],
    slug: "/registrar-icons/westcn.png",
    color: "#2B7DE9",
  },
  {
    brand: "JD Cloud",
    domains: ["jdgslb.com", "jdcache.com"],
    slug: "/registrar-icons/jdcloud.png",
    color: "#C9151E",
  },
  {
    brand: "Volcengine",
    domains: ["volcengine.com", "volcdns.com"],
    slug: "/registrar-icons/volcengine.png",
    color: "#3370FF",
  },
  {
    brand: "Fastly",
    domains: ["fastly.net"],
    slug: "/registrar-icons/fastly.png",
    color: "#FF282D",
  },
  {
    brand: "UltraDNS",
    domains: ["ultradns.com", "ultradns.net", "ultradns.org"],
    slug: "/registrar-icons/ultradns.png",
    color: "#5B2D8E",
  },
  {
    brand: "Constellix",
    domains: ["constellix.com", "constellix.net"],
    slug: "/registrar-icons/constellix.png",
    color: "#4B9CD3",
  },
  {
    brand: "easyDNS",
    domains: ["easydns.com", "easydns.net", "easydns.org"],
    slug: "/registrar-icons/easydns.png",
    color: "#29A8E0",
  },
  {
    brand: "Vultr",
    domains: ["vultr.com"],
    slug: "/registrar-icons/vultr.png",
    color: "#007BFC",
  },
  {
    brand: "Scaleway",
    domains: ["scaleway.com"],
    slug: "/registrar-icons/scaleway.png",
    color: "#4F0599",
  },
  {
    brand: "TransIP",
    domains: ["transip.net", "transip.nl"],
    slug: "/registrar-icons/transip.png",
    color: "#74B63B",
  },
  {
    brand: "SiteGround",
    domains: ["siteground.net", "sgvps.net"],
    slug: "/registrar-icons/siteground.png",
    color: "#7B3FA0",
  },
  {
    brand: "Bluehost",
    domains: ["bluehost.com"],
    slug: "/registrar-icons/bluehost.png",
    color: "#003580",
  },
  {
    brand: "DreamHost",
    domains: ["dreamhost.com"],
    slug: "/registrar-icons/dreamhost.png",
    color: "#0073EC",
  },
  {
    brand: "HostGator",
    domains: ["hostgator.com"],
    slug: "/registrar-icons/hostgator.png",
    color: "#F8A41B",
  },
  {
    brand: "Epik",
    domains: ["epik.com"],
    slug: "/registrar-icons/epik.png",
    color: "#4A90D9",
  },
  {
    brand: "MarkMonitor",
    domains: ["markmonitor.com"],
    slug: "/registrar-icons/markmonitor.png",
    color: "#2B5797",
  },
  {
    brand: "Identity Digital",
    domains: ["donuts.co", "identity.digital"],
    slug: "/registrar-icons/identitydigital.png",
    color: "#1A1A2E",
  },
  {
    brand: "CSC Global",
    domains: ["cscglobal.com", "cscdns.net"],
    slug: "/registrar-icons/csc.png",
    color: "#00529B",
  },
  {
    brand: "Shopify",
    domains: ["shopify.com", "myshopify.com"],
    slug: "/registrar-icons/shopify.png",
    color: "#7AB55C",
  },
  {
    brand: "Oracle/Dyn",
    domains: ["dynect.net", "oraclecloud.net"],
    slug: "oracle",
    color: "#F80000",
  },
  {
    brand: "Imperva",
    domains: ["impervadns.net", "incapdns.net"],
    slug: "/registrar-icons/imperva.png",
    color: "#004680",
  },
  {
    brand: "Sucuri",
    domains: ["sucuridns.com", "sucuri.net"],
    slug: "/registrar-icons/sucuri.png",
    color: "#88C946",
  },
  {
    brand: "Verisign",
    domains: ["verisign-grs.com", "verisigndns.com", "nstld.com"],
    slug: "/registrar-icons/verisign.png",
    color: "#003399",
  },
  {
    brand: "GMO/Onamae",
    domains: ["onamae.com", "gmoint.com", "gmoserver.jp"],
    slug: "/registrar-icons/gmo.png",
    color: "#FF6600",
  },
  {
    brand: "Gabia",
    domains: ["gabia.net", "gabia.io"],
    slug: "/registrar-icons/gabia.png",
    color: "#EE2737",
  },
  {
    brand: "Reg.ru",
    domains: ["reg.ru"],
    slug: "/registrar-icons/regru.png",
    color: "#FF6B00",
  },
  {
    brand: "RU-CENTER",
    domains: ["nic.ru"],
    slug: "/registrar-icons/rucenter.png",
    color: "#005BAC",
  },
  {
    brand: "Strato",
    domains: ["strato.de", "stratoserver.net", "rzone.de"],
    slug: "/registrar-icons/strato.png",
    color: "#2DB928",
  },
  {
    brand: "Bunny.net",
    domains: ["bunny.net", "bunnyinfra.net"],
    slug: "/registrar-icons/bunny.png",
    color: "#F47621",
  },
  {
    brand: "DNS Made Easy",
    domains: ["dnsmadeeasy.com"],
    slug: "/registrar-icons/dnsmadeeasy.png",
    color: "#6BB839",
  },
  {
    brand: "CentralNic",
    domains: ["centralnic.net", "rrpproxy.net"],
    slug: "/registrar-icons/centralnic.png",
    color: "#1D6AE5",
  },
  {
    brand: "Gname",
    domains: ["gname-dns.com"],
    slug: "/registrar-icons/gname.png",
    color: "#1E90FF",
  },
  {
    brand: "Register.com",
    domains: ["register.com"],
    slug: "/registrar-icons/registercom.png",
    color: "#00A651",
  },
  {
    brand: "Domain.com",
    domains: ["domain.com"],
    slug: "/registrar-icons/domaincom.png",
    color: "#2B74B4",
  },
  {
    brand: "Yandex",
    domains: ["yandexcloud.net", "yandex.net"],
    slug: "/registrar-icons/yandex.png",
    color: "#5282FF",
  },
  {
    brand: "DDoS-Guard",
    domains: ["ddos-guard.net"],
    slug: "/registrar-icons/ddosguard.png",
    color: "#0A2856",
  },
  {
    brand: "Sakura Internet",
    domains: ["sakura.ne.jp", "dns.ne.jp"],
    slug: "/registrar-icons/sakura.png",
    color: "#FF6699",
  },
  {
    brand: "Rackspace",
    domains: ["rackspace.com", "stabletransit.com"],
    slug: "rackspace",
    color: "#C40022",
  },
  {
    brand: "IBM Cloud",
    domains: ["softlayer.com"],
    slug: "ibm",
    color: "#054ADA",
  },
  {
    brand: "BigRock",
    domains: ["bigrock.in"],
    slug: "/registrar-icons/bigrock.png",
    color: "#FF6C2C",
  },
  {
    brand: "ResellerClub",
    domains: ["resellerclub.com"],
    slug: "/registrar-icons/resellerclub.png",
    color: "#F99D1C",
  },
  {
    brand: "Cafe24",
    domains: ["cafe24.com"],
    slug: "/registrar-icons/cafe24.png",
    color: "#13AA52",
  },
  {
    brand: "Gcore",
    domains: ["gcore.com", "gcorelabs.net"],
    slug: "/registrar-icons/gcore.png",
    color: "#FF4C00",
  },
  {
    brand: "Wangsu",
    domains: ["wscdns.com", "wsglb0.com"],
    slug: "/registrar-icons/wangsu.png",
    color: "#004B97",
  },
  {
    brand: "ZDNS",
    domains: ["zdnscloud.com", "zdns.cn"],
    slug: "/registrar-icons/zdns.png",
    color: "#1E73BE",
  },
  {
    brand: "No-IP",
    domains: ["no-ip.com"],
    slug: "/registrar-icons/noip.png",
    color: "#2196F3",
  },
  {
    brand: "Infomaniak",
    domains: ["infomaniak.com", "infomaniak.ch"],
    slug: "/registrar-icons/infomaniak.png",
    color: "#0F7A3F",
  },
  {
    brand: "Spaceship",
    domains: ["spaceship.com"],
    slug: "/registrar-icons/spaceship.png",
    color: "#6366F1",
  },
  { brand: "22.cn", domains: ["22.cn"], slug: null, color: "#FF6600" },
  { brand: "DNS.com", domains: ["dns.com"], slug: null, color: "#0099CC" },
  {
    brand: "Cndns",
    domains: ["dns-diy.com", "cndns.com"],
    slug: null,
    color: "#FF8C00",
  },
  {
    brand: "StackPath",
    domains: ["stackpathdns.com"],
    slug: null,
    color: "#003BDE",
  },
  { brand: "Zoho", domains: ["zoho.com"], slug: "zoho", color: "#C8202B" },
];

function getNsBrand(
  ns: string,
): { brand: string; slug: string | null; color: string } | null {
  const lower = ns.toLowerCase();
  for (const info of NS_BRANDS) {
    if (info.domains.some((d) => lower.includes(d))) return info;
  }
  return null;
}

function getRegistrarIcon(
  registrar: string,
  registrarURL?: string,
): { slug: string | null; color: string } | null {
  if (!registrar || registrar === "Unknown") return null;
  const normalized = registrar.toLowerCase().replace(/[\s.,\-_()]+/g, "");
  for (const [key, info] of Object.entries(REGISTRAR_ICONS)) {
    if (normalized.includes(key)) return info;
  }
  if (registrarURL) {
    const urlLower = registrarURL.toLowerCase();
    for (const [key, info] of Object.entries(REGISTRAR_ICONS)) {
      if (urlLower.includes(key)) return info;
    }
  }
  return null;
}

function getDarkModeIconColor(color: string): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.4 ? "white" : hex;
}

function resolveIconUrl(slug: string, color: string, dark: boolean): string {
  if (slug.startsWith("/")) return slug;
  const c = dark ? getDarkModeIconColor(color) : color.replace("#", "");
  return `https://cdn.simpleicons.org/${slug}/${c}`;
}

function getRegistrarFallbackColor(registrar: string): string {
  let hash = 0;
  for (let i = 0; i < registrar.length; i++) {
    hash = registrar.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Robustly parse a WHOIS date string into a Date object.
 * Handles formats like:
 *   "1996-07-01T02:00:00Z"
 *   "1996-07-01 02:00:00 U"    ← .ba / some ccTLDs append a TZ letter
 *   "1996-07-01 02:00:00 UTC"
 *   "1996-07-01 02:00:00+08:00"
 *   "2022-11-08 12:31:01"
 */
function parseWhoisDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === "Unknown") return null;
  // 1. Try as-is first (covers ISO 8601 with Z or offset)
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // 2. Strip trailing timezone code: single letters (U, Z) or abbreviations (UTC, EST, CET…)
  //    and numeric offsets (+08:00, -05:00) then retry
  const stripped = dateStr
    .replace(/\s+[+-]\d{2}:?\d{2}$/, "")   // remove " +08:00" / " -0500"
    .replace(/\s+[A-Z]{1,5}$/, "")          // remove " U" / " UTC" / " EST"
    .replace(/\.\d+$/, "")                  // remove fractional seconds
    .trim();
  d = new Date(stripped);
  if (!isNaN(d.getTime())) return d;
  // 3. Replace space separator with T for strict ISO parsing
  const isoLike = stripped.replace(" ", "T") + "Z";
  d = new Date(isoLike);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function getRelativeTime(
  dateStr: string,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
): string {
  if (!dateStr || dateStr === "Unknown") return "";
  try {
    const date = parseWhoisDate(dateStr);
    if (!date) return "";
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) {
      const abs = Math.abs(diffDays);
      if (abs < 30) return t("relative_time.in_days", { days: abs });
      if (abs < 365)
        return t("relative_time.in_months", { months: Math.floor(abs / 30) });
      return t("relative_time.in_years", { years: Math.floor(abs / 365) });
    }
    if (diffDays < 1) return t("relative_time.today");
    if (diffDays < 30) return t("relative_time.days_ago", { days: diffDays });
    if (diffDays < 365)
      return t("relative_time.months_ago", {
        months: Math.floor(diffDays / 30),
      });
    return t("relative_time.years_ago", { years: Math.floor(diffDays / 365) });
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "Unknown") return "—";
  const d = parseWhoisDate(dateStr);
  if (!d) return dateStr.slice(0, 10) || dateStr; // best-effort: first 10 chars
  return d.toISOString().slice(0, 10); // always YYYY-MM-DD
}

/**
 * Translate DNSSEC field values and embedded technical terms.
 * For zh/zh-tw locales, known DNSSEC terms are replaced with Chinese equivalents.
 * For all other locales the original value is returned unchanged.
 */
function translateDnssecValue(value: string, locale: string): string {
  if (!locale.startsWith("zh")) return value;
  const isTraditional = locale === "zh-tw";

  // Simple whole-value mapping for common RDAP/WHOIS values
  const WHOLE: Record<string, string> = {
    unsigned: "未签名",
    signed: "已签名",
    signeddelegation: "已签名",
    yes: "已签名",
    no: "未签名",
  };
  const key = value.toLowerCase().replace(/[\s\-_]/g, "");
  if (WHOLE[key]) {
    const v = WHOLE[key];
    return isTraditional ? v.replace("签", "簽") : v;
  }

  // Substring replacement for values that contain multiple terms
  const SUBS: [RegExp, string, string][] = [
    // [pattern, simplified, traditional]
    [/\bZone Signing Key\b/gi, "区域签名密钥", "區域簽名金鑰"],
    [/\bZSK\b/g, "ZSK", "ZSK"],
    [/\bKey Signing Key\b/gi, "密钥签名密钥", "金鑰簽名金鑰"],
    [/\bKSK\b/g, "KSK", "KSK"],
    [/\bDS Record\b/gi, "委托签名记录", "委託簽名記錄"],
    [/\bRRSIG\b/g, "资源记录签名", "資源記錄簽名"],
    [/\bDNSKEY\b/g, "DNS 密钥记录", "DNS 金鑰記錄"],
    [/\bNSEC3\b/g, "下一安全记录3", "下一安全記錄3"],
    [/\bNSEC\b/g, "下一安全记录", "下一安全記錄"],
    [/\bValidating Resolver\b/gi, "验证解析器", "驗證解析器"],
    [/\bValidation\b/gi, "验证", "驗證"],
    [/\bTrust Anchor\b/gi, "信任锚", "信任錨"],
    [/\bChain of Trust\b/gi, "信任链", "信任鏈"],
    [/\bKey Rollover\b/gi, "密钥滚动", "金鑰滾動"],
    [/\bDenial of Existence\b/gi, "存在否定", "存在否定"],
    [/\bAlgorithm\b/gi, "算法", "演算法"],
    [/\bsignedDelegation\b/gi, "已签名", "已簽名"],
    [/\bsigned\b/gi, "已签名", "已簽名"],
    [/\bunsigned\b/gi, "未签名", "未簽名"],
    [/\bDNSSEC\b/g, "DNS 安全扩展", "DNS 安全延伸"],
  ];

  let result = value;
  for (const [pattern, simplified, traditional] of SUBS) {
    result = result.replace(pattern, isTraditional ? traditional : simplified);
  }
  return result;
}

function buildOgUrl(
  target: string,
  _result?: WhoisAnalyzeResult | undefined,
  overrides?: { w?: number; h?: number; theme?: string },
): string {
  const params = new URLSearchParams();
  params.set("query", target);
  if (overrides?.w) params.set("w", String(overrides.w));
  if (overrides?.h) params.set("h", String(overrides.h));
  const themeVal =
    overrides?.theme ||
    (typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light");
  if (themeVal === "dark") params.set("theme", "dark");
  return `/api/og?${params.toString()}`;
}

function WhoisHighlight({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/;

  return (
    <>
      {content.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-3" />;
        if (
          trimmed.startsWith("%") ||
          trimmed.startsWith("#") ||
          trimmed.startsWith(">>>") ||
          trimmed.startsWith("--")
        ) {
          return (
            <div key={i} className="text-zinc-400 dark:text-zinc-600 italic">
              {line}
            </div>
          );
        }
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0 && colonIdx < 40) {
          const key = line.slice(0, colonIdx + 1);
          const value = line.slice(colonIdx + 1);
          return (
            <div key={i}>
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                {key}
              </span>
              <span className="text-zinc-700 dark:text-zinc-200">
                {value.split(urlRegex).map((part, j) =>
                  urlRegex.test(part) ? (
                    <a
                      key={j}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {part}
                    </a>
                  ) : (
                    <span key={j}>{part}</span>
                  ),
                )}
              </span>
            </div>
          );
        }
        return (
          <div key={i} className="text-zinc-600 dark:text-zinc-300">
            {line.split(urlRegex).map((part, j) =>
              urlRegex.test(part) ? (
                <a
                  key={j}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {part}
                </a>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </div>
        );
      })}
    </>
  );
}

function RdapJsonHighlight({ content }: { content: string }) {
  const tokenRegex =
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\]])|([,:])|([\s]+)/g;

  return (
    <>
      {content.split("\n").map((line, i) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        const re = new RegExp(tokenRegex.source, "g");
        while ((match = re.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(
              <span
                key={`t${lastIndex}`}
                className="text-zinc-600 dark:text-zinc-300"
              >
                {line.slice(lastIndex, match.index)}
              </span>,
            );
          }
          if (match[1]) {
            parts.push(
              <span
                key={`k${match.index}`}
                className="text-sky-600 dark:text-sky-400"
              >
                {match[1]}
              </span>,
              <span
                key={`c${match.index}`}
                className="text-zinc-400 dark:text-zinc-500"
              >
                :
              </span>,
            );
          } else if (match[2]) {
            const str = match[2];
            if (/^"https?:\/\//.test(str)) {
              const url = str.slice(1, -1);
              parts.push(
                <span
                  key={`s${match.index}`}
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  &quot;
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {url}
                  </a>
                  &quot;
                </span>,
              );
            } else {
              parts.push(
                <span
                  key={`s${match.index}`}
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  {str}
                </span>,
              );
            }
          } else if (match[3]) {
            parts.push(
              <span
                key={`n${match.index}`}
                className="text-amber-600 dark:text-amber-400"
              >
                {match[3]}
              </span>,
            );
          } else if (match[4]) {
            parts.push(
              <span
                key={`b${match.index}`}
                className="text-purple-600 dark:text-purple-400"
              >
                {match[4]}
              </span>,
            );
          } else if (match[5]) {
            parts.push(
              <span
                key={`p${match.index}`}
                className="text-zinc-400 dark:text-zinc-500"
              >
                {match[5]}
              </span>,
            );
          } else if (match[6]) {
            parts.push(
              <span
                key={`d${match.index}`}
                className="text-zinc-400 dark:text-zinc-500"
              >
                {match[6]}
              </span>,
            );
          } else if (match[7]) {
            parts.push(<span key={`w${match.index}`}>{match[7]}</span>);
          }
          lastIndex = re.lastIndex;
        }
        if (lastIndex < line.length) {
          parts.push(
            <span
              key={`e${lastIndex}`}
              className="text-zinc-600 dark:text-zinc-300"
            >
              {line.slice(lastIndex)}
            </span>,
          );
        }
        return (
          <div key={i} className="whitespace-pre">
            {parts.length > 0 ? parts : " "}
          </div>
        );
      })}
    </>
  );
}

function ResponsePanel({
  whoisContent,
  rdapContent,
  target,
  copy,
  save,
}: {
  whoisContent: string;
  rdapContent?: string;
  target: string;
  copy: (text: string) => void;
  save: (filename: string, content: string) => void;
}) {
  const { t } = useTranslation();
  const hasWhois = !!whoisContent;
  const hasRdap = !!rdapContent;
  const [activeTab, setActiveTab] = React.useState<"whois" | "rdap">(
    hasWhois ? "whois" : "rdap",
  );

  const currentContent =
    activeTab === "whois" ? whoisContent : rdapContent || "";
  const currentFilename =
    activeTab === "whois"
      ? `${target.replace(/\./g, "-")}-whois.txt`
      : `${target.replace(/\./g, "-")}-rdap.json`;

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 rounded-xl overflow-hidden border border-border flex flex-col shadow-lg h-full">
      <div className="bg-muted/50 dark:bg-black border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {hasWhois && (
            <button
              onClick={() => setActiveTab("whois")}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-mono transition-colors",
                activeTab === "whois"
                  ? "bg-background dark:bg-zinc-800 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Whois
            </button>
          )}
          {hasRdap && (
            <button
              onClick={() => setActiveTab("rdap")}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-mono transition-colors",
                activeTab === "rdap"
                  ? "bg-background dark:bg-zinc-800 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              RDAP
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copy(currentContent)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase font-medium tracking-wide flex items-center gap-1"
          >
            <RiFileCopyLine className="w-3 h-3" />
            {t("copy")}
          </button>
          <button
            onClick={() => save(currentFilename, currentContent)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase font-medium tracking-wide flex items-center gap-1"
          >
            <RiDownloadLine className="w-3 h-3" />
            {t("save")}
          </button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-[11px] leading-relaxed">
          {activeTab === "whois" && whoisContent && (
            <WhoisHighlight content={whoisContent} />
          )}
          {activeTab === "rdap" && rdapContent && (
            <RdapJsonHighlight content={rdapContent} />
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function targetToDisplayName(target: string): string {
  try {
    const { domainToUnicode } = require("url");
    const hasAce = target
      .toLowerCase()
      .split(".")
      .some((l: string) => l.startsWith("xn--"));
    if (!hasAce) return target;
    const unicode = domainToUnicode(target.toLowerCase());
    return unicode && unicode !== target.toLowerCase() ? unicode : target;
  } catch {
    return target;
  }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const querySegments: string[] = (context.params?.query as string[]) ?? [];
  const origin = getOrigin(context.req);
  const target = cleanDomain(querySegments.join("/"));
  const displayTarget = targetToDisplayName(target);

  // If the path is a single bare word (no dots, not an IP/ASN/CIDR), it's a
  // navigation path that doesn't match any page — show the real 404 page.
  const looksLikeQuery =
    target.includes(".") ||
    /^AS\d+$/i.test(target) ||
    /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}/.test(target);
  if (!looksLikeQuery) {
    return { notFound: true };
  }

  // Server-side TLD validation — reject clearly invalid domains before lookup
  if (!isValidDomainTld(target)) {
    return {
      props: {
        data: {
          time: 0,
          status: false,
          cached: false,
          error: "INVALID_DOMAIN_TLD",
        } as WhoisResult,
        target,
        displayTarget,
        origin,
      },
    };
  }

  try {
    const data = await lookupWhoisWithCache(target);
    return {
      props: {
        data: JSON.parse(JSON.stringify(data)),
        target,
        displayTarget,
        origin,
      },
    };
  } catch (e: any) {
    return {
      props: {
        data: {
          time: 0,
          status: false,
          cached: false,
          error: e?.message || "Lookup failed",
        } as WhoisResult,
        target,
        displayTarget,
        origin,
      },
    };
  }
}

function CssGlobe() {
  return (
    <>
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <symbol id="nw-icon-world" viewBox="0 0 216 100">
            <g fillRule="nonzero">
              <path d="M48 94l-3-4-2-14c0-3-1-5-3-8-4-5-6-9-4-11l1-4 1-3c2-1 9 0 11 1l3 2 2 3 1 2 8 2c1 1 2 2 0 7-1 5-2 7-4 7l-2 3-2 4-2 3-2 1c-2 2-2 9 0 10v1l-3-2zM188 90l3-2h1l-4 2zM176 87h2l-1 1-1-1zM195 86l3-2-2 2h-1zM175 83l-1-2-2-1-6 1c-5 1-5 1-5-2l1-4 2-2 4-3c5-4 9-5 9-3 0 3 3 3 4 1s1-2 1 0l3 4c2 4 1 6-2 10-4 3-7 4-8 1zM100 80c-2-4-4-11-3-14l-1-6c-1-1-2-3-1-4 0-2-4-3-9-3-4 0-5 0-7-3-1-2-2-4-1-7l3-6 3-3c1-2 10-4 11-2l6 3 5-1c3 1 4 0 5-1s-1-2-2-2l-4-1c0-1 3-3 6-2 3 0 3 0 2-2-2-2-6-2-7 0l-2 2-1 2-3-2-3-3c-1 0-1 1 1 2l1 2-2-1c-4-3-6-2-8 1-2 2-4 3-5 1-1-1 0-4 2-4l2-2 1-2 3-2 3-2 2 1c3 0 7-3 5-4l-1-3h-1l-1 3-2 2h-1l-2-1c-2-1-2-1 1-4 5-4 6-4 11-3 4 1 4 1 2 2v1l3-1 6-1c5 0 6-1 5-2l2 1c1 2 2 2 2 1-2-4 12-7 14-4l11 1 29 3 1 2-3 3c-2 0-2 0-1 1l1 3h-2c-1-1-2-3-1-4h-4l-6 2c-1 1-1 1 2 2 3 2 4 6 1 8v3c1 3 0 3-3 0s-4-1-2 3c3 4 3 7-2 8-5 2-4 1-2 5 2 3 0 5-3 4l-2-1-2-2-1-1-1-1-2-2c-1-2-1-2-4 0-2 1-3 4-3 5-1 3-1 3-3 1l-2-4c0-2-1-3-2-3l-1-1-4-2-6-1-4-2c-1 1 3 4 5 4h2c1 1 0 2-1 4-3 2-7 4-8 3l-7-10 5 10c2 2 3 3 5 2 3 0 2 1-2 7-4 4-4 5-4 8 1 3 1 4-1 6l-2 3c0 2-6 9-8 9l-3-2zm22-51l-2-3-1-1v-1c-2 0-2 2-1 4 2 3 4 4 4 1z" />
              <path d="M117 75c-1-2 0-6 2-7h2l-2 5c0 2-1 3-2 1zM186 64h-3c-2 0-6-3-5-5 1-1 6 1 7 3l2 3-2-1zM160 62h2c1 1 0 1-1 1l-1-1zM154 57l-1-2c2 2 3 1 2-2l-2-3 2 2 1 4 1 3v2l-3-4zM161 59c-1-1-1-2 1-4 3-3 4-3 4 0 0 4-2 6-5 4zM167 59l1-1 1 1-1 1-1-1zM176 59l1-1v2l-1-1zM141 52l1-1v2l-1-1zM170 52l1-1v2l-1-1zM32 50c-1-2-4-3-6-4-4-1-5-3-7-6l-3-5-2-2c-1-3-1-6 2-9 1-1 2-3 1-5 0-4-3-5-8-4H4l2-2 1-1 1-1 2-1c1-2 7-2 23-1 12 1 12 1 12-1h1c1 1 2 2 3 1l1 1-3 1c-2 0-8 4-8 5l2 1 2 3 4-3c3-4 4-4 5-3l3 1 1 2 1 2c3 0-1 2-4 2-2 0-2 0-2 2 1 1 0 2-2 2-4 1-12 9-12 12 0 2 0 2-1 1 0-2-2-3-6-2-3 0-4 1-4 3-2 4 0 6 3 4 3-1 3-1 2 1s-1 2 1 2l1 2 1 3 1 1-3-2zm8-24l1-1c0-1-4-3-5-2l1 1v2c-1 1-1 1 0 0h3zM167 47v-3l1 2c1 2 0 3-1 1z" />
              <path d="M41 43h2l-1 1-1-1zM37 42v-1l2 1h-2zM16 38l1-1v2l-1-1zM172 32l2-3h1c1 2 0 4-3 4v-1zM173 26h2l-1 1-1-1zM56 22h2l-2 1v-1zM87 19l1-2 1 3-1 1-1-2zM85 19l1-1v1l-1 1v-1zM64 12l1-3c2 0-1-4-3-4s-2 0 0-1V3l-6 2c-3 1-3 1-2-1 2-1 4-2 15-2h14c0 2-6 7-10 9l-5 2-2 1-2-2zM53 12l1-1c2 0-1-3-3-3-2-1-1-1 1-1l4 2c2 1 2 1 1 3-2 1-4 2-4 0zM80 12l1-1 1 1-1 1-1-1zM36 8h-2V7c1-1 7 0 7 1h-5zM116 7l1-1v1l-1 1V7zM50 5h2l-1 1-1-1zM97 5l2-1c0-1 1-1 0 0l-2 1z" />
            </g>
          </symbol>
          <symbol id="nw-icon-repeated-world" viewBox="0 0 432 100">
            <use href="#nw-icon-world" x="0" />
            <use href="#nw-icon-world" x="216" />
          </symbol>
        </defs>
      </svg>
      <style>{`
        @keyframes nw-world-scroll {
          from { margin-left: -2.75em; }
          to   { margin-left: -1.35em; }
        }
        .nw-globe-wrap {
          width: 120px;
          height: 120px;
          font-size: 120px;
          display: inline-block;
          border-radius: 50%;
          overflow: hidden;
          white-space: nowrap;
          box-sizing: border-box;
          border: 2px solid currentColor;
        }
        .nw-globe-wrap svg {
          width: 4em;
          height: 1em;
          margin-top: -0.05em;
          display: inline;
          animation: nw-world-scroll 4s linear infinite;
          fill: currentColor;
        }
      `}</style>
      <span className="nw-globe-wrap text-foreground/70">
        <svg>
          <use href="#nw-icon-repeated-world" />
        </svg>
      </span>
    </>
  );
}

type RegistrationStatusType =
  | "registered"
  | "available"
  | "reserved"
  | "prohibited"
  | "hold"
  | "dispute"
  | "redemption"
  | "pending-delete";

const STATUS_LABELS: Record<RegistrationStatusType, { zh: string; en: string }> = {
  registered: { zh: "已注册", en: "Registered" },
  available: { zh: "未注册", en: "Available" },
  reserved: { zh: "保留域名", en: "Reserved" },
  prohibited: { zh: "禁止注册", en: "Prohibited" },
  hold: { zh: "暂停", en: "On Hold" },
  dispute: { zh: "争议中", en: "In Dispute" },
  redemption: { zh: "赎回期", en: "Redemption" },
  "pending-delete": { zh: "待删除", en: "Pending Delete" },
};

function getDomainRegistrationStatus(
  result: WhoisAnalyzeResult,
  locale = "en",
): {
  type: RegistrationStatusType;
  label: string;
  color: string;
  dotColor: string;
} {
  const isZh = locale.startsWith("zh");

  // EPP lock statuses that contain "prohibited" in their name but are NOT
  // about registration prohibition — they protect already-registered domains.
  const EPP_PROHIBITED_LOCK_STATUSES = new Set([
    "clientdeleteprohibited",
    "clienttransferprohibited",
    "clientrenewprohibited",
    "clientupdateprohibited",
    "serverdeleteprohibited",
    "servertransferprohibited",
    "serverrenewprohibited",
    "serverupdateprohibited",
    // hyphenated / space variants used by some ccTLDs
    "client-delete-prohibited",
    "client-transfer-prohibited",
    "client-renew-prohibited",
    "client-update-prohibited",
    "server-delete-prohibited",
    "server-transfer-prohibited",
    "server-renew-prohibited",
    "server-update-prohibited",
  ]);

  const allStatusCodes = result.status.map((s) => s.status.toLowerCase().trim());
  const allStatusText = allStatusCodes.join(" ");

  // Build a separate text excluding EPP lock statuses for the prohibit check
  // so that "clientTransferProhibited" does not trigger "禁止注册".
  const prohibitCheckText = allStatusCodes
    .filter((s) => {
      const code = s.split(/\s+/)[0];
      return !EPP_PROHIBITED_LOCK_STATUSES.has(code);
    })
    .join(" ");

  // True only for genuine registration-prohibit signals, not EPP lock flags.
  const isProhibited =
    prohibitCheckText.includes("prohibited") ||
    prohibitCheckText.includes("registrationprohibited") ||
    prohibitCheckText.includes("cannot be registered") ||
    prohibitCheckText.includes("not available for registration") ||
    prohibitCheckText.includes("not-available") ||
    prohibitCheckText.includes("ineligible") ||
    prohibitCheckText.includes("forbidden") ||
    prohibitCheckText.includes("registry-prohibited") ||
    prohibitCheckText.includes("registrybanned");

  function makeStatus(
    type: RegistrationStatusType,
    color: string,
    dotColor: string,
  ) {
    return { type, label: isZh ? STATUS_LABELS[type].zh : STATUS_LABELS[type].en, color, dotColor };
  }

  if (isProhibited)
    return makeStatus("prohibited", "text-red-600 border-red-400/50 bg-red-50 dark:bg-red-950/20", "bg-red-500");

  // "reserved" should not be triggered by "registry-hold" (that is a hold, not a reserve)
  const isReserved =
    prohibitCheckText.includes("reserved") ||
    allStatusText.includes("reserved-delegated") ||
    allStatusText.includes("registryreserved") ||
    allStatusText.includes("registry-reserved");

  if (isReserved)
    return makeStatus("reserved", "text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/20", "bg-amber-500");

  const isRedemption =
    allStatusText.includes("redemptionperiod") ||
    allStatusText.includes("redemption period") ||
    allStatusText.includes("redemption-period");

  if (isRedemption)
    return makeStatus("redemption", "text-purple-600 border-purple-400/50 bg-purple-50 dark:bg-purple-950/20", "bg-purple-500");

  const isPendingDelete =
    allStatusText.includes("pendingdelete") ||
    allStatusText.includes("pending delete") ||
    allStatusText.includes("pending-delete");

  if (isPendingDelete)
    return makeStatus("pending-delete", "text-slate-600 border-slate-400/50 bg-slate-50 dark:bg-slate-950/20", "bg-slate-500");

  // Match both camelCase EPP codes ("serverhold") and hyphenated variants ("server-hold")
  const hasServerHold =
    allStatusText.includes("serverhold") ||
    allStatusText.includes("server-hold") ||
    allStatusText.includes("server hold") ||
    allStatusText.includes("registry-hold") ||
    allStatusText.includes("registryhold");

  const hasClientHold =
    allStatusText.includes("clienthold") ||
    allStatusText.includes("client-hold") ||
    allStatusText.includes("client hold");

  const hasOk =
    allStatusText.includes(" ok ") ||
    allStatusText === "ok" ||
    allStatusText.includes("active");

  const isHold = (hasServerHold || hasClientHold) && !hasOk;

  if (isHold)
    return makeStatus("hold", "text-orange-600 border-orange-400/50 bg-orange-50 dark:bg-orange-950/20", "bg-orange-500");

  const isDispute =
    allStatusText.includes("dispute") ||
    allStatusText.includes("udrp") ||
    allStatusText.includes("locked-udrp");

  if (isDispute)
    return makeStatus("dispute", "text-rose-600 border-rose-400/50 bg-rose-50 dark:bg-rose-950/20", "bg-rose-500");

  return {
    type: "registered" as RegistrationStatusType,
    label: isZh ? STATUS_LABELS.registered.zh : STATUS_LABELS.registered.en,
    color: "text-emerald-600 border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/20",
    dotColor: "bg-emerald-500",
  };
}

const STATUS_INFO: Record<
  RegistrationStatusType,
  {
    icon: React.ReactNode;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    border: string;
    bg: string;
    iconBg: string;
    iconText: string;
    titleText: string;
    descText: string;
  }
> = {
  prohibited: {
    icon: <RiForbidLine className="w-5 h-5" />,
    titleZh: "禁止注册域名",
    titleEn: "Prohibited Domain",
    descZh: "该域名被注册局标记为禁止注册字符串，无法通过任何常规渠道注册。通常为政策性保护词汇或敏感字符串。",
    descEn: "This domain is marked as a prohibited string by the registry and cannot be registered through any conventional channel.",
    border: "border-red-300/60 dark:border-red-800/50",
    bg: "bg-gradient-to-r from-red-50/80 to-red-50/30 dark:from-red-950/30 dark:to-transparent",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconText: "text-red-600 dark:text-red-400",
    titleText: "text-red-800 dark:text-red-300",
    descText: "text-red-700/80 dark:text-red-400/70",
  },
  reserved: {
    icon: <RiLockLine className="w-5 h-5" />,
    titleZh: "保留域名",
    titleEn: "Reserved Domain",
    descZh: "该域名为注册局保留域名，由官方机构专用或预留，暂不向公众开放注册。",
    descEn: "This domain is reserved by the registry for official use and is not available for public registration.",
    border: "border-amber-300/60 dark:border-amber-800/50",
    bg: "bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-600 dark:text-amber-400",
    titleText: "text-amber-800 dark:text-amber-300",
    descText: "text-amber-700/80 dark:text-amber-400/70",
  },
  hold: {
    icon: <RiPauseCircleLine className="w-5 h-5" />,
    titleZh: "域名暂停",
    titleEn: "Domain On Hold",
    descZh: "该域名当前处于暂停状态（Server Hold / Client Hold），可能由于违规行为、未付款或争议被暂时锁定，无法正常解析。",
    descEn: "This domain is currently on hold (Server Hold / Client Hold) and cannot resolve normally. This is usually due to a policy violation, non-payment, or dispute.",
    border: "border-orange-300/60 dark:border-orange-800/50",
    bg: "bg-gradient-to-r from-orange-50/80 to-orange-50/30 dark:from-orange-950/30 dark:to-transparent",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconText: "text-orange-600 dark:text-orange-400",
    titleText: "text-orange-800 dark:text-orange-300",
    descText: "text-orange-700/80 dark:text-orange-400/70",
  },
  dispute: {
    icon: <RiScalesLine className="w-5 h-5" />,
    titleZh: "域名争议",
    titleEn: "Domain Dispute",
    descZh: "该域名正处于 UDRP 争议程序或其他争议处理中，当前处于锁定状态，等待仲裁结果。",
    descEn: "This domain is currently undergoing a UDRP dispute or other legal proceedings and is locked pending arbitration.",
    border: "border-rose-300/60 dark:border-rose-800/50",
    bg: "bg-gradient-to-r from-rose-50/80 to-rose-50/30 dark:from-rose-950/30 dark:to-transparent",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconText: "text-rose-600 dark:text-rose-400",
    titleText: "text-rose-800 dark:text-rose-300",
    descText: "text-rose-700/80 dark:text-rose-400/70",
  },
  redemption: {
    icon: <RiLoopLeftLine className="w-5 h-5" />,
    titleZh: "赎回期",
    titleEn: "Redemption Period",
    descZh: "该域名已过期并进入赎回期，原注册人可在此期间支付额外费用赎回，赎回期结束后将被公开删除。",
    descEn: "This domain has expired and entered the redemption period. The original registrant can reclaim it for an extra fee before it is deleted.",
    border: "border-purple-300/60 dark:border-purple-800/50",
    bg: "bg-gradient-to-r from-purple-50/80 to-purple-50/30 dark:from-purple-950/30 dark:to-transparent",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconText: "text-purple-600 dark:text-purple-400",
    titleText: "text-purple-800 dark:text-purple-300",
    descText: "text-purple-700/80 dark:text-purple-400/70",
  },
  "pending-delete": {
    icon: <RiDeleteBin2Line className="w-5 h-5" />,
    titleZh: "待删除",
    titleEn: "Pending Delete",
    descZh: "该域名即将从注册系统中删除，删除后将重新开放注册。删除通常在 5 天内完成。",
    descEn: "This domain is about to be deleted from the registry and will soon become available for registration again.",
    border: "border-slate-300/60 dark:border-slate-700/50",
    bg: "bg-gradient-to-r from-slate-50/80 to-slate-50/30 dark:from-slate-950/30 dark:to-transparent",
    iconBg: "bg-slate-100 dark:bg-slate-800/60",
    iconText: "text-slate-600 dark:text-slate-400",
    titleText: "text-slate-700 dark:text-slate-300",
    descText: "text-slate-600/80 dark:text-slate-400/70",
  },
  available: {
    icon: <RiCheckLine className="w-5 h-5" />,
    titleZh: "域名可注册",
    titleEn: "Domain Available",
    descZh: "该域名当前未被注册，您可以立即前往域名注册商注册此域名。",
    descEn: "This domain is currently unregistered and available for purchase.",
    border: "border-emerald-300/60 dark:border-emerald-800/50",
    bg: "bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 dark:from-emerald-950/30 dark:to-transparent",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
    titleText: "text-emerald-800 dark:text-emerald-300",
    descText: "text-emerald-700/80 dark:text-emerald-400/70",
  },
  registered: {
    icon: null,
    titleZh: "",
    titleEn: "",
    descZh: "",
    descEn: "",
    border: "",
    bg: "",
    iconBg: "",
    iconText: "",
    titleText: "",
    descText: "",
  },
};

function DomainStatusInfoCard({
  type,
  locale,
}: {
  type: RegistrationStatusType;
  locale: string;
}) {
  if (type === "registered") return null;
  const info = STATUS_INFO[type];
  const isZh = locale.startsWith("zh");
  return (
    <div
      className={cn(
        "rounded-xl border p-4 mt-5",
        "flex items-start gap-3.5",
        info.border,
        info.bg,
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          info.iconBg,
          info.iconText,
        )}
      >
        {info.icon}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", info.titleText)}>
          {isZh ? info.titleZh : info.titleEn}
        </p>
        <p className={cn("text-xs mt-1 leading-relaxed", info.descText)}>
          {isZh ? info.descZh : info.descEn}
        </p>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#a855f7", "#14b8a6", "#facc15",
];

type ConfettiShape = "circle" | "rect" | "ribbon";

function ConfettiPieces() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const shape: ConfettiShape =
          i % 5 === 0 ? "ribbon" : i % 3 === 0 ? "circle" : "rect";
        const baseLeft = (i * 1.97 + (i % 7) * 5.3) % 100;
        return {
          id: i,
          left: `${baseLeft}%`,
          delay: (i * 0.06 + (i % 4) * 0.15) % 2.2,
          duration: 1.4 + (i * 0.07) % 1.4,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          width: shape === "ribbon" ? 3 : 5 + (i % 5) * 2,
          height: shape === "ribbon" ? 10 + (i % 4) * 3 : 5 + (i % 5) * 2,
          shape,
          rotateDir: i % 2 === 0 ? 540 : -540,
          xDrift: ((i % 9) - 4) * 12,
          repeatDelay: 0.3 + (i % 5) * 0.2,
        };
      }),
    [],
  );

  return (
    <div className="absolute inset-x-0 top-0 h-36 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: -16,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius:
              p.shape === "circle" ? "50%" : p.shape === "ribbon" ? 1 : 2,
            opacity: 0.9,
          }}
          animate={{
            y: [0, 140, 140],
            x: [0, p.xDrift, p.xDrift * 1.4],
            opacity: [0, 1, 0],
            rotate: [0, p.rotateDir],
            scaleX: p.shape === "ribbon" ? [1, 0.3, 1, 0.3] : 1,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: p.repeatDelay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

const REMINDER_THRESHOLDS = [60, 30, 10, 5, 1];

function DomainReminderDialog({
  domain,
  expirationDate,
  remainingDays,
  open,
  onOpenChange,
  isZh,
  userEmail,
  registerPriceFmt,
  renewPriceFmt,
  isPremium,
  eppStatuses,
}: {
  domain: string;
  expirationDate: string | null | undefined;
  remainingDays: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isZh: boolean;
  userEmail?: string;
  registerPriceFmt?: string;
  renewPriceFmt?: string;
  isPremium?: boolean;
  eppStatuses?: string[];
}) {
  const hasExpiry = !!(expirationDate && expirationDate !== "Unknown");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (open) { setEmail(userEmail || ""); setDone(false); }
  }, [open, userEmail]);

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      toast.error(isZh ? "请输入有效邮箱" : "Please enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/remind/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, email, expirationDate, phaseAlerts }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        toast.error(isZh ? "提交失败，请重试" : "Submission failed");
      }
    } catch {
      toast.error(isZh ? "网络错误" : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const lc = React.useMemo(
    () => computeLifecycle(domain, expirationDate ?? null, eppStatuses),
    [domain, expirationDate, eppStatuses]
  );
  const tldUpper = domain.split(".").pop()?.toUpperCase() ?? "";
  const hasPricing = !!(registerPriceFmt || renewPriceFmt);

  const PHASE_UI = {
    active:        { label: isZh ? "正常有效" : "Active",        colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50/70 dark:bg-emerald-950/25", borderClass: "border-emerald-200/60 dark:border-emerald-800/40", dotClass: "bg-emerald-500" },
    grace:         { label: isZh ? "宽限期"   : "Grace Period",  colorClass: "text-amber-600 dark:text-amber-400",    bgClass: "bg-amber-50/70 dark:bg-amber-950/25",    borderClass: "border-amber-200/60 dark:border-amber-800/40",    dotClass: "bg-amber-500" },
    redemption:    { label: isZh ? "赎回期"   : "Redemption",    colorClass: "text-orange-600 dark:text-orange-400",  bgClass: "bg-orange-50/70 dark:bg-orange-950/25",  borderClass: "border-orange-200/60 dark:border-orange-800/40",  dotClass: "bg-orange-500" },
    pendingDelete: { label: isZh ? "待删除"   : "Pending Delete", colorClass: "text-red-600 dark:text-red-400",        bgClass: "bg-red-50/70 dark:bg-red-950/25",        borderClass: "border-red-200/60 dark:border-red-800/40",        dotClass: "bg-red-500" },
    dropped:       { label: isZh ? "已释放"   : "Available",     colorClass: "text-sky-600 dark:text-sky-400",        bgClass: "bg-sky-50/70 dark:bg-sky-950/25",        borderClass: "border-sky-200/60 dark:border-sky-800/40",        dotClass: "bg-sky-400" },
  };

  const PHASE_ADVICE: Record<string, { zh: string; en: string }> = {
    active:        { zh: "域名状态正常，我们将在到期前自动发送提醒邮件。", en: "Domain is active. We'll alert you before expiry." },
    grace:         { zh: "域名已过期，仍处于宽限期内，可按正常价格续费，请尽快操作！", en: "Expired but renewable at normal price during grace — act now!" },
    redemption:    { zh: "已进入赎回期，续费费用大幅增加，请立即联系注册商赎回。", en: "In redemption. Recovery fees are much higher — contact your registrar." },
    pendingDelete: { zh: "即将被注册局删除，通常无法再续期，请提前做好准备。", en: "Pending deletion. Usually cannot be renewed anymore." },
    dropped:       { zh: "域名已被删除，即将或已可重新注册。", en: "Domain has been deleted and may be available for re-registration." },
  };

  const urgencyNum =
    remainingDays === null ? "text-muted-foreground" :
    remainingDays <= 0  ? "text-red-500 dark:text-red-400" :
    remainingDays <= 30 ? "text-orange-500 dark:text-orange-400" :
    remainingDays <= 90 ? "text-amber-500 dark:text-amber-400" :
    "text-emerald-500 dark:text-emerald-400";

  const phaseUI = lc ? PHASE_UI[lc.phase] : null;

  type PhaseAlerts = { grace: boolean; redemption: boolean; pendingDelete: boolean };
  const [phaseAlerts, setPhaseAlerts] = React.useState<PhaseAlerts>({
    grace: true, redemption: true, pendingDelete: true,
  });
  function togglePhase(key: keyof PhaseAlerts) {
    setPhaseAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  type PhaseChip = {
    key: keyof PhaseAlerts;
    label: string;
    icon: React.ReactNode;
    activeCls: string;
    inactiveCls: string;
  };
  const phaseChips: PhaseChip[] = lc ? [
    lc.cfg.grace > 0         && { key: "grace"      as const, label: isZh ? "进入宽限期"   : "Grace entered",    icon: <RiTimeLine className="w-2.5 h-2.5" />,          activeCls: "bg-amber-500/15 border-amber-400/40 text-amber-600 dark:text-amber-400",   inactiveCls: "bg-muted/20 border-border/30 text-muted-foreground/40 line-through" },
    lc.cfg.redemption > 0    && { key: "redemption" as const, label: isZh ? "进入赎回期"   : "Redemption",       icon: <RiExchangeDollarFill className="w-2.5 h-2.5" />, activeCls: "bg-orange-500/15 border-orange-400/40 text-orange-600 dark:text-orange-400", inactiveCls: "bg-muted/20 border-border/30 text-muted-foreground/40 line-through" },
    lc.cfg.pendingDelete > 0 && { key: "pendingDelete" as const, label: isZh ? "进入待删除期" : "Pending delete", icon: <RiDeleteBin2Line className="w-2.5 h-2.5" />,    activeCls: "bg-red-500/15 border-red-400/40 text-red-600 dark:text-red-400",          inactiveCls: "bg-muted/20 border-border/30 text-muted-foreground/40 line-through" },
  ].filter(Boolean) as PhaseChip[] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden gap-0">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0 mt-0.5">
              <RiTimerLine className="w-[18px] h-[18px] text-sky-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground leading-none">
                {isZh ? "域名监控订阅" : "Domain Monitoring"}
              </h2>
              <p className="text-[12px] text-sky-600 dark:text-sky-400 font-mono font-semibold mt-1 truncate">{domain}</p>
              {lc?.cfg.registry && (
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">{lc.cfg.registry}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pb-5 overflow-y-auto max-h-[72vh]">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Success ── */}
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="py-7 text-center space-y-4"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-sky-500/15 animate-ping" style={{ animationDuration: "1.6s" }} />
                  <div className="relative w-16 h-16 bg-sky-500/10 border-2 border-sky-400/30 rounded-full flex items-center justify-center">
                    <RiCheckLine className="w-7 h-7 text-sky-500" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-[15px] text-foreground">{isZh ? "订阅成功！" : "Subscribed!"}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isZh ? "将向" : "We'll notify"}{" "}
                    <strong className="text-foreground font-mono text-[11px]">{email}</strong>{" "}
                    {isZh ? "发送以下提醒" : "with the alerts below"}
                  </p>
                </div>
                <div className="text-left rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    {isZh ? "已订阅的提醒类型" : "Subscribed alerts"}
                  </p>
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 mb-1.5">{isZh ? "到期前提醒" : "Pre-expiry"}</p>
                    <div className="flex flex-wrap gap-1">
                      {REMINDER_THRESHOLDS.map((d) => (
                        <span key={d} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-400/20 text-sky-600 dark:text-sky-400 text-[10px] font-semibold">
                          <RiTimerLine className="w-2.5 h-2.5" />{isZh ? `提前${d}天` : `${d}d`}
                        </span>
                      ))}
                    </div>
                  </div>
                  {phaseChips.filter((c) => phaseAlerts[c.key]).length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 mb-1.5">{isZh ? "阶段提醒" : "Phase alerts"}</p>
                      <div className="flex flex-wrap gap-1">
                        {phaseChips.filter((c) => phaseAlerts[c.key]).map((chip) => (
                          <span key={chip.key} className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold", chip.activeCls)}>
                            <RiCheckboxCircleLine className="w-2.5 h-2.5" />{chip.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/55">{isZh ? "确认邮件已发送，请查收" : "Check your inbox for confirmation"}</p>
              </motion.div>

            ) : (
              /* ── Form ── */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 pt-4"
              >
                {/* ── Pricing + premium row ────────────────────────────── */}
                {hasPricing && (
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/50 bg-muted/15 overflow-hidden">
                    {/* Register price */}
                    <div className="flex flex-col items-center justify-center px-2 py-2.5 gap-0.5">
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                        {isZh ? "注册" : "Register"}
                      </p>
                      <p className={cn("text-[13px] font-black tabular-nums leading-none", isPremium ? "text-red-500 dark:text-red-400" : "text-foreground")}>
                        {registerPriceFmt ?? "—"}
                      </p>
                    </div>
                    {/* Renew price */}
                    <div className="flex flex-col items-center justify-center px-2 py-2.5 gap-0.5 border-x border-border/40">
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                        {isZh ? "续费" : "Renew"}
                      </p>
                      <p className="text-[13px] font-black tabular-nums leading-none text-foreground">
                        {renewPriceFmt ?? "—"}
                      </p>
                    </div>
                    {/* Premium badge */}
                    <div className={cn(
                      "flex flex-col items-center justify-center px-2 py-2.5 gap-0.5",
                      isPremium ? "bg-red-500/8 dark:bg-red-500/12" : ""
                    )}>
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                        {isZh ? "议价" : "Premium"}
                      </p>
                      <p className={cn(
                        "text-[12px] font-black leading-none",
                        isPremium
                          ? "text-red-500 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isPremium
                          ? (isZh ? "是" : "Yes")
                          : (isZh ? "否" : "No")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lifecycle card */}
                {hasExpiry && lc && phaseUI ? (
                  <div className={cn("rounded-xl border overflow-hidden", phaseUI.borderClass)}>
                    {/* Expiry row */}
                    <div className={cn("flex items-center justify-between px-3.5 py-3", phaseUI.bgClass)}>
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground/80 uppercase tracking-wider font-bold mb-1">
                          {isZh ? "过期日期" : "Expiry date"}
                        </p>
                        <p className="text-[12px] font-mono font-bold text-foreground leading-none">{fmtDate(lc.expiry)}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5 tabular-nums">
                          {`${String(lc.expiry.getUTCHours()).padStart(2,"0")}:${String(lc.expiry.getUTCMinutes()).padStart(2,"0")}:${String(lc.expiry.getUTCSeconds()).padStart(2,"0")} UTC`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        {remainingDays !== null && remainingDays >= 0 && remainingDays <= 7 ? (
                          <>
                            <p className={cn("text-[20px] font-black tabular-nums leading-none", urgencyNum)}>
                              {fmtCountdown(lc.expiry, isZh)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{isZh ? "后到期" : "remaining"}</p>
                          </>
                        ) : (
                          <>
                            <p className={cn("text-[30px] font-black tabular-nums leading-none", urgencyNum)}>
                              {remainingDays !== null ? Math.max(0, remainingDays) : "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{isZh ? "天后到期" : "days left"}</p>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Phase badge */}
                    <div className="px-3.5 py-2.5 bg-background/70 border-t border-border/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", phaseUI.dotClass)} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", phaseUI.colorClass)}>{phaseUI.label}</span>
                        {lc.phaseSource === "epp" && (
                          <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/20 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            <RiShieldCheckLine className="w-2.5 h-2.5" />
                            {isZh ? "EPP实时" : "EPP live"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {isZh ? PHASE_ADVICE[lc.phase]?.zh : PHASE_ADVICE[lc.phase]?.en}
                      </p>
                    </div>
                    {/* Timeline */}
                    <div className="px-3.5 py-2.5 border-t border-border/30 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          {isZh ? "生命周期时间表" : "Lifecycle timeline"}
                        </p>
                        {/* Confidence badge */}
                        <span className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wide border",
                          lc.cfg.confidence === "high"
                            ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-yellow-500/10 border-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                        )}>
                          {lc.cfg.confidence === "high"
                            ? (isZh ? "✓ 高可信度" : "✓ Verified")
                            : (isZh ? "~ 预估数据" : "~ Estimated")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {([
                          lc.cfg.grace > 0 &&
                            { key: "grace",   label: isZh ? "宽限期结束" : "Grace ends",      date: lc.graceEnd,      color: "text-amber-600 dark:text-amber-400",  dotColor: "bg-amber-400" },
                          lc.cfg.redemption > 0 &&
                            { key: "redemp",  label: isZh ? "赎回期结束" : "Redemption ends",  date: lc.redemptionEnd, color: "text-orange-600 dark:text-orange-400", dotColor: "bg-orange-400" },
                          (lc.cfg.pendingDelete > 0 || (lc.cfg.grace > 0 || lc.cfg.redemption > 0)) &&
                            { key: "drop",    label: isZh ? "预计删除"   : "Est. deletion",    date: lc.dropDate,      color: "text-red-600 dark:text-red-400",       dotColor: "bg-red-400" },
                        ] as (false | { key: string; label: string; date: Date; color: string; dotColor: string })[])
                          .filter(Boolean)
                          .map((row) => {
                            if (!row) return null;
                            const isPast = new Date() > row.date;
                            return (
                              <div key={row.key}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-0.5", isPast ? "bg-muted-foreground/30" : row.dotColor)} />
                                    <span className={cn("text-[10px]", isPast ? "line-through text-muted-foreground/40" : "text-muted-foreground")}>{row.label}</span>
                                  </div>
                                  <span className={cn("text-[10px] font-mono font-semibold tabular-nums text-right shrink-0", isPast ? "text-muted-foreground/40" : row.color)}>
                                    {fmtDateTime(row.date, false)}
                                  </span>
                                </div>
                                {!isPast && (
                                  <p className="text-[9px] text-muted-foreground/50 pl-3 mt-0.5 tabular-nums font-mono">
                                    UTC · {fmtCountdown(row.date, isZh)}{isZh ? "后" : " from now"}
                                  </p>
                                )}
                              </div>
                            );
                          })}

                        {/* 预期可注册时间 — shown only when domain will drop */}
                        {(lc.cfg.pendingDelete > 0 || lc.cfg.grace > 0 || lc.cfg.redemption > 0) && (() => {
                          const dropIsPast = new Date() > lc.dropDate;
                          return (
                            <div className={cn(
                              "rounded-lg border px-2.5 py-2 mt-1",
                              dropIsPast
                                ? "border-sky-400/40 bg-sky-500/10"
                                : "border-dashed border-border/50 bg-background/50"
                            )}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <RiShoppingCartLine className={cn("w-2.5 h-2.5 shrink-0", dropIsPast ? "text-sky-500" : "text-muted-foreground/40")} />
                                  <span className={cn("text-[10px] font-semibold", dropIsPast ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground/60")}>
                                    {isZh ? "预期可注册" : "Est. available"}
                                  </span>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-mono font-semibold tabular-nums text-right",
                                  dropIsPast ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground/50"
                                )}>
                                  {fmtDateTime(lc.dropDate, false)}
                                </span>
                              </div>
                              <p className={cn("text-[9px] pl-4 mt-0.5 leading-relaxed font-mono tabular-nums", dropIsPast ? "text-sky-500/70" : "text-muted-foreground/40")}>
                                {dropIsPast
                                  ? (isZh ? "UTC · 域名现已可注册" : "UTC · Domain may be available now")
                                  : `UTC · ${fmtCountdown(lc.dropDate, isZh)}${isZh ? "后可抢注" : " until drop"}`}
                              </p>
                            </div>
                          );
                        })()}

                        {lc.cfg.grace === 0 && lc.cfg.redemption === 0 && lc.cfg.pendingDelete === 0 && (
                          <p className="text-[10px] text-muted-foreground/60 italic">
                            {isZh
                              ? `.${tldUpper} 域名到期后通常立即删除，无宽限期`
                              : `.${tldUpper} domains are typically deleted immediately on expiry`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : !hasExpiry ? (
                  <div className="px-3 py-3 rounded-xl border border-border/50 bg-muted/20">
                    <p className="text-xs text-muted-foreground text-center">
                      {isZh ? "暂无到期日期，仍可订阅提醒" : "No expiry info yet, but you can still subscribe"}
                    </p>
                  </div>
                ) : null}

                {/* Reminder plan */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-3">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    {isZh ? "提醒计划" : "Reminder plan"}
                  </p>
                  {/* Pre-expiry day alerts */}
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 mb-1.5 flex items-center gap-1 font-medium">
                      <RiTimerLine className="w-3 h-3" />
                      {isZh ? "到期前提醒" : "Pre-expiry alerts"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REMINDER_THRESHOLDS.map((d) => (
                        <span key={d} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-400/20 text-sky-600 dark:text-sky-400 text-[11px] font-semibold">
                          {isZh ? `提前 ${d} 天` : `${d}d before`}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Phase event alerts */}
                  {phaseChips.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-muted-foreground/70 mb-1.5 flex items-center gap-1 font-medium">
                        <RiCalendarEventLine className="w-3 h-3" />
                        {isZh ? `阶段提醒（.${tldUpper}）` : `Phase alerts (.${tldUpper})`}
                        <span className="ml-auto text-[9px] text-muted-foreground/40 font-normal normal-case">
                          {isZh ? "点击选择" : "click to toggle"}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {phaseChips.map((chip) => {
                          const on = phaseAlerts[chip.key];
                          return (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => togglePhase(chip.key)}
                              className={cn(
                                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all cursor-pointer select-none",
                                on ? chip.activeCls : chip.inactiveCls
                              )}
                            >
                              {on
                                ? <RiCheckboxCircleLine className="w-2.5 h-2.5 shrink-0" />
                                : <RiCheckboxBlankCircleLine className="w-2.5 h-2.5 shrink-0" />}
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : lc ? (
                    <p className="text-[10px] text-muted-foreground/55 italic">
                      {isZh
                        ? `.${tldUpper} 注册局不设宽限期，仅发送到期前提醒`
                        : `.${tldUpper} has no grace/redemption — pre-expiry alerts only`}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground/50 border-t border-border/30 pt-2.5 leading-relaxed">
                    {isZh ? "续费后自动停止 · 可随时取消订阅" : "Auto-stops on renewal · Unsubscribe anytime"}
                  </p>
                </div>

                {/* Email input */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {isZh ? "接收邮箱" : "Email address"} <span className="text-red-500">*</span>
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="your@email.com"
                    className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-shadow font-mono"
                  />
                  {userEmail && email === userEmail && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <RiShieldCheckLine className="w-3 h-3 text-emerald-500" />
                      {isZh ? "已自动填入您的账户邮箱" : "Pre-filled from your account"}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gap-2 h-10 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white border-0 rounded-xl font-semibold text-sm shadow-sm shadow-sky-500/20 transition-all"
                >
                  {submitting
                    ? <><RiLoader4Line className="w-4 h-4 animate-spin" />{isZh ? "订阅中…" : "Subscribing…"}</>
                    : <><RiCalendarEventLine className="w-4 h-4" />{isZh ? "订阅域名监控" : "Subscribe"}</>
                  }
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarIcon({ faviconDomain, name }: { faviconDomain: string | null; name: string }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  return (
    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-muted/40 border border-border/30">
      {faviconDomain && !imgFailed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`}
          alt={name}
          className="w-6 h-6 object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold text-muted-foreground select-none">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function AvailableDomainCard({ domain, locale }: { domain: string; locale: string }) {
  const [rawPrices, setRawPrices] = React.useState<DomainPricing[]>([]);
  const [registrars, setRegistrars] = React.useState<DomainPricing[]>([]);
  const [loadingPrices, setLoadingPrices] = React.useState(true);
  const [eurRates, setEurRates] = React.useState<Record<string, number> | null>(null);
  const isZh = locale.startsWith("zh");

  React.useEffect(() => {
    const tld = domain.substring(domain.lastIndexOf(".") + 1).toLowerCase();
    fetch(`/api/pricing?tld=${encodeURIComponent(tld)}&type=new`)
      .then((r) => r.json())
      .then((data) => {
        const prices: DomainPricing[] = (data.price || [])
          .filter((r: any) => typeof r.new === "number")
          .map((r: any) => ({
            ...r,
            isPremium:
              typeof r.new === "number" &&
              r.new > 100 &&
              ["usd", "eur", "cad"].includes((r.currency || "").toLowerCase()),
            externalLink: `https://www.nazhumi.com/domain/${tld}/new`,
          }));
        setRawPrices(prices);
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, [domain]);

  React.useEffect(() => {
    fetch("https://api.frankfurter.app/latest")
      .then((r) => r.json())
      .then((data) => setEurRates(data.rates))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (rawPrices.length === 0) return;
    const toEur = (amount: number, currency: string) => {
      const cur = currency.toUpperCase();
      if (!eurRates) return amount;
      if (cur === "EUR") return amount;
      return amount / (eurRates[cur] ?? 1);
    };
    const sorted = [...rawPrices]
      .sort((a, b) => toEur(a.new as number, a.currency) - toEur(b.new as number, b.currency))
      .slice(0, 5);
    setRegistrars(sorted);
  }, [rawPrices, eurRates]);

  function formatPrice(amount: number, currency: string): string {
    const cur = currency.toUpperCase();
    if (isZh && eurRates) {
      const cnyRate = eurRates["CNY"] ?? 7.8;
      const eurAmount = cur === "EUR" ? amount : amount / (eurRates[cur] ?? 1);
      return `CNY ${(eurAmount * cnyRate).toFixed(2)}`;
    }
    if (eurRates) {
      if (cur === "USD") return `USD ${amount.toFixed(2)}`;
      const usdRate = eurRates["USD"] ?? 1.09;
      const eurAmount = cur === "EUR" ? amount : amount / (eurRates[cur] ?? 1);
      return `USD ${(eurAmount * usdRate).toFixed(2)}`;
    }
    return `USD ${amount.toFixed(2)}`;
  }

  const tldForDisplay = domain.substring(domain.lastIndexOf(".")).toLowerCase();
  const sldForDisplay = domain.substring(0, domain.lastIndexOf("."));
  const bestRegistrar = registrars[0] ?? null;

  return (
    <div className="glass-panel border border-emerald-300/50 dark:border-emerald-700/40 rounded-xl overflow-hidden">
      {/* Hero header */}
      <div className="relative pt-10 pb-8 px-6 sm:px-10 text-center bg-gradient-to-b from-emerald-50/60 via-emerald-50/20 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent">
        <ConfettiPieces />
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated ring + check */}
          <div className="relative mb-5">
            <motion.div
              className="w-20 h-20 rounded-full border-2 border-emerald-400/40 dark:border-emerald-500/30 absolute -inset-2"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="w-20 h-20 rounded-full border border-emerald-300/30 dark:border-emerald-600/20 absolute -inset-4"
              animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.08, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <RiCheckLine className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: "backOut" }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300/60 dark:border-emerald-600/40 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isZh ? "可注册" : "Available"}
            </span>
          </motion.div>

          {/* Domain name display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-3"
          >
            <div className="flex items-baseline justify-center flex-wrap gap-0">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground break-all">
                {sldForDisplay}
              </span>
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-emerald-500 dark:text-emerald-400">
                {tldForDisplay}
              </span>
            </div>
          </motion.div>

          <p className="text-sm text-muted-foreground max-w-sm">
            {isZh
              ? "该域名尚未被注册，抢先注册属于你的域名！"
              : "This domain is unregistered. Grab it before someone else does!"}
          </p>

          {/* Quick register CTA */}
          {!loadingPrices && bestRegistrar && (
            <motion.a
              href={bestRegistrar.registrarweb}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.35 }}
              className="mt-5 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-md shadow-emerald-500/25 transition-colors duration-150"
            >
              <RiShoppingCartLine className="w-4 h-4" />
              {isZh
                ? `立即注册 · ${formatPrice(bestRegistrar.new as number, bestRegistrar.currency)}/${isZh ? "首年" : "yr"}`
                : `Register Now · ${formatPrice(bestRegistrar.new as number, bestRegistrar.currency)}/yr`}
            </motion.a>
          )}
        </div>
      </div>

      {/* Pricing section */}
      <div className="border-t border-emerald-200/50 dark:border-emerald-700/30">
        <div className="px-4 sm:px-6 pt-4 pb-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <RiShoppingCartLine className="w-3.5 h-3.5" />
            {isZh ? "注册商价格对比" : "Registrar Price Comparison"}
          </p>
          {registrars.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50">
              {isZh ? "以官网为准" : "Reference only"}
            </span>
          )}
        </div>

        {loadingPrices ? (
          <div className="px-4 sm:px-6 pb-5 pt-3 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-lg bg-muted/50 animate-pulse shrink-0" />
                <div className="flex-1 h-3.5 rounded bg-muted/40 animate-pulse" />
                <div className="w-20 h-4 rounded bg-muted/40 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : registrars.length > 0 ? (
          <div className="pb-3">
            {registrars.map((r, idx) => {
              const faviconDomain = (() => {
                try { return new URL(r.registrarweb).hostname; } catch { return null; }
              })();
              return (
                <a
                  key={r.registrar}
                  href={r.registrarweb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 px-4 sm:px-6 py-3 transition-colors duration-150 group",
                    "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30",
                    idx === 0 && "bg-emerald-50/40 dark:bg-emerald-950/20",
                  )}
                >
                  <RegistrarIcon faviconDomain={faviconDomain} name={r.registrarname} />

                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground/30 w-4 text-right tabular-nums">
                      {idx + 1}
                    </span>
                    <p className={cn(
                      "text-sm truncate",
                      idx === 0 ? "font-semibold text-foreground" : "font-medium text-foreground/75",
                    )}>
                      {r.registrarname}
                    </p>
                    {idx === 0 && (
                      <span className="shrink-0 text-[9px] font-bold text-white bg-emerald-500 dark:bg-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {isZh ? "最低价" : "BEST"}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 text-right flex items-center gap-1.5">
                    <div className="flex items-baseline gap-0.5">
                      <span className={cn(
                        "font-bold tabular-nums",
                        idx === 0
                          ? "text-base text-emerald-600 dark:text-emerald-400"
                          : "text-sm text-foreground/75",
                      )}>
                        {typeof r.new === "number" ? formatPrice(r.new, r.currency) : "N/A"}
                      </span>
                      <span className="text-xs text-muted-foreground/50">
                        /{isZh ? "年" : "yr"}
                      </span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              );
            })}
            <p className="text-[10px] text-muted-foreground/35 px-4 sm:px-6 pt-2.5 pb-2">
              {isZh
                ? "数据来源：nazhumi.com & miqingju.com · 最低价优先 · 价格仅供参考"
                : "Source: nazhumi.com & miqingju.com · Sorted by lowest price · For reference only"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 text-center py-6">
            {isZh ? "暂无价格数据" : "No pricing data available for this TLD"}
          </p>
        )}
      </div>
    </div>
  );
}

function QueryingDots() {
  const [dots, setDots] = React.useState(".");
  React.useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-5 text-left">{dots}</span>;
}

function ResultSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 mt-6">
      <div className="text-center py-6 space-y-2">
        <span className="text-shimmer text-base font-semibold tracking-wide select-none">
          {t("loading_text")}
        </span>
        <p className="text-[13px] text-muted-foreground font-mono flex items-center justify-center gap-0.5 select-none">
          <span>{t("loading_querying")}</span>
          <QueryingDots />
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel border border-border rounded-xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
                <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-64 rounded-md bg-muted/70 animate-pulse" />
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded-md bg-muted/60 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
                  <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-16 rounded bg-muted/50 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel border border-border rounded-xl p-6">
            <div className="h-4 w-24 rounded bg-muted/70 animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel border border-border rounded-xl p-6">
            <div className="h-4 w-28 rounded bg-muted/70 animate-pulse mb-4" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-4 w-52 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="glass-panel border border-border rounded-xl p-6 h-64 flex flex-col gap-3">
            <div className="h-4 w-24 rounded bg-muted/70 animate-pulse" />
            <div className="flex-1 space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-muted/50 animate-pulse"
                  style={{ width: `${60 + Math.random() * 35}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LookupPage({
  data,
  target,
  displayTarget,
  origin,
}: {
  data: WhoisResult;
  target: string;
  displayTarget: string;
  origin: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [expandStatus, setExpandStatus] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const suppressNextLoad = React.useRef(false);

  useEffect(() => {
    const STATIC_PATHS = ["/", "/docs", "/tools", "/whois-servers", "/stamp", "/remind", "/api", "/login", "/register", "/dashboard"];
    const isSearchRoute = (url: string) => {
      const clean = url.split("?")[0].replace(/^\/(en|zh|zh-tw|de|ru|ja|fr|ko)(\/|$)/, "/");
      return !STATIC_PATHS.some((p) => clean === p || clean.startsWith(p + "/"));
    };
    const handleStart = (url: string) => {
      if (suppressNextLoad.current) {
        suppressNextLoad.current = false;
        return;
      }
      if (isSearchRoute(url)) setLoading(true);
    };
    const handleComplete = () => setLoading(false);
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);
  const [showImagePreview, setShowImagePreview] = React.useState(false);
  const [imgWidth, setImgWidth] = React.useState(1200);
  const [imgHeight, setImgHeight] = React.useState(630);
  const [imgTheme, setImgTheme] = React.useState<"light" | "dark">("light");
  const [imgActing, setImgActing] = React.useState<"download" | "copy" | null>(null);
  const copy = useClipboard();
  const save = useSaver();
  useSearchHotkeys({});

  useEffect(() => {
    setImgTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  const isChinese = locale === "zh" || locale === "zh-tw";
  const isZh = isChinese;

  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false);

  const [verifiedStamps, setVerifiedStamps] = React.useState<
    { id: string; tagName: string; tagStyle: string; link: string; nickname: string }[]
  >([]);

  const STAMP_STYLE_MAP: Record<string, string> = {
    personal: "bg-violet-50 border border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-700/60 dark:text-violet-300",
    default: "bg-violet-50 border border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-700/60 dark:text-violet-300",
    official: "bg-blue-500 text-white border-0",
    brand: "bg-violet-500 text-white border-0",
    verified: "bg-emerald-500 text-white border-0",
    partner: "bg-orange-500 text-white border-0",
    dev: "bg-sky-500 text-white border-0",
    warning: "bg-amber-400 text-white border-0",
    premium: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0",
  };

  useEffect(() => {
    const domainKey = data.result?.domain || target;
    if (!domainKey) return;
    fetch(`/api/stamp/check?domain=${encodeURIComponent(domainKey)}`)
      .then((r) => r.json())
      .then((d) => setVerifiedStamps(d.stamps || []))
      .catch(() => {});
  }, [data.result?.domain, target]);

  const FALLBACK_EUR_RATES: Record<string, number> = {
    AUD: 1.65, CAD: 1.49, CHF: 0.94, CNY: 7.82, DKK: 7.46,
    GBP: 0.85, HKD: 8.50, JPY: 162, KRW: 1520, NOK: 11.7,
    NZD: 1.80, SEK: 11.3, SGD: 1.46, TWD: 34.8, USD: 1.09,
  };
  const [eurRates, setEurRates] = React.useState<Record<string, number>>(FALLBACK_EUR_RATES);
  useEffect(() => {
    if (!isChinese) return;
    fetch("https://api.frankfurter.app/latest")
      .then((r) => r.json())
      .then((d) => { if (d?.rates) setEurRates(d.rates); })
      .catch(() => {});
  }, [isChinese]);

  function toCNY(amount: number, currency: string): string {
    const cur = currency.toUpperCase();
    const cnyRate = eurRates["CNY"] ?? 7.82;
    const eurAmount = cur === "EUR" ? amount : amount / (eurRates[cur] ?? 1);
    return `¥${(eurAmount * cnyRate).toFixed(2)}`;
  }

  function toUSD(amount: number, currency: string): string {
    const cur = currency.toUpperCase();
    if (cur === "USD") return `$${amount.toFixed(2)}`;
    const usdRate = eurRates["USD"] ?? 1.09;
    const eurAmount = cur === "EUR" ? amount : amount / (eurRates[cur] ?? 1);
    return `$${(eurAmount * usdRate).toFixed(2)}`;
  }

  const current = getWindowHref();
  const queryType = detectQueryType(target);
  const { status, result, error, time, dnsProbe, registryUrl } = data as typeof data & { registryUrl?: string };

  const { data: session } = useSession();

  const handleSearch = (query: string) => {
    router.push(toSearchURI(query));
  };

  useEffect(() => {
    if (status) {
      // Determine registration status from available signals
      const regStatus =
        status && result ? "registered" :
        dnsProbe?.registrationStatus === "unregistered" ? "unregistered" :
        dnsProbe?.registrationStatus === "registered" ? "registered" :
        !status ? "error" : "unknown";

      addHistory(target, regStatus as any);

      if (session?.user) {
        fetch("/api/user/search-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: target, queryType, regStatus }),
        }).catch(() => {});
      }
    }
  }, [session]);

  const registrarIcon = result
    ? getRegistrarIcon(result.registrar, result.registrarURL)
    : null;
  const registrarInitial = result
    ? result.registrar && result.registrar !== "Unknown"
      ? result.registrar.charAt(0).toUpperCase()
      : "?"
    : "?";

  const displayStatuses = useMemo(() => {
    if (!result || result.status.length === 0) return [];
    if (result.status.length > 5 && !expandStatus)
      return result.status.slice(0, 5);
    return result.status;
  }, [result, expandStatus]);

  const hasIpFields =
    result &&
    ((result.cidr && result.cidr !== "Unknown") ||
      (result.netRange && result.netRange !== "Unknown") ||
      (result.netName && result.netName !== "Unknown") ||
      (result.netType && result.netType !== "Unknown") ||
      (result.originAS && result.originAS !== "Unknown") ||
      (result.inetNum && result.inetNum !== "Unknown") ||
      (result.inet6Num && result.inet6Num !== "Unknown"));

  const INVALID_FIELD_VALUES = new Set([
    "unknown", "n/a", "na", "none", "null", "undefined", "-", "--",
  ]);
  const isValidField = (v: string | null | undefined): boolean => {
    if (!v || !v.trim()) return false;
    return !INVALID_FIELD_VALUES.has(v.trim().toLowerCase());
  };

  const hasRegistrant =
    result &&
    (isValidField(result.registrantOrganization) ||
      isValidField(result.registrantCountry) ||
      isValidField(result.registrantProvince) ||
      isValidField(result.registrantEmail) ||
      isValidField(result.registrantPhone));

  return (
    <>
      <Head>
        <title key="site-title">{`${displayTarget} - WHOIS Lookup`}</title>
        <meta
          key="og:title"
          property="og:title"
          content={`${displayTarget} - WHOIS Lookup`}
        />
        <meta
          key="og:image"
          property="og:image"
          content={`${origin}/api/og?query=${encodeURIComponent(target)}&theme=dark`}
        />
        <meta
          key="twitter:title"
          name="twitter:title"
          content={`${displayTarget} - WHOIS Lookup`}
        />
        <meta
          key="twitter:image"
          name="twitter:image"
          content={`${origin}/api/og?query=${encodeURIComponent(target)}&theme=dark`}
        />
      </Head>
      <ScrollArea className="w-full h-[calc(100vh-4rem)]">
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 min-h-[calc(100vh-4rem)]">
          <div className="mb-6">
            <div className="relative group">
              <SearchBox
                initialValue={target}
                onSearch={handleSearch}
                loading={loading}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                <KeyboardShortcut k="/" />
              </div>
            </div>
            <SearchHotkeysText className="hidden sm:flex mt-2 px-1 justify-end" />
          </div>

          {loading && <ResultSkeleton />}

          {!loading && result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="flex items-center flex-wrap gap-2 mb-4 sm:mb-6"
            >
              {result.registerPrice &&
                result.registerPrice.new !== -1 &&
                result.registerPrice.currency !== "Unknown" && (
                  <Link
                    target="_blank"
                    href={result.registerPrice.externalLink}
                    className="hidden sm:flex px-2 py-0.5 rounded-md border bg-background items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <RiBillLine className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span
                      className={cn(
                        "text-[11px] sm:text-xs font-normal text-muted-foreground",
                        result.registerPrice.isPremium && "text-red-500",
                      )}
                    >
                      {t("register_price")}
                      {isChinese
                        ? toCNY(result.registerPrice.new as number, result.registerPrice.currency)
                        : toUSD(result.registerPrice.new as number, result.registerPrice.currency)}
                    </span>
                  </Link>
                )}
              {result.renewPrice &&
                result.renewPrice.renew !== -1 &&
                result.renewPrice.currency !== "Unknown" && (
                  <Link
                    href={result.renewPrice.externalLink}
                    target="_blank"
                    className="hidden sm:flex px-2 py-0.5 rounded-md border bg-background items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <RiExchangeDollarFill className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] sm:text-xs font-normal text-muted-foreground">
                      {t("renew_price")}
                      {isChinese
                        ? toCNY(result.renewPrice.renew as number, result.renewPrice.currency)
                        : toUSD(result.renewPrice.renew as number, result.renewPrice.currency)}
                    </span>
                  </Link>
                )}
              {result.transferPrice &&
                result.transferPrice.transfer !== -1 &&
                result.transferPrice.currency !== "Unknown" && (
                  <Link
                    href={result.transferPrice.externalLink}
                    target="_blank"
                    className="hidden sm:flex px-2 py-0.5 rounded-md border bg-background items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <RiExchangeDollarFill className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] sm:text-xs font-normal text-muted-foreground">
                      {t("transfer_price")}
                      {isChinese
                        ? toCNY(result.transferPrice.transfer as number, result.transferPrice.currency)
                        : toUSD(result.transferPrice.transfer as number, result.transferPrice.currency)}
                    </span>
                  </Link>
                )}
              <div className="flex-grow" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="transition hover:border-muted-foreground shadow-sm"
                    tapEnabled
                  >
                    <RiShareLine className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("share")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Whois Lookup: ${target}`)}&url=${encodeURIComponent(current)}`}
                      target="_blank"
                    >
                      <RiTwitterXLine className="w-4 h-4 mr-2" />
                      Twitter / X
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(current)}`}
                      target="_blank"
                    >
                      <RiFacebookFill className="w-4 h-4 mr-2" />
                      Facebook
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`https://reddit.com/submit?url=${encodeURIComponent(current)}`}
                      target="_blank"
                    >
                      <RiRedditLine className="w-4 h-4 mr-2" />
                      Reddit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(current)}`}
                      target="_blank"
                    >
                      <RiWhatsappLine className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`https://t.me/share/url?url=${encodeURIComponent(current)}`}
                      target="_blank"
                    >
                      <RiTelegramLine className="w-4 h-4 mr-2" />
                      Telegram
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => copy(current)}>
                    <RiLinkM className="w-4 h-4 mr-2" />
                    {t("copy_url")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("image")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={async () => {
                      const ogUrl = buildOgUrl(target, result);
                      const tid = toast.loading(isZh ? "正在生成图片…" : "Generating image…");
                      try {
                        const res = await fetch(ogUrl);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `whois-${target}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(t("toast.downloaded"), { id: tid });
                      } catch {
                        toast.error(t("toast.download_failed"), { id: tid });
                      }
                    }}
                  >
                    <RiDownloadLine className="w-4 h-4 mr-2" />
                    {t("download_png")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const ogUrl = buildOgUrl(target, result);
                      const tid = toast.loading(isZh ? "正在生成图片…" : "Generating image…");
                      try {
                        const res = await fetch(ogUrl);
                        const blob = await res.blob();
                        await navigator.clipboard.write([
                          new ClipboardItem({ "image/png": blob }),
                        ]);
                        toast.success(t("toast.copied_to_clipboard"), { id: tid });
                      } catch {
                        toast.error(t("toast.copy_to_clipboard_failed"), { id: tid });
                      }
                    }}
                  >
                    <RiFileCopyLine className="w-4 h-4 mr-2" />
                    {t("copy_image")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImagePreview(true)}>
                    <RiCameraLine className="w-4 h-4 mr-2" />
                    {t("preview_customize")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}

          {!loading && !status && (() => {
            const hasErrorRaw = !!(result && (result.rawWhoisContent || result.rawRdapContent));
            return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className={cn(hasErrorRaw ? "lg:col-span-8" : "lg:col-span-12", "space-y-6")}>
                {error === "INVALID_DOMAIN_TLD" ? (
                  <div className="glass-panel border border-amber-300/50 dark:border-amber-700/40 rounded-xl p-8 sm:p-12 text-center">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center mx-auto mb-5">
                      <RiErrorWarningLine className="w-8 h-8 text-amber-500" />
                    </div>
                    <Badge variant="outline" className="mb-4 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600 border-amber-400/50">
                      INVALID TLD
                    </Badge>
                    <h2 className="text-2xl font-bold mb-2">
                      {isChinese ? `".${target.split(".").pop()}" 不是真实的域名后缀` : `".${target.split(".").pop()}" isn't a real TLD`}
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed mb-2">
                      {isChinese
                        ? `我们查遍了 ICANN 的所有顶级域名列表，没找到 `
                        : `We searched the entire ICANN TLD registry and couldn't find `}
                      <span className="font-mono font-semibold text-foreground">{`.${target.split(".").pop()}`}</span>
                      {isChinese ? `。请检查拼写，常见的有 .com .net .org .io .cn` : `. Check for typos — try .com .net .org .io`}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mb-8">
                      {isChinese ? "WHOIS 查询不支持不存在的后缀，这不是 bug，是常识。" : "WHOIS doesn't work for non-existent TLDs. Not a bug — just how the internet works."}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href="/">
                        <Button className="gap-2">
                          <RiSearchLine className="w-4 h-4" />
                          {isChinese ? "重新搜索" : "Search Again"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : dnsProbe?.registrationStatus === "registered" ? (
                  <>
                    <div className="glass-panel border border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl p-6 sm:p-8 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase tracking-wider font-mono"
                            >
                              {queryType}
                            </Badge>
                          </div>
                          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1 uppercase">
                            {displayTarget}
                          </h2>
                          <p className="text-muted-foreground text-sm mt-2 max-w-sm leading-relaxed">
                            {t("registered_no_whois_desc")}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30 font-medium"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                            {t("registered_no_whois")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {time.toFixed(2)}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" size="sm" onClick={() => handleSearch(target)}>
                        {t("re_query")}
                      </Button>
                      {registryUrl && (
                        <a href={registryUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            {t("registry_lookup")}
                          </Button>
                        </a>
                      )}
                      <Link href="/">
                        <Button variant="outline" size="sm">{t("new_search")}</Button>
                      </Link>
                    </div>
                  </>
                ) : dnsProbe?.registrationStatus === "unregistered" ? (
                  <AvailableDomainCard domain={target} locale={locale} />
                ) : (
                  <>
                    <div className="glass-panel border border-border rounded-xl p-8 sm:p-12 text-center">
                      <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-500"
                        >
                          <path d="m21 21-4.3-4.3" />
                          <circle cx="11" cy="11" r="8" />
                          <path d="m8 8 6 6" />
                          <path d="m14 8-6 6" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">
                        {t("lookup_failed")}
                      </h2>
                      <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed mb-8">
                        {t("lookup_failed_description")}{" "}
                        <span className="font-mono font-medium text-foreground">
                          {target}
                        </span>
                        {". "}
                        {error || t("lookup_failed_fallback")}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                        <Button onClick={() => handleSearch(target)}>
                          {t("try_again")}
                        </Button>
                        {registryUrl && (
                          <a href={registryUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              {isChinese ? "在注册局查询" : "Look up at Registry"}
                            </Button>
                          </a>
                        )}
                        <Link href="/">
                          <Button variant="outline">{t("new_search")}</Button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {dnsProbe?.registrationStatus !== "registered" &&
                dnsProbe?.registrationStatus !== "unregistered" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="glass-panel border border-border rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      {t("common_issues")}
                    </h3>
                    <ul className="space-y-3">
                      {[
                        {
                          title: t("issue_invalid_tld"),
                          desc: t("issue_invalid_tld_desc"),
                        },
                        {
                          title: t("issue_not_registered"),
                          desc: t("issue_not_registered_desc"),
                        },
                        {
                          title: t("issue_rate_limited"),
                          desc: t("issue_rate_limited_desc"),
                        },
                      ].map((item) => (
                        <li key={item.title} className="flex items-start gap-2">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            <strong className="text-foreground">
                              {item.title}:
                            </strong>{" "}
                            {item.desc}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass-panel border border-border rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <RiTimeLine className="w-4 h-4" />
                      {t("query_details")}
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-mono uppercase">
                          {t("target")}
                        </span>
                        <span className="font-mono font-medium">{target}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-mono uppercase">
                          {t("type")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono"
                        >
                          {queryType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-mono uppercase">
                          {t("time")}
                        </span>
                        <span className="font-mono">{time.toFixed(2)}s</span>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {hasErrorRaw && (
                <div className="lg:col-span-4">
                  <ResponsePanel
                    whoisContent={result!.rawWhoisContent || ""}
                    rdapContent={result!.rawRdapContent}
                    target={target}
                    copy={copy}
                    save={save}
                  />
                </div>
              )}
            </motion.div>
            );
          })()}

          {!loading && status && result && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {" "}
                <div className="lg:col-span-8 space-y-6">
                  <div className="glass-panel border border-border rounded-xl p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-3 right-2 opacity-60 pointer-events-none select-none">
                      <CssGlobe />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold uppercase tracking-wider font-mono"
                        >
                          {queryType}
                        </Badge>
                        <button
                          onClick={() => {
                            if (!session) {
                              toast.info(isChinese ? "请先登录再认领品牌" : "Please log in to claim a brand stamp");
                              router.push(`/login?callbackUrl=${encodeURIComponent(`/stamp?domain=${encodeURIComponent(result.domain || target)}`)}`);
                              return;
                            }
                            suppressNextLoad.current = true;
                            router.push(`/stamp?domain=${encodeURIComponent(result.domain || target)}`);
                          }}
                          title={isChinese ? "品牌认领" : "Claim"}
                          className="sm:hidden flex items-center justify-center w-6 h-6 rounded-full text-xs border transition-all active:scale-[0.93] bg-muted/50 border-border/50 text-muted-foreground hover:border-violet-400/50 hover:text-violet-500"
                        >
                          <RiShieldCheckLine className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (!session) {
                              toast.info(isChinese ? "请先登录再订阅域名提醒" : "Please log in to subscribe for reminders");
                              router.push(`/login`);
                              return;
                            }
                            setReminderDialogOpen(true);
                          }}
                          title={isChinese ? "域名订阅" : "Subscribe"}
                          className={cn(
                            "sm:hidden flex items-center justify-center w-6 h-6 rounded-full text-xs border transition-all active:scale-[0.93]",
                            (result.remainingDays !== null && result.remainingDays <= 30)
                              ? "bg-red-100 dark:bg-red-900/30 border-red-400/60 text-red-500"
                              : "bg-muted/50 border-border/50 text-muted-foreground hover:border-sky-400/50 hover:text-sky-500",
                          )}
                        >
                          <RiTimerLine className="w-3 h-3" />
                        </button>
                      </div>
                      <h2
                        className="text-3xl sm:text-4xl font-bold tracking-tight mb-1 cursor-pointer hover:opacity-80 transition-opacity uppercase"
                        onClick={() => copy(result.domain || target)}
                      >
                        {result.domain || displayTarget}
                      </h2>
                      {result.domainPunycode && (
                        <p
                          className="text-xs text-muted-foreground font-mono mb-3 cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={() => copy(result.domainPunycode!)}
                        >
                          {result.domainPunycode}
                        </p>
                      )}
                      {!result.domainPunycode && <div className="mb-3" />}
                      <div className="flex items-center gap-2 flex-wrap">
                        {result.remainingDays !== null ? (
                          result.remainingDays <= 0 ? (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white border-0">
                              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse mr-1.5" />
                              {t("expired")}
                            </Badge>
                          ) : result.remainingDays <= 60 ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse mr-1.5" />
                              {t("expiring_soon")}
                            </Badge>
                          ) : (
                            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                              {t("active")}
                            </Badge>
                          )
                        ) : (
                          (() => {
                            const regStatus = getDomainRegistrationStatus(result, locale);
                            return (
                              <Badge
                                variant="outline"
                                className={cn("font-medium", regStatus.color)}
                              >
                                <div className={cn("w-2 h-2 rounded-full mr-1.5", regStatus.dotColor)} />
                                {regStatus.label}
                              </Badge>
                            );
                          })()
                        )}
                        {result.domainAge !== null && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5">
                            <RiTimeLine className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-[11px] font-normal text-primary">
                              {result.domainAge === 0 ? "<1" : result.domainAge}{" "}
                              {result.domainAge === 1 ? t("year") : t("years")}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {/* Mobile-only price tags (moved from above on mobile) */}
                        {result.registerPrice &&
                          result.registerPrice.new !== -1 &&
                          result.registerPrice.currency !== "Unknown" && (
                            <Link
                              target="_blank"
                              href={result.registerPrice.externalLink}
                              className="sm:hidden px-2 py-0.5 rounded-md border bg-background flex items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                            >
                              <RiBillLine className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className={cn("text-[11px] font-normal text-muted-foreground", result.registerPrice.isPremium && "text-red-500")}>
                                {t("register_price")}
                                {isChinese
                                  ? toCNY(result.registerPrice.new as number, result.registerPrice.currency)
                                  : toUSD(result.registerPrice.new as number, result.registerPrice.currency)}
                              </span>
                            </Link>
                          )}
                        {result.renewPrice &&
                          result.renewPrice.renew !== -1 &&
                          result.renewPrice.currency !== "Unknown" && (
                            <Link
                              href={result.renewPrice.externalLink}
                              target="_blank"
                              className="sm:hidden px-2 py-0.5 rounded-md border bg-background flex items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                            >
                              <RiExchangeDollarFill className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {t("renew_price")}
                                {isChinese
                                  ? toCNY(result.renewPrice.renew as number, result.renewPrice.currency)
                                  : toUSD(result.renewPrice.renew as number, result.renewPrice.currency)}
                              </span>
                            </Link>
                          )}
                        {result.transferPrice &&
                          result.transferPrice.transfer !== -1 &&
                          result.transferPrice.currency !== "Unknown" && (
                            <Link
                              href={result.transferPrice.externalLink}
                              target="_blank"
                              className="sm:hidden px-2 py-0.5 rounded-md border bg-background flex items-center space-x-1 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                            >
                              <RiExchangeDollarFill className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {t("transfer_price")}
                                {isChinese
                                  ? toCNY(result.transferPrice.transfer as number, result.transferPrice.currency)
                                  : toUSD(result.transferPrice.transfer as number, result.transferPrice.currency)}
                              </span>
                            </Link>
                          )}
                        {/* Desktop-only Claim/Subscribe text buttons */}
                        <button
                          onClick={() => {
                            if (!session) {
                              toast.info(isChinese ? "请先登录再认领品牌" : "Please log in to claim a brand stamp");
                              router.push(`/login?callbackUrl=${encodeURIComponent(`/stamp?domain=${encodeURIComponent(result.domain || target)}`)}`);
                              return;
                            }
                            suppressNextLoad.current = true;
                            router.push(`/stamp?domain=${encodeURIComponent(result.domain || target)}`);
                          }}
                          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.93] bg-muted/50 border-border/50 text-muted-foreground hover:border-violet-400/50 hover:text-violet-500"
                        >
                          <RiShieldCheckLine className="w-3 h-3" />
                          {isChinese ? "品牌认领" : "Claim"}
                        </button>
                        <button
                          onClick={() => {
                            if (!session) {
                              toast.info(isChinese ? "请先登录再订阅域名提醒" : "Please log in to subscribe for reminders");
                              router.push(`/login`);
                              return;
                            }
                            setReminderDialogOpen(true);
                          }}
                          className={cn(
                            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.93]",
                            (result.remainingDays !== null && result.remainingDays <= 30)
                              ? "bg-red-100 dark:bg-red-900/30 border-red-400/60 text-red-500"
                              : "bg-muted/50 border-border/50 text-muted-foreground hover:border-sky-400/50 hover:text-sky-500",
                          )}
                        >
                          <RiTimerLine className="w-3 h-3" />
                          {isChinese ? "域名订阅" : "Subscribe"}
                        </button>
                        {verifiedStamps.map((stamp) => (
                          stamp.link ? (
                            <a
                              key={stamp.id}
                              href={stamp.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80",
                                STAMP_STYLE_MAP[stamp.tagStyle] || STAMP_STYLE_MAP.default,
                              )}
                            >
                              <RiShieldCheckLine className="w-3 h-3" />
                              {stamp.tagName}
                            </a>
                          ) : (
                            <span
                              key={stamp.id}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                                STAMP_STYLE_MAP[stamp.tagStyle] || STAMP_STYLE_MAP.default,
                              )}
                            >
                              <RiShieldCheckLine className="w-3 h-3" />
                              {stamp.tagName}
                            </span>
                          )
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {time.toFixed(2)}s{data.cached && ` · ${t("cached")}`}
                          {data.source && ` · ${data.source}`}
                        </span>
                        <button
                          onClick={() => setFeedbackOpen(true)}
                          title={t("feedback.issue_title")}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-transparent hover:border-amber-300/50 transition-all"
                        >
                          <RiFlagLine className="w-3 h-3" />
                          {t("feedback.title")}
                        </button>
                      </div>
                    </div>

                    <FeedbackDrawer
                      open={feedbackOpen}
                      onOpenChange={setFeedbackOpen}
                      query={result.domain || target}
                      queryType={queryType}
                    />

                    <DomainReminderDialog
                      domain={result.domain || target}
                      expirationDate={result.expirationDate}
                      remainingDays={result.remainingDays}
                      open={reminderDialogOpen}
                      onOpenChange={setReminderDialogOpen}
                      isZh={isChinese}
                      userEmail={session?.user?.email ?? ""}
                      registerPriceFmt={
                        result.registerPrice && result.registerPrice.new !== -1 && result.registerPrice.currency !== "Unknown"
                          ? isChinese
                            ? toCNY(result.registerPrice.new as number, result.registerPrice.currency)
                            : toUSD(result.registerPrice.new as number, result.registerPrice.currency)
                          : undefined
                      }
                      renewPriceFmt={
                        result.renewPrice && result.renewPrice.renew !== -1 && result.renewPrice.currency !== "Unknown"
                          ? isChinese
                            ? toCNY(result.renewPrice.renew as number, result.renewPrice.currency)
                            : toUSD(result.renewPrice.renew as number, result.renewPrice.currency)
                          : undefined
                      }
                      isPremium={result.registerPrice?.isPremium ?? false}
                      eppStatuses={result.status?.map((s) => s.status) ?? []}
                    />

                    {result.remainingDays === null &&
                      (() => {
                        const regStatus = getDomainRegistrationStatus(result, locale);
                        return regStatus.type !== "registered" ? (
                          <DomainStatusInfoCard type={regStatus.type} locale={locale} />
                        ) : null;
                      })()}

                    {(result.creationDate !== "Unknown" ||
                      result.expirationDate !== "Unknown" ||
                      result.updatedDate !== "Unknown") && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
                        {result.creationDate &&
                          result.creationDate !== "Unknown" && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                {t("whois_fields.creation_date")}
                              </p>
                              <p className="font-mono text-sm font-medium">
                                {formatDate(result.creationDate)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {getRelativeTime(result.creationDate, t)}
                              </p>
                            </div>
                          )}
                        {result.expirationDate &&
                          result.expirationDate !== "Unknown" && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                {t("whois_fields.expiration_date")}
                              </p>
                              <p className="font-mono text-sm font-medium">
                                {formatDate(result.expirationDate)}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] mt-0.5 font-medium",
                                  result.remainingDays !== null &&
                                    result.remainingDays > 60
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : result.remainingDays !== null &&
                                        result.remainingDays <= 30
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-amber-600 dark:text-amber-400",
                                )}
                              >
                                {result.remainingDays !== null
                                  ? result.remainingDays > 0
                                    ? t("d_remaining", {
                                        days: result.remainingDays,
                                      })
                                    : t("expired")
                                  : getRelativeTime(result.expirationDate, t)}
                              </p>
                            </div>
                          )}
                        {result.updatedDate &&
                          result.updatedDate !== "Unknown" && (
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                {t("whois_fields.updated_date")}
                              </p>
                              <p className="font-mono text-sm font-medium">
                                {formatDate(result.updatedDate)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {getRelativeTime(result.updatedDate, t)}
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {hasRegistrant && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
                        {[
                          {
                            label: t("whois_fields.registrant_organization"),
                            value: result.registrantOrganization,
                          },
                          {
                            label: t("whois_fields.registrant_country"),
                            value: result.registrantCountry,
                            country: true,
                          },
                          {
                            label: t("whois_fields.registrant_province"),
                            value: result.registrantProvince,
                          },
                          {
                            label: t("whois_fields.registrant_email"),
                            value: result.registrantEmail,
                          },
                          {
                            label: t("whois_fields.registrant_phone"),
                            value: result.registrantPhone,
                          },
                        ]
                          .filter((f) => isValidField(f.value))
                          .map((f, i) => (
                            <div key={i} className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                {f.label}
                              </p>
                              <p className="text-xs font-mono whitespace-pre-wrap break-all flex items-center gap-1.5">
                                {"country" in f &&
                                  f.country &&
                                  f.value &&
                                  /^[A-Z]{2}$/i.test(f.value.trim()) && (
                                    <img
                                      src={`https://flagcdn.com/w40/${f.value.trim().toLowerCase()}.png`}
                                      alt=""
                                      className="w-4 h-3 object-cover rounded-[2px]"
                                    />
                                  )}
                                {f.value}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {result.status.length > 0 && (
                      <div className="glass-panel border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-muted-foreground"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          {t("whois_fields.status")}
                        </h3>
                        <div className="space-y-2.5">
                          {displayStatuses.map((s, i) => {
                            const info = getEppStatusInfo(s.status);
                            const color = getEppStatusColor(s.status);
                            const displayName = getEppStatusDisplayName(
                              s.status,
                            );
                            const link = getEppStatusLink(s.status);
                            return (
                              <div key={i} className="flex items-start gap-2.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-[0.65rem]"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="min-w-0">
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono font-medium leading-tight hover:underline"
                                  >
                                    {displayName}
                                  </a>
                                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                    {info
                                      ? getEppStatusDescription(s.status, locale)
                                      : locale === "zh" || locale === "zh-tw"
                                        ? "注册局特定状态码，暂无标准释义。请参阅对应注册局文档了解详情。"
                                        : "Registry-specific status code with no standard description. Refer to the registry's documentation for details."}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {result.status.length > 5 && (
                          <button
                            onClick={() => setExpandStatus(!expandStatus)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium mt-3"
                          >
                            {expandStatus
                              ? t("show_less")
                              : t("more_count", {
                                  count: result.status.length - 5,
                                })}
                          </button>
                        )}
                      </div>
                    )}

                    {result.nameServers.length > 0 && (
                      <div className="glass-panel border border-border rounded-xl p-5 flex flex-col">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <RiServerLine className="w-4 h-4 text-muted-foreground" />
                          {t("whois_fields.name_servers")}
                        </h3>
                        <div className="space-y-2">
                          {result.nameServers.map((ns, i) => {
                            const nsBrand = getNsBrand(ns);
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 p-2 bg-muted/30 border border-border/50 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => copy(ns)}
                              >
                                {nsBrand ? (
                                  nsBrand.slug ? (
                                    nsBrand.slug.startsWith("/") ? (
                                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                        <img
                                          src={nsBrand.slug}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded-sm"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                        <img
                                          src={resolveIconUrl(
                                            nsBrand.slug,
                                            nsBrand.color,
                                            false,
                                          )}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain dark:hidden"
                                        />
                                        <img
                                          src={resolveIconUrl(
                                            nsBrand.slug,
                                            nsBrand.color,
                                            true,
                                          )}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain hidden dark:block"
                                        />
                                      </div>
                                    )
                                  ) : (
                                    <div
                                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                                      style={{ backgroundColor: nsBrand.color }}
                                    >
                                      {nsBrand.brand.charAt(0)}
                                    </div>
                                  )
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1" />
                                )}
                                <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                                  {ns}
                                </span>
                                {nsBrand && (
                                  <span className="text-[9px] text-muted-foreground/60 shrink-0">
                                    {nsBrand.brand}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {result.dnssec && (
                          <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                              {t("whois_fields.dnssec")}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {translateDnssecValue(result.dnssec, locale)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {hasIpFields && (
                      <div className="glass-panel border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <RiGlobalLine className="w-4 h-4 text-muted-foreground" />
                          {t("whois_fields.network_info")}
                        </h3>
                        <div className="space-y-3">
                          {[
                            {
                              label: t("whois_fields.cidr"),
                              value: result.cidr,
                            },
                            {
                              label: t("whois_fields.net_range"),
                              value: result.netRange,
                            },
                            {
                              label: t("whois_fields.net_name"),
                              value: result.netName,
                            },
                            {
                              label: t("whois_fields.net_type"),
                              value: result.netType,
                            },
                            {
                              label: t("whois_fields.origin_as"),
                              value: result.originAS,
                            },
                            {
                              label: t("whois_fields.inet_num"),
                              value: result.inetNum,
                            },
                            {
                              label: t("whois_fields.inet6_num"),
                              value: result.inet6Num,
                            },
                          ]
                            .filter((f) => isValidField(f.value))
                            .map((f, i) => (
                              <div key={i}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                  {f.label}
                                </p>
                                <p className="font-mono text-xs">{f.value}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {result.mozDomainAuthority !== -1 && (
                    <div className="glass-panel border border-border rounded-xl p-5">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <RiBarChartBoxAiFill className="w-4 h-4 text-muted-foreground" />
                        <span>{t("whois_fields.moz_stats")}</span>
                        <Link
                          href="https://moz.com/learn/seo/domain-authority"
                          target="_blank"
                          className="ml-auto text-muted-foreground hover:text-primary transition-colors"
                        >
                          <RiExternalLinkLine className="w-3.5 h-3.5" />
                        </Link>
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div
                          className={cn(
                            "flex flex-col items-center rounded-lg p-3 border",
                            result.mozDomainAuthority > 50
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : "bg-muted/30",
                          )}
                        >
                          <span className="text-xs text-muted-foreground mb-1">
                            DA
                          </span>
                          <span
                            className={cn(
                              "text-lg font-semibold",
                              result.mozDomainAuthority > 50 &&
                                "text-green-600 dark:text-green-400",
                            )}
                          >
                            {result.mozDomainAuthority}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex flex-col items-center rounded-lg p-3 border",
                            result.mozPageAuthority > 50
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : "bg-muted/30",
                          )}
                        >
                          <span className="text-xs text-muted-foreground mb-1">
                            PA
                          </span>
                          <span
                            className={cn(
                              "text-lg font-semibold",
                              result.mozPageAuthority > 50 &&
                                "text-green-600 dark:text-green-400",
                            )}
                          >
                            {result.mozPageAuthority}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex flex-col items-center rounded-lg p-3 border",
                            result.mozSpamScore > 5
                              ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                              : "bg-muted/30",
                          )}
                        >
                          <span className="text-xs text-muted-foreground mb-1">
                            Spam
                          </span>
                          <span
                            className={cn(
                              "text-lg font-semibold",
                              result.mozSpamScore > 5
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400",
                            )}
                          >
                            {result.mozSpamScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4 relative overflow-hidden">
                  <div className="flex flex-col gap-6 lg:absolute lg:inset-0 lg:overflow-y-auto">
                    {isValidField(result.registrar) && (
                      <div className="glass-panel border border-border rounded-xl p-5 shrink-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold">
                            {t("whois_fields.registrar")}
                          </h3>
                          {isValidField(result.ianaId) && (
                            <Link
                              href={`https://www.internic.net/registrars/registrar-${result.ianaId}.html`}
                              target="_blank"
                              className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono hover:bg-muted/80 transition-colors"
                            >
                              IANA: {result.ianaId}
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                          {registrarIcon && registrarIcon.slug ? (
                            registrarIcon.slug.startsWith("/") ? (
                              <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center p-1.5 border shrink-0">
                                <img
                                  src={registrarIcon.slug}
                                  alt=""
                                  className="w-full h-full object-contain rounded-md"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center p-1.5 border shrink-0">
                                <img
                                  src={resolveIconUrl(
                                    registrarIcon.slug,
                                    registrarIcon.color,
                                    false,
                                  )}
                                  alt=""
                                  className="w-full h-full object-contain dark:hidden"
                                />
                                <img
                                  src={resolveIconUrl(
                                    registrarIcon.slug,
                                    registrarIcon.color,
                                    true,
                                  )}
                                  alt=""
                                  className="w-full h-full object-contain hidden dark:block"
                                />
                              </div>
                            )
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                              style={{
                                backgroundColor: registrarIcon
                                  ? registrarIcon.color
                                  : getRegistrarFallbackColor(result.registrar),
                              }}
                            >
                              {registrarInitial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {result.registrar}
                            </p>
                            {isValidField(result.registrarURL) && (
                                <a
                                  href={
                                    result.registrarURL.startsWith("http")
                                      ? result.registrarURL
                                      : `http://${result.registrarURL}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all block"
                                >
                                  {result.registrarURL}
                                </a>
                              )}
                          </div>
                        </div>
                        {isValidField(result.whoisServer) && (
                            <div className="mb-3">
                              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">
                                {t("whois_fields.whois_server")}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                                {result.whoisServer}
                              </p>
                            </div>
                          )}
                        {isValidField(result.registrantEmail) && (
                            <div className="mb-3">
                              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">
                                {t("whois_fields.contact_email")}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                                {result.registrantEmail}
                              </p>
                            </div>
                          )}
                        {isValidField(result.registrantPhone) && (
                            <div>
                              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">
                                {t("whois_fields.contact_phone")}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground">
                                {result.registrantPhone}
                              </p>
                            </div>
                          )}
                      </div>
                    )}

                    {(result.rawWhoisContent || result.rawRdapContent) && (
                      <div className="flex-1 min-h-[250px]">
                        <ResponsePanel
                          whoisContent={result.rawWhoisContent}
                          rdapContent={result.rawRdapContent}
                          target={target}
                          copy={copy}
                          save={save}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </main>
      </ScrollArea>
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("image_preview")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("width")}</Label>
                <Input
                  type="number"
                  value={imgWidth}
                  onChange={(e) =>
                    setImgWidth(
                      Math.min(
                        4096,
                        Math.max(200, parseInt(e.target.value) || 1200),
                      ),
                    )
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("height")}</Label>
                <Input
                  type="number"
                  value={imgHeight}
                  onChange={(e) =>
                    setImgHeight(
                      Math.min(
                        4096,
                        Math.max(200, parseInt(e.target.value) || 630),
                      ),
                    )
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("theme")}</Label>
                <Select
                  value={imgTheme}
                  onValueChange={(v: "light" | "dark") => setImgTheme(v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("light")}</SelectItem>
                    <SelectItem value="dark">{t("dark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <img
                src={buildOgUrl(target, result, {
                  w: imgWidth,
                  h: imgHeight,
                  theme: imgTheme,
                })}
                alt="OG Preview"
                className="w-full h-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={imgActing !== null}
                onClick={async () => {
                  const ogUrl = buildOgUrl(target, result, {
                    w: imgWidth,
                    h: imgHeight,
                    theme: imgTheme,
                  });
                  setImgActing("download");
                  try {
                    const res = await fetch(ogUrl);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `whois-${target}-${imgWidth}x${imgHeight}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(t("toast.downloaded"));
                  } catch {
                    toast.error(t("toast.download_failed"));
                  } finally {
                    setImgActing(null);
                  }
                }}
              >
                {imgActing === "download"
                  ? <><RiLoader4Line className="w-3.5 h-3.5 mr-1.5 animate-spin" />{isZh ? "生成中…" : "Generating…"}</>
                  : <><RiDownloadLine className="w-3.5 h-3.5 mr-1.5" />{t("download")}</>
                }
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={imgActing !== null}
                onClick={async () => {
                  const ogUrl = buildOgUrl(target, result, {
                    w: imgWidth,
                    h: imgHeight,
                    theme: imgTheme,
                  });
                  setImgActing("copy");
                  try {
                    const res = await fetch(ogUrl);
                    const blob = await res.blob();
                    await navigator.clipboard.write([
                      new ClipboardItem({ "image/png": blob }),
                    ]);
                    toast.success(t("toast.copied_to_clipboard"));
                  } catch {
                    toast.error(t("toast.copy_to_clipboard_failed"));
                  } finally {
                    setImgActing(null);
                  }
                }}
              >
                {imgActing === "copy"
                  ? <><RiLoader4Line className="w-3.5 h-3.5 mr-1.5 animate-spin" />{isZh ? "生成中…" : "Generating…"}</>
                  : <><RiFileCopyLine className="w-3.5 h-3.5 mr-1.5" />{t("copy")}</>
                }
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ogUrl = buildOgUrl(target, result, {
                    w: imgWidth,
                    h: imgHeight,
                    theme: imgTheme,
                  });
                  copy(window.location.origin + ogUrl);
                }}
              >
                <RiLinkM className="w-3.5 h-3.5 mr-1.5" />
                {t("copy_link")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
