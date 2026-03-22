import type { NextApiRequest, NextApiResponse } from "next";
import { many, one, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";
import { scoreDomain } from "@/lib/domain-value";

const PAGE_SIZE = 50;

// Expanded SQL condition for high-value domains
const HIGH_VALUE_SQL = `(
  query_type = 'domain' AND reg_status = 'unregistered' AND (
    length(split_part(query, '.', 1)) <= 4
    OR regexp_replace(query, '\\.[^.]+$', '') ~ '^[0-9]+$'
    OR (
      length(split_part(query, '.', 1)) <= 6
      AND split_part(query, '.', -1) IN ('com','net','org','io','ai','app','dev','co','me')
    )
    OR split_part(query, '.', 1) IN (
      'ai','api','bot','gpt','llm','pay','web3','nft','dao','defi',
      'www','domain','whois','dns','cloud','data','code','dev',
      'shop','store','trade','market','crypto','chain','wallet',
      'tech','app','hub','lab','pro','go','me','my','one'
    )
  )
)`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  // DELETE: bulk delete by time period
  if (req.method === "DELETE") {
    const { period } = req.body as { period: string };
    const periodMap: Record<string, string> = {
      yesterday:   "created_at >= NOW() - INTERVAL '2 days' AND created_at < NOW() - INTERVAL '1 day'",
      day_before:  "created_at >= NOW() - INTERVAL '3 days' AND created_at < NOW() - INTERVAL '2 days'",
      week:        "created_at < NOW() - INTERVAL '7 days'",
      month:       "created_at < NOW() - INTERVAL '30 days'",
      all:         "1=1",
    };
    const condition = periodMap[period];
    if (!condition) return res.status(400).json({ error: "无效的时间段" });

    try {
      const deleted = await run(`DELETE FROM search_history WHERE ${condition}`);
      return res.status(200).json({ ok: true, deleted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
    const filter = (req.query.filter as string) ?? "all";
    const offset = (page - 1) * PAGE_SIZE;

    // Build WHERE clause based on filter
    let whereClause = "1=1";
    if (filter === "available") {
      whereClause = "query_type = 'domain' AND reg_status = 'unregistered'";
    } else if (filter === "expiring") {
      whereClause = "query_type = 'domain' AND reg_status = 'registered' AND remaining_days IS NOT NULL AND remaining_days >= 0 AND remaining_days <= 90";
    } else if (filter === "high_value") {
      whereClause = HIGH_VALUE_SQL;
    }

    const [totalRow, todayRow, statsCounts] = await Promise.all([
      one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM search_history WHERE ${whereClause}`
      ),
      one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM search_history WHERE created_at >= NOW() - INTERVAL '1 day'`
      ),
      Promise.all([
        one<{ count: string }>("SELECT COUNT(*) AS count FROM search_history"),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM search_history WHERE query_type = 'domain' AND reg_status = 'unregistered'"),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM search_history WHERE query_type = 'domain' AND reg_status = 'registered' AND remaining_days IS NOT NULL AND remaining_days >= 0 AND remaining_days <= 90"),
        one<{ count: string }>(`SELECT COUNT(*) AS count FROM search_history WHERE ${HIGH_VALUE_SQL}`),
        one<{ count: string }>("SELECT COUNT(*) AS count FROM search_history WHERE query_type = 'domain' AND reg_status = 'registered'"),
      ]),
    ]);

    const [allCount, availableCount, expiringCount, highValueCount, registeredCount] = statsCounts;

    const rows = await many(
      `SELECT sh.id, sh.query, sh.query_type, sh.reg_status, sh.expiration_date, sh.remaining_days,
              sh.created_at, u.email AS user_email, u.name AS user_name
       FROM search_history sh
       LEFT JOIN users u ON sh.user_id = u.id
       WHERE ${whereClause}
       ORDER BY sh.created_at DESC
       LIMIT $1 OFFSET $2`,
      [PAGE_SIZE, offset],
    );

    // Daily stats (30 days)
    const dailyStats = await many<{ day: string; count: string; available: string; registered: string }>(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) AS count,
         COUNT(*) FILTER (WHERE reg_status = 'unregistered') AS available,
         COUNT(*) FILTER (WHERE reg_status = 'registered') AS registered
       FROM search_history
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day ASC`
    );

    // Top queries by type
    const topByType = await many<{ query_type: string; count: string }>(
      `SELECT query_type, COUNT(*) AS count FROM search_history
       GROUP BY query_type ORDER BY count DESC`
    );

    // Top queried domains (30 days)
    const topQueries = await many<{ query: string; query_type: string; count: string }>(
      `SELECT query, query_type, COUNT(*) AS count FROM search_history
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY query, query_type ORDER BY count DESC LIMIT 20`
    );

    // Compute domain value scores for each record
    const records = rows.map(r => {
      const valueResult = r.query_type === "domain"
        ? scoreDomain(r.query, r.query_type)
        : null;
      return {
        id: r.id,
        query: r.query,
        queryType: r.query_type,
        regStatus: r.reg_status ?? "unknown",
        expirationDate: r.expiration_date ?? null,
        remainingDays: r.remaining_days ?? null,
        createdAt: r.created_at,
        userEmail: r.user_email ?? null,
        userName: r.user_name ?? null,
        valueScore: valueResult?.score ?? null,
        valueTier: valueResult?.tier ?? null,
        valueReasons: valueResult?.reasons ?? [],
        isAlertKeyword: valueResult?.isAlertKeyword ?? false,
      };
    });

    return res.json({
      records,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: parseInt(totalRow?.count ?? "0"),
        totalPages: Math.ceil(parseInt(totalRow?.count ?? "0") / PAGE_SIZE),
      },
      stats: {
        all: parseInt(allCount?.count ?? "0"),
        today: parseInt(todayRow?.count ?? "0"),
        available: parseInt(availableCount?.count ?? "0"),
        expiring: parseInt(expiringCount?.count ?? "0"),
        highValue: parseInt(highValueCount?.count ?? "0"),
        registered: parseInt(registeredCount?.count ?? "0"),
      },
      dailyStats: dailyStats.map(r => ({
        day: r.day,
        count: parseInt(r.count),
        available: parseInt(r.available),
        registered: parseInt(r.registered),
      })),
      topByType: topByType.map(r => ({ type: r.query_type, count: parseInt(r.count) })),
      topQueries: topQueries.map(r => ({ query: r.query, type: r.query_type, count: parseInt(r.count) })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
