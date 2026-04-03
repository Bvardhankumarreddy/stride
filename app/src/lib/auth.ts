import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";

const API = process.env.API_URL ?? "http://localhost:4000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days — matches backend JWT_EXPIRES_IN
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          const user = data.user;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
            initials: user.initials ?? null,
            role: user.role,
            organizationId: user.organizationId ?? null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});
