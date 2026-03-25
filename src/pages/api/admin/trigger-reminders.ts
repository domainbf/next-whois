import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import processHandler from "@/pages/api/remind/process";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // Inject the server-side CRON_SECRET so process.ts auth check passes
  const secret = process.env.CRON_SECRET;
  const modifiedReq = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
    method: "POST",
    headers: {
      ...req.headers,
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
    },
  }) as NextApiRequest;

  return processHandler(modifiedReq, res);
}
