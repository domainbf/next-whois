import type { NextApiRequest, NextApiResponse } from "next";
import { many } from "@/lib/db-query";

async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await many<{ key: string; value: string }>(
    `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`,
    keys
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function resolveImage(
  value: string,
  key: string,
  origin: string
): string {
  if (!value) return `${origin}/og-banner.png`;
  if (value.startsWith("data:image/")) return `${origin}/api/image?key=${key}`;
  if (value.startsWith("http")) return value;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");

  try {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const origin = `${proto}://${host}`;

    const settings = await getSettings([
      "og_image",
      "og_image_twitter",
      "og_image_wechat",
      "og_image_facebook",
      "og_image_youtube",
      "og_url",
    ]);

    const base = settings.og_url || origin;

    let key = "og_image";
    if (/micromessenger/i.test(ua)) {
      key = settings.og_image_wechat ? "og_image_wechat" : "og_image";
    } else if (/facebookexternalhit|facebot/i.test(ua)) {
      key = settings.og_image_facebook ? "og_image_facebook" : "og_image";
    } else if (/twitterbot/i.test(ua)) {
      key = settings.og_image_twitter ? "og_image_twitter" : "og_image";
    } else if (/youtube/i.test(ua)) {
      key = settings.og_image_youtube ? "og_image_youtube" : "og_image";
    }

    const value = settings[key] || settings.og_image || "";
    const imageUrl = resolveImage(value, key, base);

    if (value.startsWith("data:image/")) {
      // Serve binary directly (avoids a second redirect for crawlers)
      const match = value.match(/^data:(image\/[\w+]+);base64,(.+)$/);
      if (match) {
        res.setHeader("Content-Type", match[1]);
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.send(Buffer.from(match[2], "base64"));
      }
    }

    return res.redirect(302, imageUrl);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
