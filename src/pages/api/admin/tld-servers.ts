import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAllCustomServers,
  getUserManagedServers,
  setCustomServer,
  deleteCustomServer,
  CustomServerEntry,
} from "@/lib/whois/custom-servers";

export const config = {
  maxDuration: 10,
};

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: NextApiRequest): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers["x-admin-secret"] || req.query.secret;
  return auth === ADMIN_SECRET;
}

type ResponseData = {
  success: boolean;
  message?: string;
  servers?: Record<string, CustomServerEntry>;
  userServers?: Record<string, CustomServerEntry>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (!isAuthorized(req)) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Provide ADMIN_SECRET via x-admin-secret header." });
  }

  if (req.method === "GET") {
    const servers = await getAllCustomServers();
    const userServers = await getUserManagedServers();
    return res.status(200).json({ success: true, servers, userServers });
  }

  if (req.method === "POST") {
    const { tld, server } = req.body as { tld?: string; server?: string };
    if (!tld || !server) {
      return res
        .status(400)
        .json({ success: false, message: "tld and server are required" });
    }
    await setCustomServer(tld, server);
    return res
      .status(200)
      .json({ success: true, message: `Added: .${tld.replace(/^\./, "")} → ${server}` });
  }

  if (req.method === "DELETE") {
    const tld = (req.query.tld as string) || (req.body as any)?.tld;
    if (!tld) {
      return res
        .status(400)
        .json({ success: false, message: "tld is required" });
    }
    const removed = await deleteCustomServer(tld);
    if (!removed) {
      return res
        .status(404)
        .json({ success: false, message: `TLD .${tld.replace(/^\./, "")} not found in user-managed list` });
    }
    return res
      .status(200)
      .json({ success: true, message: `Removed: .${tld.replace(/^\./, "")}` });
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
