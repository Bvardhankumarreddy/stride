import type { NextAuthConfig } from "next-auth";

// auth.config.ts is used by proxy.ts (Edge Runtime) — keep it edge-safe.
// No async operations, no Node.js-only APIs, no jose here.
// mintAccessToken lives in auth.ts (Node.js runtime only).

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
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/auth/callback") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");

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
        // accessToken is NOT stored — generated on-demand in auth.ts session callback
        token.organizationId = (user as any).organizationId;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      if (trigger === "update") {
        if (session?.mustChangePassword === false) token.mustChangePassword = false;
        if (session?.organizationId) token.organizationId = session.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      // Sync, edge-safe: copy claims only. No accessToken here.
      // accessToken is added in auth.ts (Node.js) via mintAccessToken.
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).initials = token.initials;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  providers: [],
};
