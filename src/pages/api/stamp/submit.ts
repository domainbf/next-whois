import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = checkRateLimit(ip, 5);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请稍后再试" });

  const { domain, tagName, tagStyle, link, description, nickname, email } = req.body;
  if (!domain || !tagName || !nickname || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const cleanDomain = String(domain).toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = randomBytes(16).toString("hex");
  const id = randomBytes(8).toString("hex");
  const cleanTagName = String(tagName).trim().slice(0, 30);
  const cleanTagStyle = String(tagStyle || "personal");
  const cleanLink = String(link || "").trim() || null;
  const cleanDesc = String(description || "").trim().slice(0, 300) || null;
  const cleanNickname = String(nickname).trim().slice(0, 30);
  const cleanEmail = String(email).trim();

  try {
    const db = await getDbReady();
    if (!db) return res.status(503).json({ error: "数据库未配置，品牌认领功能暂不可用" });

    await db.query(
      `INSERT INTO stamps (id, domain, tag_name, tag_style, link, description, nickname, email, verify_token, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)`,
      [id, cleanDomain, cleanTagName, cleanTagStyle, cleanLink, cleanDesc, cleanNickname, cleanEmail, token]
    );
  } catch (dbErr: any) {
    console.error("[stamp/submit] Write error:", dbErr?.message || dbErr);
    return res.status(500).json({ error: "数据库写入失败，请稍后重试" });
  }

  return res.status(200).json({
    id, domain: cleanDomain, verifyToken: token,
    txtRecord: `_next-whois.${cleanDomain}`,
    txtValue: `next-whois-verify=${token}`,
  });
}
