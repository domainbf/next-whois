import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";

export const config = { maxDuration: 15 };

const VERCEL_API = "https://api.vercel.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function projectUrl(path = "") {
  const base = `${VERCEL_API}/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`;
  return path ? `${base}${path}` : base;
}

async function getDomainInfo(domain: string) {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
    { headers: headers() }
  );
  return res.ok ? res.json() : null;
}

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

  // Try to add domain to Vercel project
  const addRes = await fetch(projectUrl(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  });
  const addData = await addRes.json();

  // If already in this project (409 / domain_already_exists), fetch existing info
  if (!addRes.ok) {
    const code: string = addData.error?.code ?? "";
    if (code === "domain_already_exists" || addRes.status === 409) {
      const info = await getDomainInfo(domain);
      if (info) {
        if (info.verified) {
          await supabase.from("stamps").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", stampId);
          return res.status(200).json({ verified: true });
        }
        const txt = (info.verification ?? []).find((v: any) => v.type === "TXT");
        return res.status(200).json({
          verified: false,
          txtName: "_vercel",
          txtValue: txt?.value ?? null,
          txtFullDomain: txt?.domain ?? `_vercel.${domain}`,
        });
      }
    }
    // Domain used by another Vercel project or other error
    return res.status(200).json({
      verified: false,
      apiError: addData.error?.message ?? "Failed to register domain with Vercel",
      apiCode: code,
    });
  }

  // Successful add
  if (addData.verified) {
    await supabase.from("stamps").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", stampId);
    return res.status(200).json({ verified: true });
  }

  const txt = (addData.verification ?? []).find((v: any) => v.type === "TXT");
  return res.status(200).json({
    verified: false,
    txtName: "_vercel",
    txtValue: txt?.value ?? null,
    txtFullDomain: txt?.domain ?? `_vercel.${domain}`,
  });
}
