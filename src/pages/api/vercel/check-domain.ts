import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";

export const config = { maxDuration: 15 };

const VERCEL_API = "https://api.vercel.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { domain, stampId } = req.body;
  if (!domain || !stampId)
    return res.status(400).json({ error: "Missing domain or stampId" });

  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID)
    return res.status(503).json({ error: "Vercel integration not configured" });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "数据库暂不可用" });

  const { data: stamp } = await supabase
    .from("stamps")
    .select("id, verified")
    .eq("id", stampId)
    .eq("domain", String(domain).toLowerCase().trim())
    .maybeSingle();

  if (!stamp) return res.status(404).json({ error: "Stamp not found" });
  if (stamp.verified) return res.status(200).json({ verified: true, already: true });

  // Trigger Vercel's verify check
  const verifyRes = await fetch(
    `${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}/verify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  const verifyData = await verifyRes.json();

  if (!verifyRes.ok) {
    return res.status(200).json({
      verified: false,
      apiError: verifyData.error?.message ?? "Vercel verification check failed",
    });
  }

  if (verifyData.verified) {
    await supabase.from("stamps").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", stampId);
    return res.status(200).json({ verified: true });
  }

  return res.status(200).json({ verified: false, pending: true });
}
