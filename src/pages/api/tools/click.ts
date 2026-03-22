import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import { run, isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url required" });

  if (!(await isDbReady())) return res.status(503).json({ error: "db unavailable" });

  const session = await getSession(req, res);
  const userId = (session?.user as any)?.id as string | undefined;

  // Atomic increment on tool_clicks (upsert)
  await run(
    `INSERT INTO tool_clicks (url, total_clicks, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (url) DO UPDATE
       SET total_clicks = tool_clicks.total_clicks + 1,
           updated_at   = NOW()`,
    [url],
  );

  if (userId) {
    await run(
      `INSERT INTO user_tool_clicks (user_id, url, click_count, last_clicked_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (user_id, url) DO UPDATE
         SET click_count     = user_tool_clicks.click_count + 1,
             last_clicked_at = NOW()`,
      [userId, url],
    );
  }

  return res.status(200).json({ ok: true });
}
