import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "GET") {
    const { rows } = await db.query(
      `SELECT id, domain, tag_name, tag_style, link, description, nickname, verified, verified_at, created_at
       FROM stamps WHERE email=$1 ORDER BY created_at DESC`,
      [session.user.email]
    );
    return res.status(200).json({ stamps: rows });
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { tagName, tagStyle, link, description, nickname } = req.body;

    const { rows } = await db.query(
      `SELECT id, verified FROM stamps WHERE id=$1 AND email=$2`,
      [id, session.user.email]
    );
    if (!rows[0]) return res.status(404).json({ error: "Stamp not found" });

    const allowed: Record<string, string> = {};
    if (tagName !== undefined) allowed.tag_name = String(tagName).trim().slice(0, 32);
    if (tagStyle !== undefined) allowed.tag_style = String(tagStyle);
    if (link !== undefined) allowed.link = String(link).trim().slice(0, 200);
    if (description !== undefined) allowed.description = String(description).trim().slice(0, 200);
    if (nickname !== undefined) allowed.nickname = String(nickname).trim().slice(0, 50);

    if (Object.keys(allowed).length === 0)
      return res.status(400).json({ error: "No fields to update" });

    const setClauses = Object.keys(allowed).map((k, i) => `${k}=$${i + 2}`).join(", ");
    const values = [id, ...Object.values(allowed)];
    await db.query(`UPDATE stamps SET ${setClauses} WHERE id=$1`, values);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
