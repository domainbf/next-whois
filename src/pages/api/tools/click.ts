import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url required" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "db unavailable" });

  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;

  const { data: existing } = await supabase
    .from("tool_clicks")
    .select("total_clicks")
    .eq("url", url)
    .maybeSingle();

  await supabase.from("tool_clicks").upsert({
    url,
    total_clicks: (existing?.total_clicks ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "url" });

  if (userId) {
    const { data: userExisting } = await supabase
      .from("user_tool_clicks")
      .select("click_count")
      .eq("user_id", userId)
      .eq("url", url)
      .maybeSingle();

    await supabase.from("user_tool_clicks").upsert({
      user_id: userId,
      url,
      click_count: (userExisting?.click_count ?? 0) + 1,
      last_clicked_at: new Date().toISOString(),
    }, { onConflict: "user_id,url" });
  }

  return res.status(200).json({ ok: true });
}
