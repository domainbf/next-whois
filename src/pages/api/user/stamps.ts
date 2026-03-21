import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getSupabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("stamps")
      .select("id, domain, tag_name, tag_style, link, description, nickname, verified, verified_at, created_at")
      .eq("email", session.user.email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[stamps] GET error:", error.message);
      return res.status(500).json({ error: "获取数据失败" });
    }
    return res.status(200).json({ stamps: data });
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { data: existing } = await supabase
      .from("stamps")
      .select("id")
      .eq("id", id as string)
      .eq("email", session.user.email)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: "Stamp not found" });

    const { tagName, tagStyle, link, description, nickname } = req.body;
    const updates: Record<string, string> = {};
    if (tagName !== undefined) updates.tag_name = String(tagName).trim().slice(0, 32);
    if (tagStyle !== undefined) updates.tag_style = String(tagStyle);
    if (link !== undefined) updates.link = String(link).trim().slice(0, 200);
    if (description !== undefined) updates.description = String(description).trim().slice(0, 200);
    if (nickname !== undefined) updates.nickname = String(nickname).trim().slice(0, 50);

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No fields to update" });

    const { error } = await supabase
      .from("stamps")
      .update(updates)
      .eq("id", id as string);

    if (error) {
      console.error("[stamps] PATCH error:", error.message);
      return res.status(500).json({ error: "更新失败" });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
