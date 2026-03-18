import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAllCustomServers,
  getUserManagedServers,
  setCustomServer,
  deleteCustomServer,
  CustomServerEntry,
} from "@/lib/whois/custom-servers";

type ResponseData = {
  success: boolean;
  message?: string;
  servers?: Record<string, CustomServerEntry>;
  userServers?: Record<string, CustomServerEntry>;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method === "GET") {
    const servers = getAllCustomServers();
    const userServers = getUserManagedServers();
    return res.status(200).json({ success: true, servers, userServers });
  }

  if (req.method === "POST") {
    const body = req.body as {
      tld?: string;
      entry?: CustomServerEntry;
      server?: string;
    };
    const { tld, entry, server } = body;

    if (!tld) {
      return res
        .status(400)
        .json({ success: false, message: "tld is required" });
    }

    const normalized = tld.toLowerCase().replace(/^\./, "");

    if (entry) {
      setCustomServer(normalized, entry);
      return res.status(200).json({
        success: true,
        message: `Saved .${normalized}`,
      });
    }

    if (server) {
      setCustomServer(normalized, server);
      return res.status(200).json({
        success: true,
        message: `Saved .${normalized} → ${server}`,
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "entry or server is required" });
  }

  if (req.method === "DELETE") {
    const tld = (req.query.tld as string) || (req.body as any)?.tld;
    if (!tld) {
      return res
        .status(400)
        .json({ success: false, message: "tld is required" });
    }
    const removed = deleteCustomServer(tld);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: `TLD .${tld.replace(/^\./, "")} not found in user-managed list`,
      });
    }
    return res.status(200).json({
      success: true,
      message: `Removed .${tld.replace(/^\./, "")}`,
    });
  }

  return res
    .status(405)
    .json({ success: false, message: "Method not allowed" });
}
