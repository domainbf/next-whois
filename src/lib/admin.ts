import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ADMIN_EMAIL, isAdmin } from "@/lib/admin-shared";

export { ADMIN_EMAIL, isAdmin };

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<any> {
  const session = await getServerSession(req, res, authOptions);
  if (!isAdmin((session?.user as any)?.email)) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return null;
  }
  return session;
}
