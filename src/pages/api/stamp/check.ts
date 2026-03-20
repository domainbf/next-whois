import type { NextApiRequest, NextApiResponse } from "next";
import { readData, StampsDB, StampRecord } from "@/lib/data-store";
import { getSupabaseClient } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const domain = String(req.query.domain || "").toLowerCase().trim();
  if (!domain) return res.status(400).json({ error: "Missing domain" });

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("stamps")
      .select("id, tag_name, tag_style, link, nickname, verified_at")
      .eq("domain", domain)
      .eq("verified", true);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      stamps: (data || []).map((r) => ({
        id: r.id,
        tagName: r.tag_name,
        tagStyle: r.tag_style,
        link: r.link,
        nickname: r.nickname,
        verifiedAt: r.verified_at,
      })),
    });
  }

  const db = readData<StampsDB>("stamps.json", {});
  const records = (db[domain] || []).filter((r: StampRecord) => r.verified);
  return res.status(200).json({
    stamps: records.map((r) => ({
      id: r.id,
      tagName: r.tagName,
      tagStyle: r.tagStyle,
      link: r.link,
      nickname: r.nickname,
      verifiedAt: r.verifiedAt,
    })),
  });
}
