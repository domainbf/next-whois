import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).json({ error: "Missing domain" });

  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(200).json({ stamps: [] });

    const { data, error } = await supabase
      .from("stamps")
      .select("id, tag_name, tag_style, link, nickname, verified_at")
      .eq("domain", domain)
      .eq("verified", true)
      .order("verified_at", { ascending: false });

    if (error) {
      console.error("[stamp/check] DB error:", error.message);
      return res.status(500).json({ error: "查询失败，请稍后重试", stamps: [] });
    }
    return res.status(200).json({
      stamps: (data ?? []).map((r) => ({
        id: r.id, tagName: r.tag_name, tagStyle: r.tag_style,
        link: r.link, nickname: r.nickname, verifiedAt: r.verified_at,
      })),
    });
  } catch (err: any) {
    console.error("[stamp/check] error:", err);
    return res.status(500).json({ error: "查询失败，请稍后重试", stamps: [] });
  }
}
