"use client";

import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import CommandBar from "./CommandBar";

const PUBLIC_PATHS = ["/", "/login", "/onboarding"];

function SessionWatcher() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const isPublic =
      PUBLIC_PATHS.includes(pathname) ||
      pathname.startsWith("/invite") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/verify-email") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/change-password");
    if (!isPublic) {
      router.replace("/login");
    }
  }, [status, pathname, router]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdQuery("");
        setCmdOpen((prev) => !prev);
      }
    };
    const eventHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCmdQuery(detail?.query ?? "");
      setCmdOpen(true);
    };
    document.addEventListener("keydown", keyHandler);
    document.addEventListener("stride:openCommandBar", eventHandler);
    return () => {
      document.removeEventListener("keydown", keyHandler);
      document.removeEventListener("stride:openCommandBar", eventHandler);
    };
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={true} refetchInterval={30}>
      <SessionWatcher />
      {children}
      <CommandBar open={cmdOpen} initialQuery={cmdQuery} onClose={() => setCmdOpen(false)} />
    </SessionProvider>
  );
}
