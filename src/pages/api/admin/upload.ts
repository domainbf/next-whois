import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { dataUrl, hint } = req.body as { dataUrl?: string; hint?: string };
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Malformed data URL" });

    const mime = match[1];
    const ext = mime === "image/webp" ? "webp"
              : mime === "image/png"  ? "png"
              : mime === "image/gif"  ? "gif"
              : "jpg";

    const base64 = match[3];
    const buffer = Buffer.from(base64, "base64");

    // Guard: 8 MB max after base64-decoding
    if (buffer.byteLength > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large (max 8 MB)" });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const prefix = hint ? hint.replace(/[^a-z0-9]/gi, "_").slice(0, 20) + "_" : "";
    const filename = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);

    return res.status(200).json({ url: `/uploads/${filename}` });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
}
