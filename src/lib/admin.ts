import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { getAdminEmail, isAdminEmail } from "@/lib/admin-server";

export { ADMIN_EMAIL, getAdminEmail };

/**
 * Synchronous admin check — compares against the compile-time ADMIN_EMAIL
 * constant. Use `isAdminEmail()` (async) for the DB-backed check.
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

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
