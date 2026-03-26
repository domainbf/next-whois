/**
 * Standalone batch scraper for TLD lifecycle rules.
 * Runs outside of Next.js HTTP layer — connects to DB directly.
 *
 * Usage:
 *   node scripts/batch-scrape.mjs [--tld jp] [--type cc|gtld|all] [--force] [--concurrency 2]
 *
 * Environment vars required:
 *   POSTGRES_URL   — PostgreSQL connection string
 *   ZHIPU_API_KEY  — (or any other AI provider key in env)
 */

import pg from "pg";
import * as cheerio from "cheerio";

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const SINGLE_TLD  = getArg("--tld");
const TYPE        = getArg("--type") ?? "cc";   // cc | gtld | all
const FORCE       = hasFlag("--force");
const CONCURRENCY = parseInt(getArg("--concurrency") ?? "1");
const DELAY_MS    = parseInt(getArg("--delay") ?? "3000");  // ms between TLDs
const DRY_RUN     = hasFlag("--dry-run");

// ── Database ─────────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function dbOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] ?? null;
}
async function dbRun(sql, params = []) {
  await pool.query(sql, params);
}

// ── Lifecycle keywords ────────────────────────────────────────────────────────
const LIFECYCLE_KEYWORDS = [
  "grace period","redemption period","pending delete","pendingdelete",
  "rgp","autorenew grace","auto-renew grace","registry grace period",
  "add grace period","drop time","drop date","drop catch",
  "lifecycle","life cycle","domain lifecycle",
  "expiry period","expiration period","renewal grace period",
  "domain deletion","domain expiration","domain expiry","restore period","redemption grace",
  "宽限期","赎回期","待删除","掉落时间","释放时间","删除时间","续费宽限","到期删除","赎回","注册局宽限",
  "ライフサイクル","猶予期間","回復期間","削除待ち","更新猶予","ドメイン有効期限","削除期間",
  "갱신유예","복구기간","삭제대기","라이프사이클",
  "löschfrist","kündigungsfrist","löschantrag","wiederherstellungsphase","domainlöschung","freigabephase",
  "période de grâce","rédemption","suppression en attente","cycle de vie","durée de grâce",
  "период льготы","период выкупа",
];
const LIFECYCLE_LINK_KEYWORDS = [
  "lifecycle","life-cycle","grace","redemption","renewal","expir",
  "policy","policies","domain-rules","domain-policy","rgp","purge","delete",
  "lebenszyklus","lösch","kündig","cycle","suppression","rédem",
  "ライフサイクル","猶予","削除","更新","有効期限","ルール",
  "라이프사이클","갱신","삭제",
  "待删","宽限","赎回","续费","政策","规则","生命周期","到期",
  "faq","help","support","registrant","domain-name","about",
];
const LIFECYCLE_PATHS = [
  "/domain-lifecycle","/domains/lifecycle","/en/domains/lifecycle",
  "/lifecycle","/en/lifecycle","/policies/lifecycle",
  "/domain-names/lifecycle","/support/lifecycle","/faq/lifecycle",
  "/about/lifecycle","/en/domain-lifecycle","/domains/domain-lifecycle",
  "/en/domains/domain-lifecycle","/registrar/lifecycle",
  "/policies","/en/policies","/domains/policies","/domains",
  "/en/domains","/en/domain-names","/domain-names",
  "/registrar-information","/registrar-resources",
  "/faq","/en/faq","/help","/en/help","/support","/en/support",
  "/en/the-dot-de-domain","/en/domains/conditions","/domainrichtlinien","/richtlinien",
  "/en/domain-names-and-support/managing-a-domain-name","/en/domain-names-and-support",
  "/for-registrants/au-domain-administration","/domain-names","/registrants",
];

function hasLifecycleInfo(text) {
  const lower = text.toLowerCase();
  return LIFECYCLE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}
function hasLifecycleLinkKeyword(href, text) {
  const combined = `${href} ${text}`.toLowerCase();
  return LIFECYCLE_LINK_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

// ── HTTP fetch helpers ────────────────────────────────────────────────────────
async function fetchRawHtml(url, timeoutMs = 15000) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; next-whois-ui/1.0; domain-lifecycle-crawler)",
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "en,zh;q=0.9,ja;q=0.8,de;q=0.7,fr;q=0.6,ko;q=0.5",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

