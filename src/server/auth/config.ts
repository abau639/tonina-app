import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/server/db";

export const authOptions: NextAuthOptions = {
  // Required secret for encryption
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: "jwt",
  },
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "admin@tonina.com" },
      },
      async authorize(credentials) {
        const email = credentials?.email ?? "admin@tonina.com";

        // 1. Check if user exists
        let user = await db.user.findUnique({
          where: { email },
        });

        // 2. Create if missing (Safe Mode: No dates, no extras)
        if (!user) {
          user = await db.user.create({
            data: {
              email,
              name: "Developer",
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub!,
      },
    }),
  },
};