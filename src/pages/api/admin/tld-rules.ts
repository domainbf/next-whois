import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { one, run, many } from "@/lib/db-query";
import {
  isRedisAvailable,
  getRedisValue,
  setRedisValue,
  deleteRedisValue,
} from "@/lib/server/redis";
import * as cheerio from "cheerio";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { callProviderWithFallback } from "@/lib/server/ai-providers";

// ─── Local JSON file cache (best-effort, fails silently in read-only envs) ────
const LOCAL_CACHE_PATH = join(process.cwd(), "data", "tld-rules.json");

function updateLocalCache(tld: string, data: Record<string, unknown>): void {
  try {
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    let cache: { generated_at: string; count: number; rules: Record<string, unknown> } =
      { generated_at: "", count: 0, rules: {} };
    if (existsSync(LOCAL_CACHE_PATH)) {
      try { cache = JSON.parse(readFileSync(LOCAL_CACHE_PATH, "utf8")); } catch {}
    }
    cache.rules[tld] = { ...data, saved_at: new Date().toISOString() };
    cache.count = Object.keys(cache.rules).length;
    cache.generated_at = new Date().toISOString();
    writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (e) {
    // Silent: production (Vercel) has read-only FS; local backup is best-effort
    console.warn("[tld-rules] local-cache write skipped:", (e as Error).message);
  }
}

// Redis keys
const RATE_LIMIT_KEY = (tld: string) => `tld_rules_rl:${tld}`;
const SCRAPE_CACHE_KEY = (url: string) =>
  `tld_rules_scrape:${Buffer.from(url).toString("base64").slice(0, 60)}`;
const REGISTRY_URL_CACHE_KEY = (tld: string) => `tld_registry_url:${tld}`;

// TTLs
const RATE_LIMIT_TTL_S = 60 * 60;       // 1 request per TLD per hour
const SCRAPE_CACHE_TTL_S = 60 * 60 * 6; // raw page text cached 6 h
const REGISTRY_URL_TTL_S = 60 * 60 * 24 * 7; // registry URL cached 7 days

// Lifecycle keywords that signal a page has actual policy info
const LIFECYCLE_KEYWORDS = [
  // English
  "grace period", "grace", "redemption", "pending delete", "pendingdelete",
  "rgp", "autorenew", "auto-renew", "purge", "drop time", "drop date",
  "release time", "deletion", "lifecycle", "life cycle", "expiry period",
  "expiration period", "renewal period", "registry grace", "add grace",
  // Chinese (Simplified + Traditional)
  "宽限期", "赎回期", "待删除", "掉落时间", "释放时间", "删除时间",
  "续费", "到期", "宽限", "赎回", "注销", "删除期",
  // Japanese
  "ライフサイクル", "猶予期間", "回復期間", "削除待ち", "更新期間",
  "有効期限", "削除", "廃止",
  // Korean
  "갱신유예", "복구기간", "삭제대기", "라이프사이클",
  // German
  "löschfrist", "kündigungsfrist", "löschung", "wiederherstellung",
  // French
  "période de grâce", "rédemption", "suppression en attente",
  // Russian
  "период льготы", "период выкупа",
];

function hasLifecycleInfo(text: string): boolean {
  const lower = text.toLowerCase();
  return LIFECYCLE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
async function checkRateLimit(tld: string): Promise<boolean> {
  if (!isRedisAvailable()) return true; // skip if no Redis
  const key = RATE_LIMIT_KEY(tld);
  const val = await getRedisValue(key);
  if (val) return false;
  await setRedisValue(key, "1", RATE_LIMIT_TTL_S);
  return true;
}

// ─── Fetch & clean page text (with lifecycle keyword prioritization) ──────────
async function fetchRawHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; next-whois-ui/1.0; domain-lifecycle-crawler)",
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "en,zh;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

function extractText(html: string, maxChars = 10_000): string {
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe,svg,button,form").remove();

  // Try to get the most relevant section first
  const mainEl = $("main,article,[class*=content],[id*=content],.policy,.lifecycle,.domain-info,body").first();
  const rawText = (mainEl.text() || $("body").text())
    .replace(/\s{3,}/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();

  if (rawText.length <= maxChars) return rawText;

  // Smart slicing: prefer sections containing lifecycle keywords
  const lines = rawText.split("\n");
  const relevantLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (LIFECYCLE_KEYWORDS.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
      // Include surrounding context (3 lines before+after handled by gathering blocks)
      relevantLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // Prioritize: relevant lines first, then fill with remaining lines
  const priority = relevantLines.join("\n").slice(0, Math.floor(maxChars * 0.7));
  const rest = otherLines.join("\n").slice(0, maxChars - priority.length);
  return (priority + "\n\n" + rest).trim().slice(0, maxChars);
}

/**
 * Extract the registry's official URL from an IANA root-db page.
 * Works on both raw HTML (preferred) and extracted plain text.
 */
function extractRegistryUrl(htmlOrText: string): string | null {
  // First try: find the <a> href right after "URL for registration services"
  // IANA HTML: <b>URL for registration services:</b><br/> <a href="https://...">...</a>
  const hrefMatch = htmlOrText.match(
    /URL for registration services[^<]*<[^>]+>\s*<a[^>]+href=["']?(https?:\/\/[^"'\s>]+)["']?/i
  );
  if (hrefMatch) {
    return hrefMatch[1].replace(/\/$/, "").replace(/[)\]>]+$/, "");
  }

  // Second try: plain-text URL (full http:// form)
  const urlMatch = htmlOrText.match(
    /URL for registration services[^\n]*\n?\s*(https?:\/\/[^\s\n<>]+)/i
  );
  if (urlMatch) {
    return urlMatch[1].replace(/\/$/, "").replace(/[)\]>]+$/, "");
  }

  // Third try: "www." style (no scheme) — add https://
  const wwwMatch = htmlOrText.match(
    /URL for registration services[^\n]*\n?\s*(www\.[^\s\n<>]+)/i
  );
  if (wwwMatch) {
    return `https://${wwwMatch[1]}`.replace(/\/$/, "");
  }

  return null;
}

