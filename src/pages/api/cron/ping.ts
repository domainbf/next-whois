import type { NextApiRequest, NextApiResponse } from "next";
import { isDbReady } from "@/lib/db-query";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  if (!(await isDbReady())) {
    return res.status(503).json({ ok: false, error: "db unavailable", ts: new Date().toISOString() });
  }

  const db = await getDbReady();
  const start = Date.now();
  try {
    await db!.query("SELECT 1");
    const latencyMs = Date.now() - start;
    console.log(`[cron/ping] db alive (${latencyMs}ms)`);
    return res.status(200).json({ ok: true, latencyMs, ts: new Date().toISOString() });
  } catch (err: any) {
    console.error("[cron/ping] db query failed:", err.message);
    return res.status(500).json({ ok: false, error: err.message, ts: new Date().toISOString() });
  }
}
