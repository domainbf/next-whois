import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { isRedisAvailable, getRedisValue, setRedisValue } from "@/lib/server/redis";

const CACHE_KEY = "iana:gtld_list_v2";
const CACHE_TTL_S = 60 * 60 * 24; // 24 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  // Check Redis cache first
  if (isRedisAvailable()) {
    const cached = await getRedisValue(CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  }

  // Fetch IANA root-zone TLD list
  let text = "";
  try {
    const resp = await fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt", {
      headers: { "User-Agent": "next-whois-ui/1.0 (domain lifecycle tool)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`IANA returned HTTP ${resp.status}`);
    text = await resp.text();
  } catch (e: any) {
    return res.status(502).json({ error: `Failed to fetch IANA TLD list: ${e.message}` });
  }

  // Parse: one TLD per line, all-caps; lines starting with # are comments
  // Filter rules:
  //   - 2-letter → ccTLD (skip)
  //   - xn--*   → IDN (skip — includes both IDN ccTLDs and IDN gTLDs)
  //   - everything else → gTLD ✓
  const gtlds = text
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((t) => t && !t.startsWith("#"))
    .filter((t) => t.length > 2 && !t.startsWith("xn--"))
    .sort();

  const result = {
    tlds: gtlds,
    count: gtlds.length,
    fetched_at: new Date().toISOString(),
    source: "https://data.iana.org/TLD/tlds-alpha-by-domain.txt",
  };

  if (isRedisAvailable()) {
    await setRedisValue(CACHE_KEY, JSON.stringify(result), CACHE_TTL_S);
  }

  return res.json(result);
}
