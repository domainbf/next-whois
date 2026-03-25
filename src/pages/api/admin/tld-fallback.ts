import type { NextApiRequest, NextApiResponse } from "next";
import { many, run, isDbReady } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (!(await isDbReady())) {
    return res.status(503).json({ error: "数据库未就绪" });
  }

  if (req.method === "GET") {
    try {
      const rows = await many<{
        tld: string;
        fail_count: number;
        use_fallback: boolean;
        last_fail_at: string | null;
      }>(
        `SELECT tld, fail_count, use_fallback, last_fail_at
         FROM tld_fallback_stats
         ORDER BY use_fallback DESC, fail_count DESC, last_fail_at DESC
         LIMIT 200`,
      );
      return res.json({ rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const { tld } = req.body as { tld?: string };
    try {
      if (tld) {
        await run(`DELETE FROM tld_fallback_stats WHERE tld = $1`, [tld]);
      } else {
        await run(`DELETE FROM tld_fallback_stats`);
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { tld, use_fallback } = req.body as { tld: string; use_fallback: boolean };
    if (!tld) return res.status(400).json({ error: "缺少 tld 参数" });
    try {
      await run(
        `UPDATE tld_fallback_stats SET use_fallback = $2 WHERE tld = $1`,
        [tld, use_fallback],
      );
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, DELETE, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
