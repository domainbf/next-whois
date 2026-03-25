import type { NextApiRequest, NextApiResponse } from "next";
import { many, one } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [users, stamps, reminders, searches, feedback, settings] = await Promise.all([
      one<{ total: string; disabled: string }>(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE disabled = true) AS disabled FROM users"
      ),
      one<{ total: string; verified: string; pending: string }>(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE verified = true) AS verified, COUNT(*) FILTER (WHERE verified = false) AS pending FROM stamps"
      ),
      one<{ total: string; active: string }>(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active = true) AS active FROM reminders"
      ),
      one<{ total: string; today: string }>(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS today FROM search_history`
      ),
      one<{ total: string; unread: string }>(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS unread FROM feedback`
      ),
      one<{ value: string }>(
        "SELECT value FROM site_settings WHERE key = 'allow_registration'"
      ),
    ]);

    const recentSearches = await many<{ query: string; query_type: string; count: string }>(
      `SELECT query, query_type, COUNT(*) AS count FROM search_history
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY query, query_type ORDER BY count DESC LIMIT 10`
    );

    const dailySearches = await many<{ day: string; count: string }>(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM search_history WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY day ORDER BY day ASC`
    );

    const dbOk = !!users;

    return res.json({
      ok: true,
      db: { ok: dbOk },
      stats: {
        users: {
          total: parseInt(users?.total ?? "0"),
          disabled: parseInt(users?.disabled ?? "0"),
        },
        stamps: {
          total: parseInt(stamps?.total ?? "0"),
          verified: parseInt(stamps?.verified ?? "0"),
          pending: parseInt(stamps?.pending ?? "0"),
        },
        reminders: {
          total: parseInt(reminders?.total ?? "0"),
          active: parseInt(reminders?.active ?? "0"),
        },
        searches: {
          total: parseInt(searches?.total ?? "0"),
          today: parseInt(searches?.today ?? "0"),
        },
        feedback: {
          total: parseInt(feedback?.total ?? "0"),
          recent: parseInt(feedback?.unread ?? "0"),
        },
      },
      topSearches: recentSearches.map(r => ({ query: r.query, type: r.query_type, count: parseInt(r.count) })),
      dailySearches: dailySearches.map(r => ({ day: r.day, count: parseInt(r.count) })),
      settings: {
        allow_registration: settings?.value ?? "1",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, db: { ok: false } });
  }
}