async function fetchViaJina(url, timeoutMs = 25000) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(jinaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; next-whois-ui/1.0)",
      Accept: "text/plain,text/markdown,*/*",
      "X-No-Cache": "true",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Jina HTTP ${res.status} for ${url}`);
  const text = await res.text();
  if (!text || text.length < 100) throw new Error(`Jina returned empty content for ${url}`);
  return text;
}

function extractText(html, maxChars = 10000) {
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe,svg,button,form").remove();
  const mainEl = $("main,article,[class*=content],[id*=content],.policy,.lifecycle,.domain-info,body").first();
  const rawText = (mainEl.text() || $("body").text())
    .replace(/\s{3,}/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
  if (rawText.length <= maxChars) return rawText;
  const lines = rawText.split("\n");
  const relevantLines = [], otherLines = [];
  for (const line of lines) {
    if (LIFECYCLE_KEYWORDS.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
      relevantLines.push(line);
    } else { otherLines.push(line); }
  }
  const priority = relevantLines.join("\n").slice(0, Math.floor(maxChars * 0.7));
  const rest = otherLines.join("\n").slice(0, maxChars - priority.length);
  return (priority + "\n\n" + rest).trim().slice(0, maxChars);
}

function extractRegistryUrlFromHtml(html) {
  const blockMatch = html.match(
    /URL for registration services[\s\S]{0,200}?href=["']?(https?:\/\/[^"'\s>]+)/i
  );
  if (blockMatch) return blockMatch[1].replace(/\/$/, "");
  const urlMatch = html.match(
    /URL for registration services[^\n]*\n?\s*(https?:\/\/[^\s\n<>]+)/i
  );
  if (urlMatch) return urlMatch[1].replace(/\/$/, "").replace(/[)\]>]+$/, "");
  return null;
}

function extractLifecycleLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const base = (() => { try { return new URL(baseUrl).origin; } catch { return ""; } })();
  const seen = new Set(), links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (!hasLifecycleLinkKeyword(href, text)) return;
    let abs;
    try { abs = new URL(href, baseUrl).href; } catch { return; }
    if (!abs.startsWith(base) || seen.has(abs)) return;
    seen.add(abs);
    links.push(abs);
    if (links.length >= 20) return false;
  });
  return links;
}

function extractLifecycleLinksFromMarkdown(markdown, baseUrl) {
  const base = (() => { try { return new URL(baseUrl).origin; } catch { return ""; } })();
  const seen = new Set(), links = [];
  const re = /\[([^\]]{1,80})\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const [, text, href] = m;
    if (!hasLifecycleLinkKeyword(href, text) || !href.startsWith(base) || seen.has(href)) continue;
    seen.add(href);
    links.push(href);
    if (links.length >= 15) break;
  }
  return links;
}

async function findRegistryLifecyclePage(registryUrl) {
  const base = (() => { try { return new URL(registryUrl).origin; } catch { return ""; } })();

  // Strategy 1-3: static HTML
  try {
    const html = await fetchRawHtml(registryUrl);
    const text = extractText(html);
    if (hasLifecycleInfo(text)) return { url: registryUrl, text };

    for (const path of LIFECYCLE_PATHS) {
      const url = base + path;
      try {
        const pHtml = await fetchRawHtml(url, 10000);
        const pText = extractText(pHtml);
        if (hasLifecycleInfo(pText)) return { url, text: pText };
      } catch { /**/ }
    }

    const linkedUrls = extractLifecycleLinks(html, registryUrl);
    for (const linkedUrl of linkedUrls) {
      try {
        const lHtml = await fetchRawHtml(linkedUrl, 12000);
        const lText = extractText(lHtml);
        if (hasLifecycleInfo(lText)) return { url: linkedUrl, text: lText };
        const deepLinks = extractLifecycleLinks(lHtml, linkedUrl).slice(0, 5);
        for (const deepUrl of deepLinks) {
          if (deepUrl === linkedUrl || deepUrl === registryUrl) continue;
          try {
            const dHtml = await fetchRawHtml(deepUrl, 10000);
            const dText = extractText(dHtml);
            if (hasLifecycleInfo(dText)) return { url: deepUrl, text: dText };
          } catch { /**/ }
        }
      } catch { /**/ }
    }
  } catch { /**/ }

  // Strategy 4: Jina Reader (JS-rendered sites)
  try {
    const jinaMarkdown = await fetchViaJina(registryUrl);
    if (hasLifecycleInfo(jinaMarkdown)) return { url: registryUrl, text: jinaMarkdown.slice(0, 10000) };

    const jinaLinks = extractLifecycleLinksFromMarkdown(jinaMarkdown, registryUrl);
    for (const jLink of jinaLinks) {
      try {
        const jText = await fetchViaJina(jLink);
        if (hasLifecycleInfo(jText)) return { url: jLink, text: jText.slice(0, 10000) };
        const deepJLinks = extractLifecycleLinksFromMarkdown(jText, jLink).slice(0, 3);
        for (const djLink of deepJLinks) {
          if (djLink === jLink || djLink === registryUrl) continue;
          try {
            const djText = await fetchViaJina(djLink);
            if (hasLifecycleInfo(djText)) return { url: djLink, text: djText.slice(0, 10000) };
          } catch { /**/ }
        }
      } catch { /**/ }
    }

    for (const path of LIFECYCLE_PATHS.slice(0, 20)) {
      const url = base + path;
      try {
        const pText = await fetchViaJina(url);
        if (hasLifecycleInfo(pText)) return { url, text: pText.slice(0, 10000) };
      } catch { /**/ }
    }
  } catch { /**/ }

  return null;
}

async function fetchPageText(url) {
  let html = await fetchRawHtml(url);
  const ianaText = extractText(html);
  let text = ianaText, finalUrl = url;

  if (url.includes("iana.org")) {
    const registryUrl = extractRegistryUrlFromHtml(html);
    if (registryUrl) {
      const found = await findRegistryLifecyclePage(registryUrl).catch(() => null);
      if (found) {
        const hasKw = hasLifecycleInfo(found.text);
        const hint = hasKw ? "" : "\n[注意：本页未检测到标准生命周期关键词，但仍尝试从上下文提取数据，如无法提取请使用行业默认值]\n";
        text = `[IANA 页面 — 注册局信息]\n${ianaText.slice(0, 1500)}\n\n[注册局官网 ${found.url}]${hint}\n${found.text.slice(0, 7500)}`;
        finalUrl = found.url;
      } else {
        text = `[IANA 页面 — 注册局信息，无注册局官网数据]\n${ianaText}\n[注意：未能找到注册局生命周期政策页，请根据TLD类型判断是否使用行业默认值]`;
      }
    }
  }
  return { text, finalUrl };
}

// ── AI extraction ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `你是域名注册局政策专家，精通ICANN及各国注册局的域名生命周期规则。
从注册局官网文字中精准提取以下字段（英文/中文/日文/德文/法文/韩文页面均可）：

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

