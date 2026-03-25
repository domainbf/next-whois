import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { one, run, many } from "@/lib/db-query";
import {
  redis,
  isRedisAvailable,
  getRedisValue,
  setRedisValue,
} from "@/lib/server/redis";
import * as cheerio from "cheerio";

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY ?? "";

// Redis keys
const RATE_LIMIT_KEY = (tld: string) => `tld_rules_rl:${tld}`;
const SCRAPE_CACHE_KEY = (url: string) =>
  `tld_rules_scrape:${Buffer.from(url).toString("base64").slice(0, 60)}`;

// TTLs
const CACHE_TTL_S = 60 * 60 * 24 * 7; // 7 days for scraped+AI result
const RATE_LIMIT_TTL_S = 60 * 60; // 1 request per TLD per hour
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
  reasoning: string;
}

async function extractWithAI(
  tld: string,
  pageText: string,
  sourceUrl: string
): Promise<ExtractedLifecycle | null> {
  if (!ZHIPU_API_KEY) throw new Error("ZHIPU_API_KEY not configured");

  const systemPrompt = `你是域名注册局政策专家。用户会提供一段来自域名注册局官网的文字，你需要从中精准提取以下4个数字（单位：天）：
1. grace_period_days — 宽限期（域名过期后可正常续费的天数，也叫 grace period / renewal grace period）
2. redemption_period_days — 赎回期（宽限期后的赎回窗口，也叫 redemption grace period / RGP）
3. pending_delete_days — 待删除期（赎回期后待删除的天数，也叫 pending delete / purge period）
4. 如果页面中找不到某个数字，使用行业默认值（grace=30, redemption=30, pending_delete=5），并在reasoning中说明。

严格只输出以下格式的JSON（不要加 markdown 代码块，不要任何额外文字）：
{"grace_period_days":30,"redemption_period_days":30,"pending_delete_days":5,"reasoning":"简短说明数据来源或估算依据"}`;

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
        max_tokens: 300,
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
    return {
      grace_period_days: Math.max(0, parseInt(parsed.grace_period_days) || 0),
      redemption_period_days: Math.max(
        0,
        parseInt(parsed.redemption_period_days) || 0
      ),
      pending_delete_days: Math.max(
        0,
        parseInt(parsed.pending_delete_days) || 0
      ),
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
  // GET — list all saved rules
  if (req.method === "GET") {
    const rows = await many(
      `SELECT tld, grace_period_days, redemption_period_days, pending_delete_days,
              total_release_days, source_url, confidence, scraped_at, updated_at
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
    if (!tld || !source_url) {
      return res.status(400).json({ error: "tld and source_url are required" });
    }
    const cleanTld = tld.toLowerCase().replace(/^\./, "");
    const cleanUrl = source_url.trim();

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

      // 3. Save to DB
      await run(
        `INSERT INTO tld_rules
           (tld, grace_period_days, redemption_period_days, pending_delete_days,
            source_url, confidence, raw_excerpt, ai_reasoning, scraped_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'ai',$6,$7,NOW(),NOW())
         ON CONFLICT (tld) DO UPDATE SET
           grace_period_days      = EXCLUDED.grace_period_days,
           redemption_period_days = EXCLUDED.redemption_period_days,
           pending_delete_days    = EXCLUDED.pending_delete_days,
           source_url             = EXCLUDED.source_url,
           confidence             = 'ai',
           raw_excerpt            = EXCLUDED.raw_excerpt,
           ai_reasoning           = EXCLUDED.ai_reasoning,
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
        ]
      );

      // 4. Cache final result in Redis (7 days)
      if (isRedisAvailable()) {
        await setRedisValue(
          `tld_rules:${cleanTld}`,
          JSON.stringify(extracted),
          CACHE_TTL_S
        );
      }

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
      // Release rate limit token on error so retries are possible
      if (isRedisAvailable() && redis) {
        redis.del(RATE_LIMIT_KEY(cleanTld)).catch(() => {});
      }
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
    if (isRedisAvailable() && redis) {
      redis.del(`tld_rules:${cleanTld}`).catch(() => {});
    }
    return res.json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
}
