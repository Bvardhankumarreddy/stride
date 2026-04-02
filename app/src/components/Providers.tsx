"use client";

import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import CommandBar from "./CommandBar";

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
    <SessionProvider>
      {children}
      <CommandBar open={cmdOpen} initialQuery={cmdQuery} onClose={() => setCmdOpen(false)} />
    </SessionProvider>
  );
}
