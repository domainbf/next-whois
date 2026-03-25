/**
 * Multi-dimensional domain value scoring system.
 * Returns a score 0-100 and a breakdown of scoring factors.
 */

// ── Special prefix list (always alert admin when available) ──────────────────
export const ALERT_KEYWORDS = new Set([
  // Meta/Navigation
  "www", "domain", "domains", "whois", "rdap", "dns", "nic",
  // Protocol/Tech
  "api", "ssl", "cert", "cdn", "proxy", "vpn", "server", "host",
  "hosting", "ip", "ipv4", "ipv6", "asn", "cidr",
  // Common TLD words (queried as SLD)
  "com", "net", "org", "io", "co", "app", "dev",
  // AI / LLM
  "ai", "gpt", "llm", "agi", "grok", "claude", "gemini", "openai",
  "chatgpt", "sora", "dalle", "midjourney", "copilot",
  // Registrar/Registry related
  "register", "registrar", "registry", "nameserver", "ns",
  "transfer", "renew", "renewal", "expire",
]);

// ── Hot keyword categories for scoring ───────────────────────────────────────
const AI_TECH_WORDS = new Set([
  "ai", "gpt", "llm", "ml", "agi", "bot", "api", "rag", "grok",
  "claude", "gemini", "openai", "sora", "dalle", "copilot", "deepseek",
  "chatgpt", "mistral", "llama", "diffusion", "neural", "vision",
  "model", "inference", "embedding",
]);

const FINANCE_CRYPTO_WORDS = new Set([
  "pay", "wallet", "coin", "token", "nft", "defi", "web3", "crypto",
  "btc", "eth", "usdt", "usdc", "dao", "dex", "swap", "yield",
  "staking", "airdrop", "mint", "chain", "layer", "rollup", "evm",
  "bank", "finance", "fintech", "invest", "fund", "asset", "wealth",
  "money", "cash", "forex", "stock", "trade", "market",
]);

const BUSINESS_BRAND_WORDS = new Set([
  "shop", "store", "mall", "mart", "market", "buy", "sell", "deal",
  "saas", "crm", "erp", "b2b", "b2c", "startup", "venture",
  "global", "world", "inter", "pro", "plus", "max", "ultra", "prime",
  "top", "best", "first", "one", "now", "go", "get", "my", "me",
  "new", "next", "super", "hyper", "mega", "smart", "fast", "quick",
]);

const TECH_GENERAL_WORDS = new Set([
  "cloud", "data", "code", "dev", "tech", "app", "web", "net",
  "hub", "lab", "stack", "base", "core", "edge", "node", "grid",
  "platform", "engine", "service", "system", "tools", "kit",
  "open", "free", "auto", "meta", "micro", "nano", "scale",
  "stream", "pipe", "wire", "link", "connect", "bridge", "gate",
  "search", "index", "cache", "log", "trace", "monitor", "alert",
]);

// Premium TLDs and their value scores
const TLD_SCORES: Record<string, number> = {
  com: 20, ai: 18, io: 16, net: 14, org: 14,
  co: 12, app: 12, dev: 10, me: 9,
  cn: 8, "com.cn": 8, hk: 7, sg: 6,
  info: 5, biz: 4, xyz: 4, online: 3,
};

export type DomainValueResult = {
  score: number;
  tier: "极高" | "高" | "中高" | "普通" | "低";
  tierColor: string;
  isAlertKeyword: boolean;
  isNumericOnly: boolean;
  isSingleChar: boolean;
  reasons: string[];
  breakdown: {
    lengthScore: number;
    tldScore: number;
    keywordScore: number;
    patternScore: number;
  };
};