/**
 * Extract registry URL from raw IANA HTML (more reliable than text).
 * Falls back to text-based extraction.
 */
function extractRegistryUrlFromHtml(html: string): string | null {
  // IANA page structure: the link after "URL for registration services"
  const $ = cheerio.load(html);
  let found: string | null = null;

  $("*").each((_, el) => {
    const text = $(el).clone().children().remove().end().text();
    if (/URL for registration services/i.test(text)) {
      // Look for next sibling or nested <a>
      const nextA = $(el).next("a").attr("href") ??
        $(el).parent().find("a").first().attr("href") ?? null;
      if (nextA?.match(/^https?:\/\//)) {
        found = nextA.replace(/\/$/, "");
        return false; // break
      }
    }
  });

  if (found) return found;

  // Also try: find any <a> whose href is near the string in the page
  const blockMatch = html.match(
    /URL for registration services[\s\S]{0,200}?href=["']?(https?:\/\/[^"'\s>]+)/i
  );
  if (blockMatch) return blockMatch[1].replace(/\/$/, "");

  // Fall back to text parsing
  return extractRegistryUrl($.text());
}

/** Common lifecycle path suffixes to probe on a registry domain */
const LIFECYCLE_PATHS = [
  "/domain-lifecycle", "/domains/lifecycle", "/en/domains/lifecycle",
  "/lifecycle", "/en/lifecycle", "/policies/lifecycle",
  "/domain-names/lifecycle", "/support/lifecycle", "/faq/lifecycle",
  "/about/lifecycle", "/en/domain-lifecycle", "/domains/domain-lifecycle",
  "/en/domains/domain-lifecycle", "/registrar/lifecycle",
  "/policies", "/en/policies", "/domains/policies", "/domains",
  "/en/domains", "/en/domain-names", "/domain-names",
  "/registrar-information", "/registrar-resources",
];

/** Link href keywords that indicate a lifecycle/renewal policy page */
const LIFECYCLE_LINK_KEYWORDS = [
  // English
  "lifecycle", "life-cycle", "grace", "redemption", "renewal", "expir",
  "policy", "policies", "domain-rules", "domain-policy", "rgp", "purge", "delete",
  // Chinese
  "待删", "宽限", "赎回", "续费", "政策", "规则", "生命周期", "到期",
  // Japanese
  "ライフサイクル", "猶予", "削除", "更新", "有効期限", "ルール",
  // Korean
  "라이프사이클", "갱신", "삭제",
  // German
  "lebenszyklus", "lösch", "kündig",
  // French
  "cycle", "suppression", "rédem",
];

function hasLifecycleLinkKeyword(href: string, text: string): boolean {
  const combined = `${href} ${text}`.toLowerCase();
  return LIFECYCLE_LINK_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

/**
 * Parse all <a> hrefs from an HTML page that look like lifecycle policy links.
 * Returns absolute URLs, deduped, capped at 20.
 */
function extractLifecycleLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl).origin;
  const seen = new Set<string>();
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (!hasLifecycleLinkKeyword(href, text)) return;

    let abs: string;
    try {
      abs = new URL(href, baseUrl).href;
    } catch { return; }

    // Only follow links on the same domain or subdomains
    if (!abs.startsWith(base)) return;
    if (seen.has(abs)) return;
    seen.add(abs);
    links.push(abs);
    if (links.length >= 20) return false; // stop iteration
  });

  return links;
}

