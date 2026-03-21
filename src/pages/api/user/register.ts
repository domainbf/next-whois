import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { getDbReady } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "邮箱和密码不能为空" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "邮箱格式不正确" });
  if (String(password).length < 8)
    return res.status(400).json({ error: "密码至少 8 位" });

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  const cleanEmail = String(email).toLowerCase().trim();
  const { rows: existing } = await db.query(
    `SELECT id FROM users WHERE email=$1`,
    [cleanEmail]
  );
  if (existing[0]) return res.status(409).json({ error: "该邮箱已注册" });

  const id = randomBytes(8).toString("hex");
  const passwordHash = await hash(String(password), 12);
  const cleanName = name ? String(name).trim().slice(0, 50) : null;

  await db.query(
    `INSERT INTO users (id, email, password_hash, name) VALUES ($1,$2,$3,$4)`,
    [id, cleanEmail, passwordHash, cleanName]
  );

  return res.status(201).json({ ok: true });
}
