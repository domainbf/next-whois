import type { NextApiRequest, NextApiResponse } from "next";

const TIANHU_BASE = "https://api.tian.hu";
const TIMEOUT_MS = 8000;

export type TianhuTranslateResult = {
  src: string;
  dst: string;
  parts: { part_name: string; means: string[] }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { domain } = req.query;
  if (!domain || typeof domain !== "string") {
    return res.status(400).json({ error: "missing domain" });
  }

  const stem = domain.split(".")[0]?.toLowerCase() || "";
  if (!stem || /^\d+$/.test(stem) || stem.length < 2) {
    return res.status(200).json({ src: stem, dst: null, parts: [] });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${TIANHU_BASE}/translate/${encodeURIComponent(stem)}`, {
      signal: ctrl.signal,
      headers: { "lang": "zh" },
    });
    if (!r.ok) return res.status(200).json({ src: stem, dst: null, parts: [] });
    const json = await r.json();
    if (json.code !== 200 || !json.data) {
      return res.status(200).json({ src: stem, dst: null, parts: [] });
    }
    const parts: { part_name: string; means: string[] }[] =
      json.data.dict?.symbols?.[0]?.parts || [];
    return res.status(200).json({
      src: json.data.src || stem,
      dst: json.data.dst || null,
      parts,
    } as TianhuTranslateResult);
  } catch {
    return res.status(200).json({ src: stem, dst: null, parts: [] });
  } finally {
    clearTimeout(timer);
  }
}