/**
 * Multi-strategy registry lifecycle page finder.
 * Strategy 1: Try the registry URL itself (homepage may have lifecycle info)
 * Strategy 2: Try common path suffixes
 * Strategy 3: Crawl homepage + linked pages for lifecycle keywords
 * Returns { url, text } of the best page found, or null.
 */
async function findRegistryLifecyclePage(
  registryUrl: string
): Promise<{ url: string; text: string } | null> {
  const base = new URL(registryUrl).origin;

  // ── Strategy 1: Try registry root URL directly ──────────────────────────────
  try {
    const html = await fetchRawHtml(registryUrl);
    const text = extractText(html, 10_000);
    if (hasLifecycleInfo(text)) {
      return { url: registryUrl, text };
    }

    // ── Strategy 2: Try common path suffixes ──────────────────────────────────
    for (const path of LIFECYCLE_PATHS) {
      const url = base + path;
      try {
        const pHtml = await fetchRawHtml(url);
        const pText = extractText(pHtml, 10_000);
        if (hasLifecycleInfo(pText)) {
          return { url, text: pText };
        }
      } catch { /* try next path */ }
    }

    // ── Strategy 3: Follow lifecycle-looking links from the homepage ──────────
    const linkedUrls = extractLifecycleLinks(html, registryUrl);
    for (const linkedUrl of linkedUrls) {
      try {
        const lHtml = await fetchRawHtml(linkedUrl);
        const lText = extractText(lHtml, 10_000);
        if (hasLifecycleInfo(lText)) {
          return { url: linkedUrl, text: lText };
        }
        // If the linked page itself has MORE lifecycle links, follow one level deeper
        const deepLinks = extractLifecycleLinks(lHtml, linkedUrl).slice(0, 5);
        for (const deepUrl of deepLinks) {
          if (deepUrl === linkedUrl || deepUrl === registryUrl) continue;
          try {
            const dHtml = await fetchRawHtml(deepUrl);
            const dText = extractText(dHtml, 10_000);
            if (hasLifecycleInfo(dText)) {
              return { url: deepUrl, text: dText };
            }
          } catch { /* skip */ }
        }
      } catch { /* try next link */ }
    }
  } catch { /* registry unreachable */ }

  return null;
}

