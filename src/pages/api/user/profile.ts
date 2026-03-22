import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  if (req.method === "PATCH") {
    const { name } = req.body;
    if (name === undefined) return res.status(400).json({ error: "name required" });

    const trimmed = String(name).trim().slice(0, 50);

    try {
      await run(
        "UPDATE users SET name = $1 WHERE email = $2",
        [trimmed || null, session.user.email],
      );
    } catch (err: any) {
      console.error("[profile] PATCH error:", err.message);
      return res.status(500).json({ error: "更新失败" });
    }

    return res.status(200).json({ ok: true, name: trimmed || null });
  }

  return res.status(405).end();
}
