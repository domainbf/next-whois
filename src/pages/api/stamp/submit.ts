import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampRecord, StampsDB } from "@/lib/data-store";
import { getDb } from "@/lib/db";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

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

  const db = getDb();
  if (db) {
    await db.query(
      `INSERT INTO stamps (id, domain, tag_name, tag_style, link, description, nickname, email, verify_token, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)`,
      [id, cleanDomain, cleanTagName, cleanTagStyle, cleanLink, cleanDesc, cleanNickname, cleanEmail, token]
    );
  } else {
    const record: StampRecord = {
      id, domain: cleanDomain, tagName: cleanTagName, tagStyle: cleanTagStyle,
      link: cleanLink || "", description: cleanDesc || "", nickname: cleanNickname,
      email: cleanEmail, verifyToken: token, verified: false,
      createdAt: new Date().toISOString(),
    };
    const fileDb = readData<StampsDB>("stamps.json", {});
    if (!fileDb[cleanDomain]) fileDb[cleanDomain] = [];
    fileDb[cleanDomain].push(record);
    writeData("stamps.json", fileDb);
  }

  return res.status(200).json({
    id, domain: cleanDomain, verifyToken: token,
    txtRecord: `_next-whois.${cleanDomain}`,
    txtValue: `next-whois-verify=${token}`,
  });
}