async function fetchPageText(url: string): Promise<{ text: string; finalUrl: string }> {
  // Check cache first
  const cacheKey = SCRAPE_CACHE_KEY(url);
  if (isRedisAvailable()) {
    const cached = await getRedisValue(cacheKey);
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        return { text: obj.text, finalUrl: obj.finalUrl ?? url };
      } catch {
        return { text: cached, finalUrl: url };
      }
    }
  }

  let html = await fetchRawHtml(url);
  const ianaText = extractText(html, 10_000);
  let text = ianaText;
  let finalUrl = url;

  // ── Smart URL discovery: if IANA page has no lifecycle data, find registry page ──
  if (!hasLifecycleInfo(ianaText) && url.includes("iana.org")) {
    // Extract from raw HTML first (gets the <a href="..."> link directly)
    const registryUrl = extractRegistryUrlFromHtml(html) ?? extractRegistryUrl(ianaText);
    if (registryUrl) {
      const tldKey = new URL(url).pathname.split("/").pop()?.replace(/\.html$/, "") ?? "";
      const cacheKey2 = REGISTRY_URL_CACHE_KEY(tldKey);

      // Try cached result first
      let cachedPayload: string | null = null;
      if (isRedisAvailable()) {
        cachedPayload = await getRedisValue(cacheKey2);
      }

      let found: { url: string; text: string } | null = null;
      if (cachedPayload) {
        try {
          const parsed = JSON.parse(cachedPayload);
          found = { url: parsed.url, text: parsed.text };
        } catch {
          // stale cache with just URL — re-fetch its text
          try {
            const fHtml = await fetchRawHtml(cachedPayload);
            found = { url: cachedPayload, text: extractText(fHtml, 10_000) };
          } catch { /* ignore */ }
        }
      }

      if (!found) {
        // Full multi-strategy discovery (may take several HTTP requests)
        found = await findRegistryLifecyclePage(registryUrl).catch(() => null);
        if (found && isRedisAvailable()) {
          // Cache the URL + a snippet of text (text too large to cache fully — just URL)
          await setRedisValue(cacheKey2, found.url, REGISTRY_URL_TTL_S);
        }
      }

      if (found && hasLifecycleInfo(found.text)) {
        // Combine: IANA context (registry name etc.) + registry lifecycle page
        text = `[IANA 页面 — 注册局信息]\n${ianaText.slice(0, 1500)}\n\n[注册局生命周期政策页 ${found.url}]\n${found.text.slice(0, 7500)}`;
        finalUrl = found.url;
      }
    }
  }

  const payload = JSON.stringify({ text, finalUrl });
  if (text && isRedisAvailable()) {
    await setRedisValue(cacheKey, payload, SCRAPE_CACHE_TTL_S);
  }
  return { text, finalUrl };
}

// ─── AI extraction with multi-model fallback ──────────────────────────────────
interface ExtractedLifecycle {
  grace_period_days: number;
  redemption_period_days: number;
  pending_delete_days: number;
  drop_hour: number | null;
  drop_minute: number | null;
  drop_second: number | null;
  drop_timezone: string | null;
  pre_expiry_days: number | null;
  reasoning: string;
  model_used: string;
}

