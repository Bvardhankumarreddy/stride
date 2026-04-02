import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;

        const valid = await compare(credentials.password as string, user.password);
        if (!valid) return null;

        // Fetch NestJS JWT so client components can call the API directly
        let accessToken: string | undefined;
        let organizationId: string | undefined;
        try {
          const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (res.ok) {
            const data = await res.json();
            accessToken = data.accessToken;
            organizationId = data.user?.organizationId;
          }
        } catch { /* API unreachable — session still works, just no direct API access */ }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          initials: user.initials ?? undefined,
          role: user.role,
          organizationId,
          accessToken,
        };
      },
    }),
  ],
});
