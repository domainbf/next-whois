import type { NextApiRequest, NextApiResponse } from "next";
import { getDbReady } from "@/lib/db";

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

  const db = await getDbReady();
  if (!db) return res.status(503).json({ error: "数据库暂不可用" });

  const { rows } = await db.query(
    `SELECT id, verified FROM stamps WHERE id=$1 AND domain=$2`,
    [stampId, String(domain).toLowerCase().trim()]
  );
  if (!rows[0]) return res.status(404).json({ error: "Stamp not found" });
  if (rows[0].verified) return res.status(200).json({ verified: true, already: true });

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
          await db.query(
            `UPDATE stamps SET verified=true, verified_at=NOW() WHERE id=$1`,
            [stampId]
          );
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
    await db.query(
      `UPDATE stamps SET verified=true, verified_at=NOW() WHERE id=$1`,
      [stampId]
    );
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
