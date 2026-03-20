import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, StampsDB } from "@/lib/data-store";
import { getDb } from "@/lib/db";
import dns from "dns/promises";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, domain } = req.body;
  if (!id || !domain) return res.status(400).json({ error: "Missing id or domain" });

  const cleanDomain = String(domain).toLowerCase().trim();
  const db = getDb();

  let verifyToken: string | null = null;

  if (db) {
    const { rows } = await db.query(
      `SELECT verify_token, verified FROM stamps WHERE id=$1 AND domain=$2`,
      [id, cleanDomain]
    );
    if (!rows[0]) return res.status(404).json({ error: "Stamp not found" });
    if (rows[0].verified) return res.status(200).json({ verified: true, already: true });
    verifyToken = rows[0].verify_token;
  } else {
    const fileDb = readData<StampsDB>("stamps.json", {});
    const record = (fileDb[cleanDomain] || []).find((r) => r.id === id);
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
      if (db) {
        await db.query(`UPDATE stamps SET verified=true, verified_at=$1 WHERE id=$2`, [verifiedAt, id]);
      } else {
        const fileDb = readData<StampsDB>("stamps.json", {});
        const record = (fileDb[cleanDomain] || []).find((r) => r.id === id);
        if (record) { record.verified = true; record.verifiedAt = verifiedAt; }
        writeData("stamps.json", fileDb);
      }
      return res.status(200).json({ verified: true });
    }
    return res.status(200).json({ verified: false, found: flat });
  } catch {
    return res.status(200).json({ verified: false, dnsError: true });
  }
}
