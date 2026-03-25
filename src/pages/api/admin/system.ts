import type { NextApiRequest, NextApiResponse } from "next";
import { many, one, run } from "@/lib/db-query";
import { requireAdmin, getAdminEmail } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === "POST") {
    const { action } = req.body ?? {};
    if (action === "clear_rate_limits") {
      try {
        await run(`DELETE FROM rate_limit_records WHERE reset_at < NOW()`);
        return res.json({ ok: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    return res.status(400).json({ error: "未知操作" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [
      users, stamps, reminders, searches, feedback, settings,
      orders, rateLimits, adminEmail,
    ] = await Promise.all([
      one<{ total: string; disabled: string; subscribed: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE disabled = true) AS disabled,
                COUNT(*) FILTER (WHERE subscription_access = true) AS subscribed
         FROM users`
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
      one<{ total: string; paid: string; revenue: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status='paid') AS paid,
                COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END), 0)::float AS revenue
         FROM payment_orders`
      ),
      one<{ count: string }>(
        `SELECT COUNT(*) AS count FROM rate_limit_records WHERE reset_at > NOW()`
      ),
      getAdminEmail(),
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
      adminEmail,
      stats: {
        users: {
          total: parseInt(users?.total ?? "0"),
          disabled: parseInt(users?.disabled ?? "0"),
          subscribed: parseInt(users?.subscribed ?? "0"),
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
        orders: {
          total: parseInt(orders?.total ?? "0"),
          paid: parseInt(orders?.paid ?? "0"),
          revenue: parseFloat(String(orders?.revenue ?? "0")),
        },
        rateLimits: {
          active: parseInt(rateLimits?.count ?? "0"),
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
