import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

const MAX_HISTORY = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: "未登录" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "db unavailable" });

  if (req.method === "GET") {
    const { data } = await supabase
      .from("search_history")
      .select("query, query_type, created_at, reg_status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);

    return res.status(200).json({
      history: (data ?? []).map((r) => ({
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

    await supabase
      .from("search_history")
      .delete()
      .eq("user_id", userId)
      .eq("query", clean);

    const id = randomBytes(8).toString("hex");
    const insertData: Record<string, unknown> = {
      id,
      user_id: userId,
      query: clean,
      query_type: queryType ?? "domain",
    };
    // reg_status column may or may not exist; write it and ignore error if column absent
    if (regStatus) insertData.reg_status = regStatus;
    await supabase.from("search_history").insert(insertData);

    const { data: all } = await supabase
      .from("search_history")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if ((all?.length ?? 0) > MAX_HISTORY) {
      const toDelete = (all ?? []).slice(MAX_HISTORY).map((r) => r.id);
      await supabase.from("search_history").delete().in("id", toDelete);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
