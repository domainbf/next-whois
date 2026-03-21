import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: "db unavailable", ts: new Date().toISOString() });
  }

  const start = Date.now();
  const { error } = await supabase.from("users").select("id").limit(1);
  const latencyMs = Date.now() - start;

  if (error) {
    console.error("[cron/ping] db query failed:", error.message);
    return res.status(500).json({ ok: false, error: error.message, ts: new Date().toISOString() });
  }

  console.log(`[cron/ping] db alive (${latencyMs}ms)`);
  return res.status(200).json({ ok: true, latencyMs, ts: new Date().toISOString() });
}