export function scoreDomain(query: string, queryType: string): DomainValueResult | null {
  if (queryType !== "domain") return null;

  const lower = query.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx < 1) return null;

  const sld = lower.slice(0, dotIdx);           // second-level label
  const tld = lower.slice(dotIdx + 1);          // top-level label

  // Handle multi-part TLDs like com.cn
  const secondDot = sld.lastIndexOf(".");
  const actualName = secondDot >= 0 ? sld.slice(0, secondDot) : sld;
  const effectiveTld = secondDot >= 0 ? `${sld.slice(secondDot + 1)}.${tld}` : tld;

  const nameLen = actualName.length;
  const isNumericOnly = /^\d+$/.test(actualName);
  const isSingleChar = nameLen === 1;
  const isAlertKeyword = ALERT_KEYWORDS.has(actualName) || isSingleChar || isNumericOnly;

  const reasons: string[] = [];
  let lengthScore = 0;
  let tldScore = 0;
  let keywordScore = 0;
  let patternScore = 0;

  // ── 1. Length score (0-30) ─────────────────────────────────────────────────
  if (nameLen === 1)       { lengthScore = 30; reasons.push("单字符极稀缺"); }
  else if (nameLen === 2)  { lengthScore = 28; reasons.push("双字符顶级短域"); }
  else if (nameLen === 3)  { lengthScore = 24; reasons.push("三字符优质短域"); }
  else if (nameLen === 4)  { lengthScore = 18; reasons.push("四字符短域名"); }
  else if (nameLen === 5)  { lengthScore = 12; }
  else if (nameLen === 6)  { lengthScore = 7;  }
  else if (nameLen <= 8)   { lengthScore = 3;  }
  else                     { lengthScore = 0;  }

  // ── 2. TLD score (0-20) ────────────────────────────────────────────────────
  tldScore = TLD_SCORES[effectiveTld] ?? TLD_SCORES[tld] ?? 2;
  if (tldScore >= 16) reasons.push(`顶级后缀 .${effectiveTld}`);
  else if (tldScore >= 12) reasons.push(`优质后缀 .${effectiveTld}`);

  // ── 3. Keyword score (0-25) ────────────────────────────────────────────────
  // Check full name and common English words embedded in name
  const checkWords = [actualName, ...(actualName.length > 4 ? extractSubwords(actualName) : [])];

  if (checkWords.some(w => AI_TECH_WORDS.has(w))) {
    keywordScore = Math.max(keywordScore, 25);
    reasons.push("AI/科技热词");
  } else if (checkWords.some(w => FINANCE_CRYPTO_WORDS.has(w))) {
    keywordScore = Math.max(keywordScore, 20);
    reasons.push("金融/加密热词");
  } else if (checkWords.some(w => BUSINESS_BRAND_WORDS.has(w))) {
    keywordScore = Math.max(keywordScore, 15);
    reasons.push("商业品牌词");
  } else if (checkWords.some(w => TECH_GENERAL_WORDS.has(w))) {
    keywordScore = Math.max(keywordScore, 12);
    reasons.push("技术通用词");
  }

  // Alert keyword bonus
  if (ALERT_KEYWORDS.has(actualName)) {
    keywordScore = Math.max(keywordScore, 22);
    reasons.push("特殊关键词");
  }

  // ── 4. Pattern score (0-15) ────────────────────────────────────────────────
  if (isNumericOnly) {
    patternScore += 10;
    reasons.push(`纯数字域名（${nameLen}位）`);
  }
  if (isSingleChar) {
    patternScore += 5;
  }
  if (!isNumericOnly && /^[a-z]+$/.test(actualName)) {
    patternScore += 4;
    if (nameLen <= 6) reasons.push("纯字母无连字符");
  }
  if (!/[-_]/.test(actualName)) {
    patternScore += 2;
  }
  // Palindrome bonus
  if (nameLen >= 2 && actualName === actualName.split("").reverse().join("")) {
    patternScore += 3;
    reasons.push("回文域名");
  }
  // Repeating pattern (aa, aaa, abab)
  if (/^(.)\1+$/.test(actualName) && nameLen >= 2) {
    patternScore += 3;
    reasons.push("重复字符");
  }

  // Cap pattern score
  patternScore = Math.min(patternScore, 15);

  // ── Final score ────────────────────────────────────────────────────────────
  const raw = lengthScore + tldScore + keywordScore + patternScore;
  const score = Math.min(100, raw);

  let tier: DomainValueResult["tier"];
  let tierColor: string;
  if (score >= 75) { tier = "极高"; tierColor = "#dc2626"; }
  else if (score >= 55) { tier = "高";  tierColor = "#d97706"; }
  else if (score >= 35) { tier = "中高"; tierColor = "#7c3aed"; }
  else if (score >= 15) { tier = "普通"; tierColor = "#64748b"; }
  else               { tier = "低";  tierColor = "#94a3b8"; }

  return {
    score,
    tier,
    tierColor,
    isAlertKeyword,
    isNumericOnly,
    isSingleChar,
    reasons: reasons.slice(0, 4),
    breakdown: { lengthScore, tldScore, keywordScore, patternScore },
  };
}

/** Extract candidate sub-words from a domain name by splitting on common boundaries */
function extractSubwords(name: string): string[] {
  const words: string[] = [];
  // Try all substrings of length 2-8 that appear at start/end or are common words
  for (let len = 2; len <= Math.min(name.length, 10); len++) {
    for (let start = 0; start <= name.length - len; start++) {
      words.push(name.slice(start, start + len));
    }
  }
  return words;
}

/**
 * Determine if this domain should trigger an admin alert email.
 * Triggers when domain is available AND is special/high-value.
 */
export function shouldAlertAdmin(
  query: string,
  queryType: string,
  regStatus: string,
): boolean {
  if (regStatus !== "unregistered") return false;
  if (queryType !== "domain") return false;

  const result = scoreDomain(query, queryType);
  if (!result) return false;

  return result.isAlertKeyword || result.score >= 70;
}
