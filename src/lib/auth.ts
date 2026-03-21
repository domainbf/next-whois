import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export { authOptions };

export async function getSession(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...(args as Parameters<typeof getServerSession>), authOptions);
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};
