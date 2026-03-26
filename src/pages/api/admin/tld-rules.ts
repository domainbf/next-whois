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

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY ?? "";

// Redis keys
const RATE_LIMIT_KEY = (tld: string) => `tld_rules_rl:${tld}`;
const SCRAPE_CACHE_KEY = (url: string) =>
  `tld_rules_scrape:${Buffer.from(url).toString("base64").slice(0, 60)}`;

// TTLs
const RATE_LIMIT_TTL_S = 60 * 60;     // 1 request per TLD per hour
const SCRAPE_CACHE_TTL_S = 60 * 60 * 6; // raw page text cached 6 h

// ─── Rate limiting ────────────────────────────────────────────────────────────
async function checkRateLimit(tld: string): Promise<boolean> {
  if (!isRedisAvailable()) return true; // skip if no Redis
  const key = RATE_LIMIT_KEY(tld);
  const val = await getRedisValue(key);
  if (val) return false;
  await setRedisValue(key, "1", RATE_LIMIT_TTL_S);
  return true;
}

// ─── Fetch & clean page text ─────────────────────────────────────────────────
async function fetchPageText(url: string): Promise<string> {
  // Check cache first
  const cacheKey = SCRAPE_CACHE_KEY(url);
  if (isRedisAvailable()) {
    const cached = await getRedisValue(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let text = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; next-whois-ui/1.0; domain-lifecycle-crawler)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    // Remove noise
    $("script,style,nav,header,footer,noscript,iframe,svg").remove();
    text = ($("main,article,.content,#content,body").first().text() ||
      $("body").text())
      .replace(/\s{3,}/g, "\n")
      .replace(/\n{4,}/g, "\n\n")
      .trim()
      .slice(0, 6000); // keep first 6000 chars for AI
  } finally {
    clearTimeout(timer);
  }

  if (text && isRedisAvailable()) {
    await setRedisValue(cacheKey, text, SCRAPE_CACHE_TTL_S);
  }
  return text;
}

// ─── GLM-4-Flash AI extraction ────────────────────────────────────────────────
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
}

async function extractWithAI(
  tld: string,
  pageText: string,
  sourceUrl: string
): Promise<ExtractedLifecycle | null> {
  if (!ZHIPU_API_KEY) throw new Error("ZHIPU_API_KEY not configured");

  const systemPrompt = `你是域名注册局政策专家。从注册局官网文字中精准提取以下字段：

1. grace_period_days — 宽限期天数（域名过期后可续费，grace period）
2. redemption_period_days — 赎回期天数（RGP，redemption grace period）
3. pending_delete_days — 待删除期天数（pending delete/purge period）
4. pre_expiry_days — 注册局在到期日【之前】多少天开始删除流程（如 .nl 提前3天、.in 提前30天）；若无此规定填0
5. drop_hour — 域名释放/删除的具体时刻（小时，0-23，UTC换算后）；若页面未提及填null
6. drop_minute — 释放时刻的分钟（0-59）；未知填null
7. drop_second — 释放时刻的秒（0-59）；未知填null
8. drop_timezone — 释放时刻的原始时区（IANA格式，如 Europe/Berlin、Asia/Shanghai、UTC）；未知填null

找不到的天数字段用行业默认值（grace=30, redemption=30, pending_delete=5）。

严格输出JSON，不加任何额外文字或代码块：
{"grace_period_days":30,"redemption_period_days":30,"pending_delete_days":5,"pre_expiry_days":0,"drop_hour":null,"drop_minute":null,"drop_second":null,"drop_timezone":null,"reasoning":"数据来源说明"}`;

  const userMessage = `TLD: .${tld}\n来源页面: ${sourceUrl}\n\n页面内容（节选）：\n${pageText}`;

  const res = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GLM API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string =
    json?.choices?.[0]?.message?.content?.trim() ?? "";

  // Strip any markdown wrapper the model might add anyway
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
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
      reasoning: String(parsed.reasoning || "").slice(0, 500),
    };
  } catch {
    throw new Error(`AI returned unparseable JSON: ${cleaned.slice(0, 300)}`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET — list all saved rules (admin only)
  if (req.method === "GET") {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const rows = await many(
      `SELECT tld, grace_period_days, redemption_period_days, pending_delete_days,
              total_release_days, source_url, confidence,
              drop_hour, drop_minute, drop_second, drop_timezone, pre_expiry_days,
              scraped_at, updated_at
       FROM tld_rules ORDER BY tld`
    );
    return res.json({ rules: rows });
  }

  // POST — scrape + AI extract + save
  if (req.method === "POST") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { tld, source_url } = req.body as {
      tld?: string;
      source_url?: string;
    };
    if (!tld) {
      return res.status(400).json({ error: "tld is required" });
    }
    const cleanTld = tld.toLowerCase().replace(/^\./, "");
    // Default to IANA root-db page if no URL supplied
    const cleanUrl = (source_url ?? "").trim() ||
      `https://www.iana.org/domains/root/db/${cleanTld}.html`;

    // Rate limit
    const allowed = await checkRateLimit(cleanTld);
    if (!allowed) {
      return res.status(429).json({
        error: `Rate limited: .${cleanTld} was already queried recently. Try again later.`,
      });
    }

    try {
      // 1. Scrape page
      const pageText = await fetchPageText(cleanUrl);
      if (!pageText || pageText.length < 50) {
        return res
          .status(422)
          .json({ error: "Could not extract meaningful text from the page" });
      }

      // 2. AI extraction
      const extracted = await extractWithAI(cleanTld, pageText, cleanUrl);
      if (!extracted) {
        return res.status(500).json({ error: "AI extraction failed" });
      }

      // 3. Save to DB (includes new drop-time and pre_expiry_days fields)
      await run(
        `INSERT INTO tld_rules
           (tld, grace_period_days, redemption_period_days, pending_delete_days,
            source_url, confidence, raw_excerpt, ai_reasoning,
            drop_hour, drop_minute, drop_second, drop_timezone, pre_expiry_days,
            scraped_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'ai',$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
         ON CONFLICT (tld) DO UPDATE SET
           grace_period_days      = EXCLUDED.grace_period_days,
           redemption_period_days = EXCLUDED.redemption_period_days,
           pending_delete_days    = EXCLUDED.pending_delete_days,
           source_url             = EXCLUDED.source_url,
           confidence             = 'ai',
           raw_excerpt            = EXCLUDED.raw_excerpt,
           ai_reasoning           = EXCLUDED.ai_reasoning,
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
          cleanUrl,
          pageText.slice(0, 1000),
          extracted.reasoning,
          extracted.drop_hour,
          extracted.drop_minute,
          extracted.drop_second,
          extracted.drop_timezone,
          extracted.pre_expiry_days,
        ]
      );

      return res.json({
        ok: true,
        tld: cleanTld,
        ...extracted,
        total_release_days:
          extracted.grace_period_days +
          extracted.redemption_period_days +
          extracted.pending_delete_days,
        source_url: cleanUrl,
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
