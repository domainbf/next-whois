import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampsDB } from "@/lib/data-store";
import dns from "dns/promises";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const db = readData<StampsDB>("stamps.json", {});
  const records = db[cleanDomain] || [];
  const record = records.find((r) => r.id === id);

  if (!record) return res.status(404).json({ error: "Stamp application not found" });
  if (record.verified) return res.status(200).json({ verified: true, already: true });

  const expectedValue = `next-whois-verify=${record.verifyToken}`;
  const txtHost = `_next-whois.${cleanDomain}`;

  try {
    const results = await dns.resolveTxt(txtHost);
    const flat = results.flat();
    const matched = flat.some((v) => v === expectedValue);

    if (matched) {
      record.verified = true;
      record.verifiedAt = new Date().toISOString();
      writeData("stamps.json", db);
      return res.status(200).json({ verified: true });
    } else {
      return res.status(200).json({ verified: false, found: flat });
    }
  } catch {
    return res.status(200).json({ verified: false, dnsError: true });
  }
}
