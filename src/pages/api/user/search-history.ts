import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import { many, one, run, isDbReady } from "@/lib/db-query";
import { scoreDomain, shouldAlertAdmin } from "@/lib/domain-value";
import { sendEmail, highValueAlertHtml, getSiteLabel } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { checkHotPrefix } from "@/lib/server/hot-prefix-cache";
import { analyzeDomainWithAi } from "@/lib/server/domain-value-ai";

const MAX_HISTORY   = 100;
const PAGE_SIZE     = 20;

// Retention by value tier (days)
const RETENTION: Record<string, number> = {
  high:     50,
  valuable: 20,
  normal:   10,
};

function computeValueTier(
  query: string,
  queryType: string,
  regStatus: string | null,
): "high" | "valuable" | "normal" {
  if (queryType !== "domain" || regStatus !== "unregistered") return "normal";
  const result = scoreDomain(query, queryType);
  if (!result) return "normal";
  if (result.score >= 55) return "high";
  if (result.score >= 35) return "valuable";
  return "normal";
}

async function maybeSendHighValueAlert(
  query: string,
  queryType: string,
  regStatus: string,
  checkedByEmail?: string | null,
) {
  const scoreResult = scoreDomain(query, queryType);
  const sld = query.lastIndexOf(".") > 0 ? query.substring(0, query.lastIndexOf(".")) : query;
  const hotPrefixMatch = await checkHotPrefix(sld).catch(() => null);

  const shouldAlert = shouldAlertAdmin(query, queryType, regStatus) || !!hotPrefixMatch;
  if (!shouldAlert) return;

  const recent = await one<{ count: string }>(
    `SELECT COUNT(*) AS count FROM search_history
     WHERE query = $1 AND reg_status = 'unregistered'
     AND created_at >= NOW() - INTERVAL '24 hours'`,
    [query],
  );
  if (parseInt(recent?.count ?? "0") > 0) return;

  if (!scoreResult) return;

  // Fetch AI summary for high-value / hot prefix domains
  let aiSummary: string | null = null;
  if (scoreResult.score >= 55 || hotPrefixMatch) {
    try {
      const aiResult = await Promise.race([
        analyzeDomainWithAi(query),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]) as Awaited<ReturnType<typeof analyzeDomainWithAi>> | null;
      if (aiResult && typeof aiResult === "object" && "summary" in aiResult) {
        aiSummary = (aiResult as { summary?: string }).summary ?? null;
      }
    } catch {
      // AI unavailable — proceed without it
    }
  }

  const siteName = await getSiteLabel().catch(() => "X.RW");
  const html = highValueAlertHtml({
    domain: query,
    score: scoreResult.score,
    tier: scoreResult.tier,
    reasons: scoreResult.reasons,
    isAlertKeyword: scoreResult.isAlertKeyword,
    isNumericOnly: scoreResult.isNumericOnly,
    checkedBy: checkedByEmail ?? null,
    breakdown: scoreResult.breakdown,
    hotPrefix: hotPrefixMatch ? {
      prefix: hotPrefixMatch.prefix.prefix,
      category: hotPrefixMatch.prefix.category,
      weight: hotPrefixMatch.prefix.weight,
      matchType: hotPrefixMatch.matchType,
      saleExamples: hotPrefixMatch.prefix.sale_examples,
      notes: hotPrefixMatch.prefix.notes,
    } : null,
    aiSummary,
    siteName,
  });

  const subjectPrefix = hotPrefixMatch
    ? "🔥 热门前缀可用"
    : scoreResult.isAlertKeyword
    ? "⚡ 特殊关键词可用"
    : "💎 高价值域名可用";

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${subjectPrefix}：${query}（评分 ${scoreResult.score}${hotPrefixMatch ? ` · 前缀:${hotPrefixMatch.prefix.prefix}` : ""}）`,
    html,
  }).catch(err => console.error("[high-value-alert]", err.message));
}

/** Delete records that have exceeded their tier-based retention period. */
async function pruneExpired(userId: string) {
  await run(
    `DELETE FROM search_history WHERE user_id = $1 AND (
       (value_tier = 'high'     AND created_at < NOW() - INTERVAL '50 days') OR
       (value_tier = 'valuable' AND created_at < NOW() - INTERVAL '20 days') OR
       ((value_tier = 'normal' OR value_tier IS NULL)
                                AND created_at < NOW() - INTERVAL '10 days')
     )`,
    [userId],
  );
}

/** Keep only the newest MAX_HISTORY records for this user. */
async function trimToLimit(userId: string) {
  const allRows = await many<{ id: string }>(
    "SELECT id FROM search_history WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  if (allRows.length > MAX_HISTORY) {
    const toDelete = allRows.slice(MAX_HISTORY).map((r) => r.id);
    await run(`DELETE FROM search_history WHERE id = ANY($1::varchar[])`, [toDelete]);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: "未登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "db unavailable" });

  const userEmail = (session?.user as any)?.email as string | undefined;

  // ── GET: paginated history ────────────────────────────────────────────────
  if (req.method === "GET") {
    const page  = Math.max(1, parseInt((req.query.page as string) || "1") || 1);
    const limit = PAGE_SIZE;
    const offset = (page - 1) * limit;

    const [rows, countRow] = await Promise.all([
      many(
        `SELECT id, query, query_type, created_at, reg_status, expiration_date,
                remaining_days, value_tier
         FROM search_history WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      one<{ count: string }>(
        "SELECT COUNT(*) AS count FROM search_history WHERE user_id = $1",
        [userId],
      ),
    ]);

    const total = parseInt(countRow?.count ?? "0");
    const pages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      history: rows.map((r) => ({
        id: r.id,
        query: r.query,
        queryType: r.query_type,
        timestamp: new Date(r.created_at).getTime(),
        regStatus: r.reg_status ?? "unknown",
        expirationDate: r.expiration_date ?? null,
        remainingDays: r.remaining_days ?? null,
        valueTier: r.value_tier ?? "normal",
      })),
      total,
      page,
      pages,
    });
  }

  // ── POST: insert one or bulk-sync ─────────────────────────────────────────
  if (req.method === "POST") {
    const { query, queryType, regStatus, expirationDate, remainingDays } = req.body;

    // Bulk sync from localStorage
    if (Array.isArray(req.body.records)) {
      const records: Array<{
        query: string;
        queryType: string;
        regStatus?: string;
        expirationDate?: string | null;
        remainingDays?: number | null;
        timestamp?: number;
      }> = req.body.records.slice(0, MAX_HISTORY);

      for (const rec of records) {
        const clean = (rec.query || "").trim().slice(0, 255);
        if (!clean) continue;
        const tier = computeValueTier(clean, rec.queryType ?? "domain", rec.regStatus ?? null);
        await run("DELETE FROM search_history WHERE user_id = $1 AND query = $2", [userId, clean]);
        const id = randomBytes(8).toString("hex");
        const createdAt = rec.timestamp ? new Date(rec.timestamp).toISOString() : new Date().toISOString();
        await run(
          `INSERT INTO search_history
             (id, user_id, query, query_type, reg_status, expiration_date, remaining_days, value_tier, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [id, userId, clean, rec.queryType ?? "domain", rec.regStatus ?? null,
           rec.expirationDate ?? null, rec.remainingDays ?? null, tier, createdAt],
        );
      }

      await pruneExpired(userId);
      await trimToLimit(userId);
      return res.status(200).json({ ok: true, synced: records.length });
    }

    // Single insert
    if (!query || typeof query !== "string") return res.status(400).json({ error: "query required" });
    const clean = query.trim().slice(0, 255);
    if (!clean) return res.status(400).json({ error: "query empty" });

    const qt = queryType ?? "domain";
    const rs = regStatus ?? null;
    const tier = computeValueTier(clean, qt, rs);

    if (rs === "unregistered") {
      maybeSendHighValueAlert(clean, qt, rs, userEmail).catch(() => {});
    }

    await run("DELETE FROM search_history WHERE user_id = $1 AND query = $2", [userId, clean]);

    const id = randomBytes(8).toString("hex");
    await run(
      `INSERT INTO search_history
         (id, user_id, query, query_type, reg_status, expiration_date, remaining_days, value_tier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, userId, clean, qt, rs,
       expirationDate ?? null, typeof remainingDays === "number" ? remainingDays : null, tier],
    );

    await pruneExpired(userId);
    await trimToLimit(userId);

    return res.status(200).json({ ok: true });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (id === "all") {
      await run("DELETE FROM search_history WHERE user_id = $1", [userId]);
      return res.status(200).json({ ok: true });
    }
    if (typeof id === "string" && id) {
      await run("DELETE FROM search_history WHERE id = $1 AND user_id = $2", [id, userId]);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "missing id" });
  }

  return res.status(405).end();
}