async function callAI(messages) {
  const providers = [
    { key: process.env.ZHIPU_API_KEY, endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4-flashx", name: "GLM-4-FlashX" },
    { key: process.env.ZHIPU_API_KEY, endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4-flash", name: "GLM-4-Flash" },
    { key: process.env.GROQ_API_KEY, endpoint: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", name: "Llama-3.3-70B" },
    { key: process.env.GEMINI_API_KEY, endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.0-flash", name: "Gemini-2.0-Flash" },
    { key: process.env.DEEPSEEK_API_KEY, endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat", name: "DeepSeek-V3" },
    { key: process.env.DASHSCOPE_API_KEY, endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-turbo", name: "Qwen-Turbo" },
    { key: process.env.MOONSHOT_API_KEY, endpoint: "https://api.moonshot.cn/v1/chat/completions", model: "moonshot-v1-8k", name: "Kimi-8k" },
  ].filter(p => p.key);

  for (const p of providers) {
    try {
      const res = await fetch(p.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.1, max_tokens: 600 }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) continue;
      return { content, name: p.name };
    } catch { /**/ }
  }
  throw new Error("All AI providers failed");
}

function parseAiJson(content) {
  const cleaned = content
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "")
    .replace(/^[^{]*({[\s\S]*})[^}]*$/, "$1").trim();
  const parsed = JSON.parse(cleaned);
  const toInt = (v, min = 0) => Math.max(min, parseInt(String(v)) || 0);
  const toNullInt = (v, lo, hi) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseInt(String(v));
    return isNaN(n) ? null : Math.min(hi, Math.max(lo, n));
  };
  return {
    grace_period_days: toInt(parsed.grace_period_days),
    redemption_period_days: toInt(parsed.redemption_period_days),
    pending_delete_days: toInt(parsed.pending_delete_days),
    pre_expiry_days: toNullInt(parsed.pre_expiry_days, 0, 365),
    drop_hour: toNullInt(parsed.drop_hour, 0, 23),
    drop_minute: toNullInt(parsed.drop_minute, 0, 59),
    drop_second: toNullInt(parsed.drop_second, 0, 59),
    drop_timezone: typeof parsed.drop_timezone === "string" && parsed.drop_timezone ? parsed.drop_timezone.slice(0, 50) : null,
    reasoning: String(parsed.reasoning || "").slice(0, 600),
  };
}

async function extractWithAI(tld, pageText, sourceUrl) {
  const pageSnippet = pageText.slice(0, 6000);
  const userMessage = `TLD: .${tld}\n来源页面: ${sourceUrl}\n\n页面内容：\n${pageSnippet}`;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }];
  const { content, name } = await callAI(messages);
  const result = parseAiJson(content);
  result.model_used = name;
  return result;
}

// ── Save to DB ────────────────────────────────────────────────────────────────
async function saveToDb(tld, extracted, finalUrl, pageText) {
  await dbRun(
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
      tld, extracted.grace_period_days, extracted.redemption_period_days, extracted.pending_delete_days,
      finalUrl, pageText.slice(0, 1000), extracted.reasoning, extracted.model_used || null,
      extracted.drop_hour, extracted.drop_minute, extracted.drop_second, extracted.drop_timezone, extracted.pre_expiry_days,
    ]
  );
}

