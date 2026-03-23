import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { one, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: "请先登录" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库不可用" });

  const userEmail = (session.user as any).email as string;
  const user = await one<{ id: string; subscription_access: boolean }>(
    "SELECT id, subscription_access FROM users WHERE email = $1",
    [userEmail]
  );
  if (!user) return res.status(404).json({ error: "用户不存在" });
  if (user.subscription_access) return res.status(400).json({ error: "你已拥有订阅权限" });

  const { inviteCode } = req.body;
  if (!inviteCode?.trim()) return res.status(400).json({ error: "请输入邀请码" });

  const code = String(inviteCode).trim().toUpperCase();
  const codeRow = await one<{ id: string; is_active: boolean; use_count: number; max_uses: number }>(
    "SELECT id, is_active, use_count, max_uses FROM invite_codes WHERE code = $1",
    [code]
  );
  if (!codeRow) return res.status(400).json({ error: "邀请码无效" });
  if (!codeRow.is_active) return res.status(400).json({ error: "邀请码已停用" });
  if (codeRow.use_count >= codeRow.max_uses) return res.status(400).json({ error: "邀请码已达使用上限" });

  await run("UPDATE users SET subscription_access = TRUE, invite_code_used = $1 WHERE id = $2", [code, user.id]);
  await run("UPDATE invite_codes SET use_count = use_count + 1 WHERE id = $1", [codeRow.id]);

  return res.status(200).json({ ok: true });
}
