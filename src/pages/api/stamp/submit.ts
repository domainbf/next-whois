import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { one, run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rl = await checkRateLimit(ip, 5);
  if (!rl.ok) return res.status(429).json({ error: "请求过于频繁，请稍后再试" });

  const { domain, tagName, tagStyle, cardTheme, link, description, nickname, email } = req.body;
  if (!domain || !tagName || !nickname || !email)
    return res.status(400).json({ error: "Missing required fields" });

  if (!(await isDbReady())) return res.status(503).json({ error: "数据库未配置，品牌认领功能暂不可用" });

  const ALLOWED_TAG_STYLES   = ["personal","official","brand","verified","partner","dev","warning","premium"];
  const ALLOWED_CARD_THEMES  = ["app","gradient","celebrate","split","flash","neon"];

  const cleanDomain   = String(domain).toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleanTagName  = String(tagName).trim().slice(0, 30);
  const rawTagStyle   = String(tagStyle || "personal");
  const rawCardTheme  = String(cardTheme || "app");
  const cleanTagStyle  = ALLOWED_TAG_STYLES.includes(rawTagStyle)   ? rawTagStyle  : "personal";
  const cleanCardTheme = ALLOWED_CARD_THEMES.includes(rawCardTheme) ? rawCardTheme : "app";
  const cleanLink     = String(link || "").trim() || null;
  const cleanDesc     = String(description || "").trim().slice(0, 300) || null;
  const cleanNickname = String(nickname).trim().slice(0, 30);
  const cleanEmail    = String(email).trim();

  const existing = await one<{ id: string; verify_token: string }>(
    `SELECT id, verify_token FROM stamps
     WHERE domain = $1 AND email = $2 AND verified = false
     ORDER BY created_at DESC LIMIT 1`,
    [cleanDomain, cleanEmail],
  );

  if (existing) {
    await run(
      `UPDATE stamps
       SET tag_name = $1, tag_style = $2, link = $3, description = $4, nickname = $5, card_theme = $6
       WHERE id = $7`,
      [cleanTagName, cleanTagStyle, cleanLink, cleanDesc, cleanNickname, cleanCardTheme, existing.id],
    );
    return res.status(200).json({
      id: existing.id,
      domain: cleanDomain,
      verifyToken: existing.verify_token,
      txtRecord: `_next-whois.${cleanDomain}`,
      txtValue: `next-whois-verify=${existing.verify_token}`,
      reused: true,
    });
  }

  const token = randomBytes(16).toString("hex");
  const id    = randomBytes(8).toString("hex");

  try {
    await run(
      `INSERT INTO stamps
         (id, domain, tag_name, tag_style, card_theme, link, description, nickname, email, verify_token, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
      [id, cleanDomain, cleanTagName, cleanTagStyle, cleanCardTheme, cleanLink, cleanDesc, cleanNickname, cleanEmail, token],
    );
  } catch (err: any) {
    console.error("[stamp/submit] Write error:", err.message);
    return res.status(500).json({ error: "数据库写入失败，请稍后重试" });
  }

  return res.status(200).json({
    id, domain: cleanDomain, verifyToken: token,
    txtRecord: `_next-whois.${cleanDomain}`,
    txtValue: `next-whois-verify=${token}`,
  });
}
