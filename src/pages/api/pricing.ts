import type { NextApiRequest, NextApiResponse } from "next";

const NAZHUMI_API_URL = "https://www.nazhumi.com/api/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tld, type = "new" } = req.query;
  if (!tld || typeof tld !== "string") {
    return res.status(400).json({ error: "Missing tld" });
  }
  const cleanTld = tld.toLowerCase().replace(/^\./, "").trim();
  try {
    const url = `${NAZHUMI_API_URL}?domain=${encodeURIComponent(cleanTld)}&order=${type}`;
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return res.status(200).json({ price: [] });
    }
    const json = await upstream.json();
    const data = json?.data;
    if (!data || !Array.isArray(data.price)) {
      return res.status(200).json({ price: [] });
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ price: data.price });
  } catch {
    return res.status(200).json({ price: [] });
  }
}