const SYSTEM_PROMPT = `你是域名注册局政策专家，精通ICANN及各国注册局的域名生命周期规则。
从注册局官网文字中精准提取以下字段（英文/中文页面均可）：

1. grace_period_days — 宽限期天数（域名到期后仍可续费；英文：grace period / autorenew grace period）
2. redemption_period_days — 赎回期天数（RGP；英文：redemption grace period / redemption period）
3. pending_delete_days — 待删除期天数（英文：pending delete / pending purge / pending deletion）
4. pre_expiry_days — 注册局在到期日【之前】多少天提前删除（如 .nl 提前3天、.in 提前30天）；无此规定填0
5. drop_hour — 域名最终被释放/删除的确切时刻（小时 0-23）；若页面未明确提及填null
6. drop_minute — 释放时刻分钟（0-59）；未知填null
7. drop_second — 释放时刻秒（0-59）；未知填null  
8. drop_timezone — 释放时刻的时区（IANA格式，如 Europe/Berlin、Asia/Shanghai、UTC）；未知填null

【关键规则】：
- 若页面内容是IANA注册局信息页（只有注册局联系信息，无任何天数/时间信息），grace/redemption/pending_delete仍需填行业默认值（30/30/5），并在reasoning中注明"IANA页面无具体数据，使用ICANN gTLD默认值"
- 若是ccTLD且页面无数据，reasoning中注明"ccTLD注册局页面无具体政策数据"
- drop_hour/drop_timezone只有页面明确说明时才填，不要猜测

严格输出JSON，不加任何额外文字、注释或代码块标记：
{"grace_period_days":30,"redemption_period_days":30,"pending_delete_days":5,"pre_expiry_days":0,"drop_hour":null,"drop_minute":null,"drop_second":null,"drop_timezone":null,"reasoning":"数据来源和提取说明"}`;

function parseAiJson(content: string): ExtractedLifecycle {
  const cleaned = content
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "")
    .replace(/^[^{]*({[\s\S]*})[^}]*$/, "$1") // extract JSON object even with surrounding text
    .trim();
  const parsed = JSON.parse(cleaned);
  const toInt = (v: unknown, min = 0) => Math.max(min, parseInt(String(v)) || 0);
  const toNullInt = (v: unknown, lo: number, hi: number): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseInt(String(v));
    return isNaN(n) ? null : Math.min(hi, Math.max(lo, n));
  };
  return {
    grace_period_days: toInt(parsed.grace_period_days),
    redemption_period_days: toInt(parsed.redemption_period_days),
    pending_delete_days: toInt(parsed.pending_delete_days),
    pre_expiry_days: toNullInt(parsed.pre_expiry_days, 0, 365),
    drop_hour:   toNullInt(parsed.drop_hour,   0, 23),
    drop_minute: toNullInt(parsed.drop_minute, 0, 59),
    drop_second: toNullInt(parsed.drop_second, 0, 59),
    drop_timezone: typeof parsed.drop_timezone === "string" && parsed.drop_timezone
      ? parsed.drop_timezone.slice(0, 50) : null,
    reasoning: String(parsed.reasoning || "").slice(0, 600),
    model_used: "",
  };
}

