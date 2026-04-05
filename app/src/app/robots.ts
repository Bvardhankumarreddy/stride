import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stride-app.up.railway.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/onboarding", "/pricing"],
        disallow: ["/dashboard", "/board", "/issues", "/sprints", "/docs", "/settings", "/inbox", "/roadmap", "/search", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
