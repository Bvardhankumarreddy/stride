import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { SignJWT } from "jose";

const API = process.env.API_URL ?? "http://localhost:4000";

// Runs in Node.js runtime only (not edge). Generates a backend-compatible JWT
// from the session claims stored in the NextAuth cookie.
// The accessToken is never stored in the session cookie — only the claims are.
// This keeps the cookie small (no chunking), so clearing a single cookie = logout.
async function mintAccessToken(token: any): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return new SignJWT({
    sub: token.id as string,
    email: token.email as string,
    role: token.role as string,
    organizationId: token.organizationId as string,
    mustChangePassword: (token.mustChangePassword as boolean) ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    ...authConfig.callbacks,
    // Override session callback to mint a fresh accessToken on every session read.
    // This runs in Node.js (not edge), so async jose usage is safe.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).initials = token.initials;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
        (session.user as any).accessToken = await mintAccessToken(token);
      }
      return session;
    },
  },
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
