import type { NextAuthConfig } from "next-auth";
import { SignJWT } from "jose";

// Generates a backend-compatible JWT from session claims.
// The accessToken is NOT stored in the session cookie — only the claims are.
// This keeps the cookie small (no chunking), so clearing a single cookie = immediate logout.
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

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/onboarding") ||
        nextUrl.pathname.startsWith("/invite") ||
        nextUrl.pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (!isLoggedIn) return false;

      // Force password change — only /change-password is accessible
      const mustChange = (auth as any)?.token?.mustChangePassword ?? (auth?.user as any)?.mustChangePassword;
      if (mustChange && !nextUrl.pathname.startsWith("/change-password")) {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.initials = (user as any).initials;
        token.role = (user as any).role;
        // accessToken is NOT stored here — generated on-demand in session callback
        token.organizationId = (user as any).organizationId;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      if (trigger === "update") {
        if (session?.mustChangePassword === false) token.mustChangePassword = false;
        if (session?.organizationId) token.organizationId = session.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).initials = token.initials;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
        // Mint a fresh short-lived access token from the stored claims.
        // Never stored in the cookie — generated on every session read.
        (session.user as any).accessToken = await mintAccessToken(token);
      }
      return session;
    },
  },
  providers: [],
};