// ── Progress display ──────────────────────────────────────────────────────────
let stats = { done: 0, skip: 0, err: 0, total: 0 };
function log(tld, status, msg = "") {
  const icon = { ok: "✅", skip: "⏭ ", err: "❌", info: "ℹ️ ", warn: "⚠️ " }[status] ?? "  ";
  const pct = stats.total ? `[${stats.done + stats.skip + stats.err}/${stats.total}]` : "";
  console.log(`${pct} ${icon} .${tld.padEnd(8)} ${msg}`);
}

// ── Scrape single TLD ─────────────────────────────────────────────────────────
async function scrapeTld(tld, sourceUrl = null) {
  const url = sourceUrl || `https://www.iana.org/domains/root/db/${tld}.html`;

  // Skip manually-edited records unless --force
  if (!FORCE) {
    const existing = await dbOne(
      `SELECT scraped_at, COALESCE(manually_edited, FALSE) AS manually_edited
       FROM tld_rules WHERE tld = $1`,
      [tld]
    ).catch(() => null);

    if (existing?.manually_edited) {
      stats.skip++;
      log(tld, "skip", "手动修改，已跳过");
      return;
    }
    if (existing?.scraped_at) {
      const isCcTld = tld.length === 2;
      const validityDays = isCcTld ? 60 : 180;
      const freshUntil = new Date(existing.scraped_at).getTime() + validityDays * 86400000;
      if (Date.now() < freshUntil) {
        stats.skip++;
        log(tld, "skip", `数据新鲜至 ${new Date(freshUntil).toISOString().slice(0, 10)}`);
        return;
      }
    }
  }

  if (DRY_RUN) {
    stats.done++;
    log(tld, "ok", "[DRY RUN] 跳过实际抓取");
    return;
  }

  try {
    const { text: pageText, finalUrl } = await fetchPageText(url);
    if (!pageText || pageText.length < 50) throw new Error("页面内容过短");

    const extracted = await extractWithAI(tld, pageText, finalUrl);
    await saveToDb(tld, extracted, finalUrl, pageText);

    const total = extracted.grace_period_days + extracted.redemption_period_days + extracted.pending_delete_days;
    stats.done++;
    log(tld, "ok",
      `宽限${extracted.grace_period_days}d 赎回${extracted.redemption_period_days}d 待删${extracted.pending_delete_days}d =${total}d` +
      (extracted.drop_hour !== null ? ` 掉落${String(extracted.drop_hour).padStart(2,"0")}:${String(extracted.drop_minute??0).padStart(2,"0")} ${extracted.drop_timezone??'UTC'}` : "") +
      ` [${extracted.model_used}]`
    );
  } catch (err) {
    stats.err++;
    log(tld, "err", err.message.slice(0, 100));
  }
}

