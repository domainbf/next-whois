import type { NextApiRequest, NextApiResponse } from "next";
import { run } from "@/lib/db-query";
import { randomBytes } from "crypto";

export const config = { maxDuration: 10 };

function genId() {
  return randomBytes(8).toString("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, message, amount, currency, platform, is_anonymous } = req.body;

  if (!name?.trim() && !is_anonymous) {
    return res.status(400).json({ error: "请填写您的名字或选择匿名" });
  }

  const displayName = is_anonymous ? "匿名赞助者" : String(name || "").trim().slice(0, 50);

  try {
    const id = genId();
    await run(
      `INSERT INTO sponsors (id, name, avatar_url, amount, currency, message, sponsor_date, is_anonymous, is_visible, platform)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        displayName,
        null,
        amount ? parseFloat(String(amount)) : null,
        currency || "CNY",
        message ? String(message).trim().slice(0, 200) : null,
        new Date().toISOString().slice(0, 10),
        !!is_anonymous,
        false,
        platform ? String(platform).slice(0, 30) : null,
      ]
    );
    return res.json({ ok: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
