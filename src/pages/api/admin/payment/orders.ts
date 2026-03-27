import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { many, one, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
    const offset = parseInt(String(req.query.offset || "0"));
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const search = typeof req.query.search === "string" ? req.query.search : "";

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== "all") { params.push(status); conditions.push(`o.status=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(o.user_email ILIKE $${params.length} OR o.id ILIKE $${params.length} OR o.plan_name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const q = `
      SELECT o.id, o.user_email, o.plan_name, o.amount::float AS amount, o.currency,
             o.provider, o.status, o.paid_at, o.created_at, o.provider_order_id,
             u.name AS user_name
      FROM payment_orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    `;
    const countQ = `SELECT COUNT(*) AS count FROM payment_orders o ${where}`;

    const [orders, countRow] = await Promise.all([
      many(q, [...params, limit, offset]),
      one<{ count: string }>(countQ, params),
    ]);

    const stats = await one<{ total: string; paid_count: string; refunded_count: string }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_count,
              SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS refunded_count
       FROM payment_orders`
    );

    const currencyRows = await many<{ currency: string; revenue: string; count: string }>(
      `SELECT currency,
              COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0)::float AS revenue,
              SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END)::int AS count
       FROM payment_orders
       GROUP BY currency
       ORDER BY revenue DESC`
    );

    return res.json({
      orders,
      total: parseInt(countRow?.count || "0"),
      stats: {
        total: parseInt(stats?.total || "0"),
        paid: parseInt(stats?.paid_count || "0"),
        refunded: parseInt(stats?.refunded_count || "0"),
        revenue: currencyRows.reduce((s, r) => s + parseFloat(r.revenue), 0),
        byCurrency: currencyRows.map(r => ({
          currency: r.currency,
          revenue: parseFloat(r.revenue),
          count: parseInt(String(r.count)),
        })),
      },
    });
  }

  if (req.method === "POST") {
    const { action, orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "缺少订单号" });

    if (action === "mark_paid") {
      const { markOrderPaid } = await import("@/lib/payment");
      await markOrderPaid({ orderId, webhookRaw: "manual_admin_mark" });
      return res.json({ ok: true });
    }

    if (action === "mark_refunded") {
      const order = await one<{ user_id: string | null; user_email: string | null }>(
        `SELECT user_id, user_email FROM payment_orders WHERE id=$1`, [orderId]
      );
      await run(`UPDATE payment_orders SET status='refunded' WHERE id=$1`, [orderId]);
      if (order?.user_id) {
        await run(
          `UPDATE users SET subscription_access=FALSE, subscription_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
          [order.user_id]
        );
      } else if (order?.user_email) {
        await run(
          `UPDATE users SET subscription_access=FALSE, subscription_expires_at=NULL, updated_at=NOW() WHERE email=$1`,
          [order.user_email]
        );
      }
      return res.json({ ok: true, subscriptionRevoked: !!(order?.user_id || order?.user_email) });
    }

    return res.status(400).json({ error: "未知操作" });
  }

  res.setHeader("Allow", "GET,POST");
  return res.status(405).end();
}