async function extractWithAI(
  tld: string,
  pageText: string,
  sourceUrl: string,
  preferredModel?: string
): Promise<ExtractedLifecycle> {
  // Trim to ~6k chars to stay within small-context models (e.g. moonshot-v1-8k = ~8k tokens total)
  const pageSnippet = pageText.slice(0, 6000);
  const userMessage = `TLD: .${tld}\n来源页面: ${sourceUrl}\n\n页面内容：\n${pageSnippet}`;
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userMessage },
  ];

  const errors: string[] = [];
  const { content, provider } = await callProviderWithFallback(messages, preferredModel, errors);

  try {
    const result = parseAiJson(content);
    result.model_used = provider.name;
    return result;
  } catch (e) {
    throw new Error(
      `AI(${provider.name}) returned unparseable JSON: ${content.slice(0, 300)}\nErrors: ${errors.join("; ")}`
    );
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET — list all saved rules (admin only); ?format=json|csv → download
  if (req.method === "GET") {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const rows = await many<{
      tld: string; grace_period_days: number; redemption_period_days: number;
      pending_delete_days: number; total_release_days: number; source_url: string | null;
      confidence: string; drop_hour: number | null; drop_minute: number | null;
      drop_second: number | null; drop_timezone: string | null; pre_expiry_days: number | null;
      scraped_at: string | null; updated_at: string; model_used: string | null;
      ai_reasoning: string | null;
    }>(
      `SELECT tld, grace_period_days, redemption_period_days, pending_delete_days,
              grace_period_days + redemption_period_days + pending_delete_days AS total_release_days,
              source_url, confidence,
              drop_hour, drop_minute, drop_second, drop_timezone, pre_expiry_days,
              scraped_at, updated_at, model_used, ai_reasoning
       FROM tld_rules ORDER BY tld`
    );

    const format = req.query.format as string | undefined;

    if (format === "json") {
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tld-rules-${date}.json"`);
      return res.json({
        generated_at: new Date().toISOString(),
        count: rows.length,
        source: "x.rw tld_rules DB",
        rules: Object.fromEntries(rows.map((r) => [r.tld, r])),
      });
    }

    if (format === "csv") {
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tld-rules-${date}.csv"`);
      const header = "tld,grace_period_days,redemption_period_days,pending_delete_days,total_release_days,drop_hour,drop_minute,drop_second,drop_timezone,pre_expiry_days,confidence,source_url,scraped_at";
      const lines = rows.map((r) =>
        [r.tld, r.grace_period_days, r.redemption_period_days, r.pending_delete_days,
         r.total_release_days, r.drop_hour ?? "", r.drop_minute ?? "", r.drop_second ?? "",
         r.drop_timezone ?? "", r.pre_expiry_days ?? "", r.confidence,
         `"${r.source_url ?? ""}"`, r.scraped_at ?? ""].join(",")
      );
      return res.send([header, ...lines].join("\n"));
    }

    return res.json({ rules: rows });
  }

  // POST — scrape + AI extract + save
  if (req.method === "POST") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { tld, source_url, force, model } = req.body as {
      tld?: string;
      source_url?: string;
      force?: boolean;
      model?: string;
    };
    if (!tld) {
      return res.status(400).json({ error: "tld is required" });
    }
    const cleanTld = tld.toLowerCase().replace(/^\./, "");
    // Default to IANA root-db page if no URL supplied
    const cleanUrl = (source_url ?? "").trim() ||
      `https://www.iana.org/domains/root/db/${cleanTld}.html`;

    // ── Freshness check ───────────────────────────────────────────────────
    // ccTLD (2-letter) = 60-day validity; gTLD = 180-day validity (stable).
    // Skip re-scraping if data is still fresh, unless force=true.
    if (!force) {
      const existing = await one<{ scraped_at: Date | null; grace_period_days: number; redemption_period_days: number; pending_delete_days: number; drop_hour: number | null; drop_timezone: string | null }>(
        `SELECT scraped_at, grace_period_days, redemption_period_days, pending_delete_days,
                drop_hour, drop_timezone
         FROM tld_rules WHERE tld = $1`,
        [cleanTld]
      ).catch(() => null);

      if (existing?.scraped_at) {
        const isCcTld = cleanTld.length === 2;
        const validityDays = isCcTld ? 60 : 180;
        const freshUntil = new Date(existing.scraped_at.getTime() + validityDays * 86_400_000);
        if (freshUntil > new Date()) {
          return res.status(200).json({
            skipped: true,
            tld: cleanTld,
            reason: "data_fresh",
            fresh_until: freshUntil.toISOString(),
            grace_period_days: existing.grace_period_days,
            redemption_period_days: existing.redemption_period_days,
            pending_delete_days: existing.pending_delete_days,
            drop_hour: existing.drop_hour,
            drop_timezone: existing.drop_timezone,
          });
        }
      }
    }

    // Rate limit (anti-spam: 1 scrape per TLD per hour)
    const allowed = await checkRateLimit(cleanTld);
    if (!allowed) {
      return res.status(429).json({
        error: `Rate limited: .${cleanTld} was already queried recently. Try again later.`,
      });
    }

    try {
      // 1. Scrape page (smart URL discovery: IANA → registry lifecycle page)
      const { text: pageText, finalUrl } = await fetchPageText(cleanUrl);
      if (!pageText || pageText.length < 50) {
        return res
          .status(422)
          .json({ error: "Could not extract meaningful text from the page" });
      }

      // 2. AI extraction with multi-model fallback
      const extracted = await extractWithAI(cleanTld, pageText, finalUrl, model);

      // 3. Save to DB
      await run(
        `INSERT INTO tld_rules
           (tld, grace_period_days, redemption_period_days, pending_delete_days,
            source_url, confidence, raw_excerpt, ai_reasoning, model_used,
            drop_hour, drop_minute, drop_second, drop_timezone, pre_expiry_days,
            scraped_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'ai',$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
         ON CONFLICT (tld) DO UPDATE SET
           grace_period_days      = EXCLUDED.grace_period_days,
           redemption_period_days = EXCLUDED.redemption_period_days,
           pending_delete_days    = EXCLUDED.pending_delete_days,
           source_url             = EXCLUDED.source_url,
           confidence             = 'ai',
           raw_excerpt            = EXCLUDED.raw_excerpt,
           ai_reasoning           = EXCLUDED.ai_reasoning,
           model_used             = EXCLUDED.model_used,
           drop_hour              = EXCLUDED.drop_hour,
           drop_minute            = EXCLUDED.drop_minute,
           drop_second            = EXCLUDED.drop_second,
           drop_timezone          = EXCLUDED.drop_timezone,
           pre_expiry_days        = EXCLUDED.pre_expiry_days,
           scraped_at             = NOW(),
           updated_at             = NOW()`,
        [
          cleanTld,
          extracted.grace_period_days,
          extracted.redemption_period_days,
          extracted.pending_delete_days,
          finalUrl,
          pageText.slice(0, 1000),
          extracted.reasoning,
          extracted.model_used || null,
          extracted.drop_hour,
          extracted.drop_minute,
          extracted.drop_second,
          extracted.drop_timezone,
          extracted.pre_expiry_days,
        ]
      );

      const total_release_days =
        extracted.grace_period_days +
        extracted.redemption_period_days +
        extracted.pending_delete_days;

      // ── Also persist to local JSON file (dual storage / backup) ──────────
      updateLocalCache(cleanTld, {
        grace_period_days: extracted.grace_period_days,
        redemption_period_days: extracted.redemption_period_days,
        pending_delete_days: extracted.pending_delete_days,
        total_release_days,
        drop_hour: extracted.drop_hour,
        drop_minute: extracted.drop_minute,
        drop_second: extracted.drop_second,
        drop_timezone: extracted.drop_timezone,
        pre_expiry_days: extracted.pre_expiry_days,
        confidence: "ai",
        source_url: finalUrl,
        reasoning: extracted.reasoning,
      });

      return res.json({
        ok: true,
        tld: cleanTld,
        ...extracted,
        total_release_days,
        source_url: finalUrl,
        source_url_requested: cleanUrl,
        has_lifecycle_info: hasLifecycleInfo(pageText),
      });
    } catch (err: any) {
      // Release the rate-limit token on error so retries are possible
      deleteRedisValue(RATE_LIMIT_KEY(cleanTld)).catch(() => {});
      return res.status(500).json({ error: err.message ?? "Unknown error" });
    }
  }

  // DELETE — remove a rule
  if (req.method === "DELETE") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { tld } = req.body as { tld?: string };
    if (!tld) return res.status(400).json({ error: "tld is required" });
    const cleanTld = tld.toLowerCase().replace(/^\./, "");
    await run("DELETE FROM tld_rules WHERE tld=$1", [cleanTld]);
    // Also clear the raw-page scrape cache so a fresh re-scrape fetches live data
    deleteRedisValue(SCRAPE_CACHE_KEY(
      `https://www.iana.org/domains/root/db/${cleanTld}.html`
    )).catch(() => {});
    return res.json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
