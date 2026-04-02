import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-compatible auth — uses authConfig only (no Prisma, no Node.js APIs)
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static files, and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
