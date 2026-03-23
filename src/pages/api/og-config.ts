import type { NextApiRequest, NextApiResponse } from "next";
import { one } from "@/lib/db-query";

let cachedStyles: number[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export const TOTAL_STYLES = 8;

export function parseEnabledStyles(val: string | undefined | null): number[] {
  if (!val || val.trim() === "") {
    return Array.from({ length: TOTAL_STYLES }, (_, i) => i);
  }
  const parsed = val
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n < TOTAL_STYLES);
  return parsed.length > 0 ? parsed : Array.from({ length: TOTAL_STYLES }, (_, i) => i);
}

export function invalidateOgConfigCache() {
  cacheTime = 0;
  cachedStyles = null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    if (!cachedStyles || Date.now() - cacheTime > CACHE_TTL) {
      const row = await one<{ value: string }>(
        "SELECT value FROM site_settings WHERE key = 'og_enabled_styles'",
      );
      cachedStyles = parseEnabledStyles(row?.value);
      cacheTime = Date.now();
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json({ enabled_styles: cachedStyles });
  } catch {
    return res.json({ enabled_styles: Array.from({ length: TOTAL_STYLES }, (_, i) => i) });
  }
}
