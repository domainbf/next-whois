import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";
import { one } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    const pool = await getDbReady();
    const [users, stamps, reminders, history] = await Promise.all([
      one<{ count: string }>(pool, "SELECT COUNT(*) AS count FROM users", []),
      one<{ count: string }>(pool, "SELECT COUNT(*) AS count FROM stamps", []),
      one<{ count: string }>(pool, "SELECT COUNT(*) AS count FROM reminders WHERE active = true", []),
      one<{ count: string }>(pool, "SELECT COUNT(*) AS count FROM search_history", []),
    ]);
    return res.json({
      users: parseInt(users?.count ?? "0"),
      stamps: parseInt(stamps?.count ?? "0"),
      activeReminders: parseInt(reminders?.count ?? "0"),
      searches: parseInt(history?.count ?? "0"),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
