import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Providers from "@/components/Providers";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stride-app.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Stride — AI-Native Project Management",
    template: "%s | Stride",
  },
  description:
    "Stride is an AI-powered project management tool that combines issue tracking, sprint planning, docs, and team collaboration in one workspace. The smarter alternative to Jira.",
  keywords: [
    "project management",
    "AI project management",
    "Jira alternative",
    "sprint planning",
    "issue tracker",
    "agile tool",
    "team collaboration",
    "kanban board",
    "roadmap tool",
    "AI productivity",
    "software development tool",
    "scrum tool",
  ],
  authors: [{ name: "Stride" }],
  creator: "Stride",
  publisher: "Stride",
  category: "productivity",
  applicationName: "Stride",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Stride",
    title: "Stride — AI-Native Project Management",
    description:
      "Ship faster with AI-powered issue tracking, sprint planning, and team docs — all in one workspace. The smarter alternative to Jira and Confluence.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stride — AI-Native Project Management",
    description:
      "Ship faster with AI-powered issue tracking, sprint planning, and team docs — all in one workspace.",
    creator: "@strideapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('stride:theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Stride",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "AI-powered project management tool combining issue tracking, sprint planning, docs, and team collaboration in one workspace.",
              url: APP_URL,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free plan available",
              },
              featureList: [
                "AI-powered issue tracking",
                "Sprint planning and management",
                "Kanban board",
                "Team wiki and docs",
                "Real-time collaboration",
                "Roadmap and timeline view",
                "GitHub and Slack integrations",
              ],
            }),
          }}
        />
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-2WCEXGZ9HJ" />
    </html>
  );
}
