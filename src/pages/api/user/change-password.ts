import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { compare, hash } from "bcryptjs";
import { one, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "请先登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "请填写当前密码和新密码" });
  if (String(newPassword).length < 8)
    return res.status(400).json({ error: "新密码至少 8 位" });

  const user = await one<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [session.user.email],
  );
  if (!user) return res.status(404).json({ error: "用户不存在" });

  const valid = await compare(String(currentPassword), user.password_hash);
  if (!valid) return res.status(400).json({ error: "当前密码不正确" });

  const newHash = await hash(String(newPassword), 12);
  await run("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, user.id]);

  return res.status(200).json({ ok: true });
}
