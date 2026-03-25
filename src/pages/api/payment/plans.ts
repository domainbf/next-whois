import type { NextApiRequest, NextApiResponse } from "next";
import { getActivePlans } from "@/lib/payment";
import { isDbReady } from "@/lib/db-query";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  try {
    const plans = await getActivePlans();
    return res.json({ plans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
