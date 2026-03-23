import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import { many, one, run, isDbReady } from "@/lib/db-query";
import { scoreDomain, shouldAlertAdmin } from "@/lib/domain-value";
import { sendEmail, highValueAlertHtml, getSiteLabel } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

const MAX_HISTORY = 500;

async function maybeSendHighValueAlert(
  query: string,
  queryType: string,
  regStatus: string,
  checkedByEmail?: string | null,
) {
  if (!shouldAlertAdmin(query, queryType, regStatus)) return;

  // Dedup: skip if already alerted in last 24 hours (any user)
  const recent = await one<{ count: string }>(
    `SELECT COUNT(*) AS count FROM search_history
     WHERE query = $1 AND reg_status = 'unregistered'
     AND created_at >= NOW() - INTERVAL '24 hours'`,
    [query],
  );
  if (parseInt(recent?.count ?? "0") > 0) return;

  const result = scoreDomain(query, queryType);
  if (!result) return;

  const siteName = await getSiteLabel().catch(() => "NEXT WHOIS");
  const html = highValueAlertHtml({
    domain: query,
    score: result.score,
    tier: result.tier,
    reasons: result.reasons,
    isAlertKeyword: result.isAlertKeyword,
    isNumericOnly: result.isNumericOnly,
    checkedBy: checkedByEmail ?? null,
    breakdown: result.breakdown,
    siteName,
  });

  const prefix = result.isAlertKeyword ? "⚡ 特殊关键词可用" : "💎 高价值域名可用";
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${prefix}：${query}（评分 ${result.score}）`,
    html,
  }).catch(err => console.error("[high-value-alert]", err.message));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: "未登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "db unavailable" });

  const userEmail = (session?.user as any)?.email as string | undefined;

  if (req.method === "GET") {
    const rows = await many(
      `SELECT id, query, query_type, created_at, reg_status, expiration_date, remaining_days
       FROM search_history WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, MAX_HISTORY],
    );
    return res.status(200).json({
      history: rows.map((r) => ({
        id: r.id,
        query: r.query,
        queryType: r.query_type,
        timestamp: new Date(r.created_at).getTime(),
        regStatus: r.reg_status ?? "unknown",
        expirationDate: r.expiration_date ?? null,
        remainingDays: r.remaining_days ?? null,
      })),
    });
  }

  if (req.method === "POST") {
    const { query, queryType, regStatus, expirationDate, remainingDays } = req.body;

    // Bulk sync: array of records from localStorage
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
        await run("DELETE FROM search_history WHERE user_id = $1 AND query = $2", [userId, clean]);
        const id = randomBytes(8).toString("hex");
        const createdAt = rec.timestamp ? new Date(rec.timestamp).toISOString() : new Date().toISOString();
        await run(
          `INSERT INTO search_history (id, user_id, query, query_type, reg_status, expiration_date, remaining_days, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [id, userId, clean, rec.queryType ?? "domain", rec.regStatus ?? null,
           rec.expirationDate ?? null, rec.remainingDays ?? null, createdAt],
        );
      }

      // Trim to MAX_HISTORY after bulk import
      const allRows = await many(
        "SELECT id FROM search_history WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      );
      if (allRows.length > MAX_HISTORY) {
        const toDelete = allRows.slice(MAX_HISTORY).map((r) => r.id);
        await run(`DELETE FROM search_history WHERE id = ANY($1::varchar[])`, [toDelete]);
      }
      return res.status(200).json({ ok: true, synced: records.length });
    }

    if (!query || typeof query !== "string") return res.status(400).json({ error: "query required" });
    const clean = query.trim().slice(0, 255);
    if (!clean) return res.status(400).json({ error: "query empty" });

    const qt = queryType ?? "domain";
    const rs = regStatus ?? null;

    // Check for high-value alert BEFORE deleting old record (for dedup)
    if (rs === "unregistered") {
      maybeSendHighValueAlert(clean, qt, rs, userEmail).catch(() => {});
    }

    await run("DELETE FROM search_history WHERE user_id = $1 AND query = $2", [userId, clean]);

    const id = randomBytes(8).toString("hex");
    await run(
      `INSERT INTO search_history (id, user_id, query, query_type, reg_status, expiration_date, remaining_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, clean, qt, rs,
       expirationDate ?? null, typeof remainingDays === "number" ? remainingDays : null],
    );

    const allRows = await many(
      "SELECT id FROM search_history WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    if (allRows.length > MAX_HISTORY) {
      const toDelete = allRows.slice(MAX_HISTORY).map((r) => r.id);
      await run(`DELETE FROM search_history WHERE id = ANY($1::varchar[])`, [toDelete]);
    }

    return res.status(200).json({ ok: true });
  }

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