// ── TLD lists ─────────────────────────────────────────────────────────────────
const CC_TLDS = [
  "ac","ad","ae","af","ag","ai","al","am","ao","aq","ar","as","at","au","aw","ax","az",
  "ba","bb","bd","be","bf","bg","bh","bi","bj","bm","bn","bo","br","bs","bt","bw","by","bz",
  "ca","cc","cd","cf","cg","ch","ci","ck","cl","cm","cn","co","cr","cu","cv","cw","cx","cy","cz",
  "de","dj","dk","dm","do","dz",
  "ec","ee","eg","er","es","et","eu",
  "fi","fj","fk","fm","fo","fr",
  "ga","gd","ge","gf","gg","gh","gi","gl","gm","gn","gp","gq","gr","gs","gt","gu","gw","gy",
  "hk","hm","hn","hr","ht","hu",
  "id","ie","il","im","in","io","iq","ir","is","it",
  "je","jm","jo","jp",
  "ke","kg","kh","ki","km","kn","kp","kr","kw","ky","kz",
  "la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly",
  "ma","mc","md","me","mg","mh","mk","ml","mm","mn","mo","mp","mq","mr","ms","mt","mu","mv","mw","mx","my","mz",
  "na","nc","ne","nf","ng","ni","nl","no","np","nr","nu","nz",
  "om",
  "pa","pe","pf","pg","ph","pk","pl","pm","pn","pr","ps","pt","pw","py",
  "qa",
  "re","ro","rs","ru","rw",
  "sa","sb","sc","sd","se","sg","sh","si","sk","sl","sm","sn","so","sr","ss","st","su","sv","sx","sy","sz",
  "tc","td","tf","tg","th","tj","tk","tl","tm","tn","to","tr","tt","tv","tw","tz",
  "ua","ug","uk","us","uy","uz",
  "va","vc","ve","vg","vi","vn","vu",
  "wf","ws",
  "ye","yt",
  "za","zm","zw",
];

// Fetch full gTLD list from IANA
async function fetchGtldList() {
  try {
    const html = await fetchRawHtml("https://www.iana.org/domains/root/db", 20000);
    const $ = cheerio.load(html);
    const tlds = [];
    $("table#tld-table tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (!cells.eq(1).text().trim().toLowerCase().includes("country")) {
        const tld = cells.eq(0).text().trim().replace(/^\./, "").toLowerCase();
        if (tld && !tld.includes(" ") && !tld.startsWith("xn--")) tlds.push(tld);
      }
    });
    return tlds.filter(t => t.length > 2); // only gTLDs (3+ chars)
  } catch (e) {
    console.warn("⚠️  无法获取 IANA gTLD 列表，使用内置列表:", e.message);
    return ["com","net","org","info","biz","xyz","app","dev","shop","blog","tech","online","site","store"];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          TLD 生命周期批量爬取器  (batch-scrape.mjs)         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (!process.env.POSTGRES_URL && !process.env.xrw_REDIS_URL) {
    console.error("❌ 需要 POSTGRES_URL 环境变量");
    process.exit(1);
  }

  const aiKeys = ["ZHIPU_API_KEY","GROQ_API_KEY","GEMINI_API_KEY","DEEPSEEK_API_KEY","DASHSCOPE_API_KEY","MOONSHOT_API_KEY"];
  const configured = aiKeys.filter(k => process.env[k]);
  if (configured.length === 0) {
    console.error("❌ 至少需要一个 AI 提供商的 API Key");
    process.exit(1);
  }
  console.log(`✅ AI 提供商: ${configured.join(", ")}`);
  console.log(`📋 类型: ${TYPE}  强制: ${FORCE}  并发: ${CONCURRENCY}  间隔: ${DELAY_MS}ms  DRY_RUN: ${DRY_RUN}`);

  let tldList = [];
  if (SINGLE_TLD) {
    tldList = [SINGLE_TLD.toLowerCase().replace(/^\./, "")];
  } else if (TYPE === "cc" || TYPE === "all") {
    tldList.push(...CC_TLDS);
  }
  if (TYPE === "gtld" || TYPE === "all") {
    console.log("⏳ 获取 IANA gTLD 完整列表…");
    const gtlds = await fetchGtldList();
    tldList.push(...gtlds);
    console.log(`📊 gTLD: ${gtlds.length} 个`);
  }

  // Dedup
  tldList = [...new Set(tldList)];
  stats.total = tldList.length;

  console.log(`\n🚀 开始抓取 ${tldList.length} 个 TLD (${TYPE})…\n`);
  if (FORCE) console.log("⚠️  --force 模式：忽略新鲜度检查，覆盖已有数据\n");

  const startTime = Date.now();

  // Process in batches of CONCURRENCY
  for (let i = 0; i < tldList.length; i += CONCURRENCY) {
    const batch = tldList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(tld => scrapeTld(tld)));

    // Delay between TLDs to be polite to remote servers
    if (i + CONCURRENCY < tldList.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n${"─".repeat(64)}`);
  console.log(`✅ 完成: ${stats.done}  ⏭  跳过: ${stats.skip}  ❌ 失败: ${stats.err}`);
  console.log(`⏱  耗时: ${Math.floor(elapsed/60)}分${elapsed%60}秒 (${tldList.length} 个 TLD)`);

  await pool.end();
}

main().catch(e => { console.error("Fatal:", e); pool.end(); process.exit(1); });
