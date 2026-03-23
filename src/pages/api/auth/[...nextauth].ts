import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { one } from "@/lib/db-query";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await one<{ id: string; email: string; name: string | null; password_hash: string; disabled: boolean; subscription_access: boolean }>(
          "SELECT id, email, name, password_hash, disabled, subscription_access FROM users WHERE email = $1",
          [credentials.email.toLowerCase().trim()],
        );
        if (!user) return null;
        if (user.disabled) return null;

        const valid = await compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? null, subscriptionAccess: user.subscription_access };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.subscriptionAccess = (user as any).subscriptionAccess ?? false;
      }
      if (trigger === "update") {
        if (session?.name !== undefined) token.name = session.name;
        if (session?.subscriptionAccess !== undefined) token.subscriptionAccess = session.subscriptionAccess;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        (session.user as any).subscriptionAccess = (token.subscriptionAccess as boolean) ?? false;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
