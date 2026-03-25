import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { getAdminEmail, isAdminEmail } from "@/lib/admin-server";

export { ADMIN_EMAIL, getAdminEmail };

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<any> {
  const session = await getServerSession(req, res, authOptions);
  const email = (session?.user as any)?.email;
  if (!(await isAdminEmail(email))) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return null;
  }
  return session;
}
