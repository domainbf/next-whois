import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import { many, run, isDbReady } from "@/lib/db-query";

const MAX_HISTORY = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: "未登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "db unavailable" });

  if (req.method === "GET") {
    const rows = await many(
      `SELECT query, query_type, created_at, reg_status
       FROM search_history WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, MAX_HISTORY],
    );
    return res.status(200).json({
      history: rows.map((r) => ({
        query: r.query,
        queryType: r.query_type,
        timestamp: new Date(r.created_at).getTime(),
        regStatus: r.reg_status ?? "unknown",
      })),
    });
  }

  if (req.method === "POST") {
    const { query, queryType, regStatus } = req.body;
    if (!query || typeof query !== "string") return res.status(400).json({ error: "query required" });

    const clean = query.trim().slice(0, 255);
    if (!clean) return res.status(400).json({ error: "query empty" });

    // Remove duplicate entry for this user+query first
    await run(
      "DELETE FROM search_history WHERE user_id = $1 AND query = $2",
      [userId, clean],
    );

    const id = randomBytes(8).toString("hex");
    await run(
      `INSERT INTO search_history (id, user_id, query, query_type, reg_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, clean, queryType ?? "domain", regStatus ?? null],
    );

    // Trim to MAX_HISTORY
    const allRows = await many(
      "SELECT id FROM search_history WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    if (allRows.length > MAX_HISTORY) {
      const toDelete = allRows.slice(MAX_HISTORY).map((r) => r.id);
      await run(
        `DELETE FROM search_history WHERE id = ANY($1::varchar[])`,
        [toDelete],
      );
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
