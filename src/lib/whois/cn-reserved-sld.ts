/**
 * CN Reserved Second-Level Domain Database
 *
 * CNNIC (China Internet Network Information Center) reserves a set of
 * second-level domain labels under .cn for official use. These SLDs are
 * NOT directly registerable — they serve only as suffixes for third-level
 * domain registrations (e.g. example.bj.cn).
 *
 * Categories:
 *   1. Provincial administrative (34 SLDs) — one per province/region/SAR
 *   2. Functional (7 SLDs) — sector-specific suffixes
 *   3. System reserved (2 exact domains) — nic.cn, cnnic.cn
 */

export const CN_PROVINCE_SLDS: Record<string, { zh: string; en: string }> = {
  bj: { zh: "北京市",          en: "Beijing Municipality" },
  sh: { zh: "上海市",          en: "Shanghai Municipality" },
  tj: { zh: "天津市",          en: "Tianjin Municipality" },
  cq: { zh: "重庆市",          en: "Chongqing Municipality" },
  he: { zh: "河北省",          en: "Hebei Province" },
  sx: { zh: "山西省",          en: "Shanxi Province" },
  nm: { zh: "内蒙古自治区",    en: "Inner Mongolia Autonomous Region" },
  ln: { zh: "辽宁省",          en: "Liaoning Province" },
  jl: { zh: "吉林省",          en: "Jilin Province" },
  hl: { zh: "黑龙江省",        en: "Heilongjiang Province" },
  js: { zh: "江苏省",          en: "Jiangsu Province" },
  zj: { zh: "浙江省",          en: "Zhejiang Province" },
  ah: { zh: "安徽省",          en: "Anhui Province" },
  fj: { zh: "福建省",          en: "Fujian Province" },
  jx: { zh: "江西省",          en: "Jiangxi Province" },
  sd: { zh: "山东省",          en: "Shandong Province" },
  ha: { zh: "河南省",          en: "Henan Province" },
  hb: { zh: "湖北省",          en: "Hubei Province" },
  hn: { zh: "湖南省",          en: "Hunan Province" },
  gd: { zh: "广东省",          en: "Guangdong Province" },
  gx: { zh: "广西壮族自治区",  en: "Guangxi Zhuang Autonomous Region" },
  hi: { zh: "海南省",          en: "Hainan Province" },
  sc: { zh: "四川省",          en: "Sichuan Province" },
  gz: { zh: "贵州省",          en: "Guizhou Province" },
  yn: { zh: "云南省",          en: "Yunnan Province" },
  xz: { zh: "西藏自治区",      en: "Tibet Autonomous Region" },
  sn: { zh: "陕西省",          en: "Shaanxi Province" },
  gs: { zh: "甘肃省",          en: "Gansu Province" },
  qh: { zh: "青海省",          en: "Qinghai Province" },
  nx: { zh: "宁夏回族自治区",  en: "Ningxia Hui Autonomous Region" },
  xj: { zh: "新疆维吾尔自治区", en: "Xinjiang Uyghur Autonomous Region" },
  tw: { zh: "台湾省",          en: "Taiwan Province" },
  hk: { zh: "香港特别行政区",  en: "Hong Kong SAR" },
  mo: { zh: "澳门特别行政区",  en: "Macao SAR" },
};

export const CN_FUNCTIONAL_SLDS: Record<string, { zh: string; en: string }> = {
  ac:  { zh: "科研机构",                      en: "scientific research institutions" },
  com: { zh: "工商、金融等企业",              en: "commercial enterprises" },
  edu: { zh: "教育机构（高校及教育单位）",    en: "educational institutions" },
  gov: { zh: "政府机构",                      en: "government agencies" },
  mil: { zh: "国防机构",                      en: "national defense institutions" },
  net: { zh: "提供互联网服务的机构",          en: "internet service providers" },
  org: { zh: "非营利性组织",                  en: "non-profit organizations" },
};

export const CN_SYSTEM_RESERVED: Record<string, { zh: string; en: string }> = {
  "nic.cn":   { zh: "中国互联网络信息中心（CNNIC）系统管理专用", en: "System domain for CNNIC administration" },
  "cnnic.cn": { zh: "中国互联网络信息中心（CNNIC）官方专用",     en: "Official domain reserved for CNNIC" },
};

export type CnReservedInfo = {
  type: "province" | "functional" | "system";
  descZh: string;
  descEn: string;
};

/**
 * Returns metadata about a known reserved .cn SLD/domain, or null if not reserved.
 *
 * Handles three cases:
 *   - Exact system domains: nic.cn, cnnic.cn
 *   - Province 2nd-level domains: bj.cn, sh.cn … (label.cn, parts.length === 2)
 *   - Functional 2nd-level domains: ac.cn, com.cn, edu.cn, gov.cn, mil.cn, net.cn, org.cn
 */
export function getCnReservedSldInfo(domain: string): CnReservedInfo | null {
  const lower = domain.toLowerCase().trim();

  if (CN_SYSTEM_RESERVED[lower]) {
    const info = CN_SYSTEM_RESERVED[lower];
    return {
      type: "system",
      descZh: `${lower} 为 CNNIC 系统保留域名。${info.zh}，不向公众开放注册。`,
      descEn: `${lower} is a system-reserved domain under CNNIC. ${info.en} — not available for public registration.`,
    };
  }

  if (!lower.endsWith(".cn")) return null;

  const parts = lower.split(".");
  if (parts.length !== 2) return null;

  const sld = parts[0];

  if (CN_PROVINCE_SLDS[sld]) {
    const province = CN_PROVINCE_SLDS[sld];
    return {
      type: "province",
      descZh:
        `${sld.toUpperCase()}.CN 是 CNNIC 为${province.zh}保留的省级行政区划域名（共34个），` +
        `该二级域名本身不可直接注册，仅作为后缀供三级域名（如 example.${sld}.cn）注册使用。`,
      descEn:
        `${sld.toUpperCase()}.CN is reserved by CNNIC as the provincial administrative domain for ${province.en}. ` +
        `This second-level domain cannot be registered directly — it serves as a suffix for ` +
        `third-level domain registrations (e.g. example.${sld}.cn).`,
    };
  }

  if (CN_FUNCTIONAL_SLDS[sld]) {
    const func = CN_FUNCTIONAL_SLDS[sld];
    return {
      type: "functional",
      descZh:
        `${sld.toUpperCase()}.CN 是 CNNIC 保留的功能性二级域名，专供${func.zh}申请使用。` +
        `该二级域名本身不可直接注册，仅作为后缀供三级域名（如 example.${sld}.cn）注册使用。`,
      descEn:
        `${sld.toUpperCase()}.CN is a functional second-level domain reserved by CNNIC ` +
        `for ${func.en} only. ` +
        `It cannot be registered directly — it serves as a suffix for third-level domains ` +
        `(e.g. example.${sld}.cn).`,
    };
  }

  return null;
}
