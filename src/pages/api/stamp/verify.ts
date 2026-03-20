import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampsDB } from "@/lib/data-store";
import { getSupabaseClient } from "@/lib/supabase";
import dns from "dns/promises";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const supabase = getSupabaseClient();

  let verifyToken: string | null = null;
  let alreadyVerified = false;

  if (supabase) {
    const { data, error } = await supabase
      .from("stamps")
      .select("verify_token, verified")
      .eq("id", id)
      .eq("domain", cleanDomain)
      .single();
    if (error || !data) return res.status(404).json({ error: "Stamp not found" });
    if (data.verified) return res.status(200).json({ verified: true, already: true });
    verifyToken = data.verify_token;
  } else {
    const db = readData<StampsDB>("stamps.json", {});
    const record = (db[cleanDomain] || []).find((r) => r.id === id);
    if (!record) return res.status(404).json({ error: "Stamp not found" });
    if (record.verified) return res.status(200).json({ verified: true, already: true });
    verifyToken = record.verifyToken;
  }

  const expectedValue = `next-whois-verify=${verifyToken}`;
  const txtHost = `_next-whois.${cleanDomain}`;

  try {
    const results = await dns.resolveTxt(txtHost);
    const flat = results.flat();
    const matched = flat.some((v) => v === expectedValue);

    if (matched) {
      const verifiedAt = new Date().toISOString();
      if (supabase) {
        await supabase.from("stamps").update({ verified: true, verified_at: verifiedAt }).eq("id", id);
      } else {
        const db = readData<StampsDB>("stamps.json", {});
        const record = (db[cleanDomain] || []).find((r) => r.id === id);
        if (record) { record.verified = true; record.verifiedAt = verifiedAt; }
        writeData("stamps.json", db);
      }
      return res.status(200).json({ verified: true });
    }
    return res.status(200).json({ verified: false, found: flat });
  } catch {
    return res.status(200).json({ verified: false, dnsError: true });
  }
}
