import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampRecord, StampsDB } from "@/lib/data-store";
import { getSupabaseClient } from "@/lib/supabase";
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

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("stamps").insert({
      id,
      domain: cleanDomain,
      tag_name: String(tagName).trim().slice(0, 30),
      tag_style: String(tagStyle || "personal"),
      link: String(link || "").trim() || null,
      description: String(description || "").trim().slice(0, 300) || null,
      nickname: String(nickname).trim().slice(0, 30),
      email: String(email).trim(),
      verify_token: token,
      verified: false,
    });
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const record: StampRecord = {
      id, domain: cleanDomain,
      tagName: String(tagName).trim().slice(0, 30),
      tagStyle: String(tagStyle || "personal"),
      link: String(link || "").trim(),
      description: String(description || "").trim().slice(0, 300),
      nickname: String(nickname).trim().slice(0, 30),
      email: String(email).trim(),
      verifyToken: token, verified: false,
      createdAt: new Date().toISOString(),
    };
    const db = readData<StampsDB>("stamps.json", {});
    if (!db[cleanDomain]) db[cleanDomain] = [];
    db[cleanDomain].push(record);
    writeData("stamps.json", db);
  }

  return res.status(200).json({
    id,
    domain: cleanDomain,
    verifyToken: token,
    txtRecord: `_next-whois.${cleanDomain}`,
    txtValue: `next-whois-verify=${token}`,
  });
}
