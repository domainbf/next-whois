import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { many, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";
import { isAdminEmail } from "@/lib/admin-server";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));
const SERVER_ONLY_KEYS = new Set(["captcha_secret_key", "smtp_pass"]);

async function isAdmin(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  try {
    const session = await getServerSession(req, res, authOptions);
    const email = (session?.user as any)?.email;
    return await isAdminEmail(email);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const admin = await isAdmin(req, res);
      const rows = await many<{ key: string; value: string }>("SELECT key, value FROM site_settings");
      const settings: Record<string, string> = {};
      for (const row of rows) {
        if (ALLOWED_KEYS.has(row.key)) {
          if (!SERVER_ONLY_KEYS.has(row.key) || admin) {
            settings[row.key] = row.value;
          }
        }
      }
      return res.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    } catch {
      return res.json({ settings: DEFAULT_SETTINGS });
    }
  }

  if (req.method === "PUT") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const body = req.body as Partial<SiteSettings>;
    try {
      const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];
      for (const key of allowed) {
        if (key in body) {
          await run(
            `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, String(body[key] ?? "")]
          );
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed" });
}
