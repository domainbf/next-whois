import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "db unavailable" });

  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;

  if (userId) {
    const { data } = await supabase
      .from("user_tool_clicks")
      .select("url, click_count")
      .eq("user_id", userId);

    const clicks: Record<string, number> = {};
    for (const row of data ?? []) {
      clicks[row.url] = row.click_count;
    }
    return res.status(200).json({ clicks, source: "user" });
  }

  const { data } = await supabase
    .from("tool_clicks")
    .select("url, total_clicks");

  const clicks: Record<string, number> = {};
  for (const row of data ?? []) {
    clicks[row.url] = row.total_clicks;
  }
  return res.status(200).json({ clicks, source: "global" });
}
