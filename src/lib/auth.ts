import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export { authOptions };

export async function getSession(
  req?: NextApiRequest | GetServerSidePropsContext["req"],
  res?: NextApiResponse | GetServerSidePropsContext["res"]
) {
  if (req && res) {
    return getServerSession(req as NextApiRequest, res as NextApiResponse, authOptions);
  }
  return getServerSession(authOptions);
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};
