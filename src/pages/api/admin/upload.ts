import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { dataUrl } = req.body as { dataUrl?: string; hint?: string };
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Malformed data URL" });

    const base64 = match[3];
    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large (max 8 MB)" });
    }

    // Return the data URL directly — stored in DB, served via /api/image
    return res.status(200).json({ url: dataUrl });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
}
