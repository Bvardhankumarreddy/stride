"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { label: "Work", href: "/dashboard", icon: "home_app_logo" },
  { label: "Inbox", href: "/inbox", icon: "mail" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Projects", href: "/board", icon: "grid_view" },
  { label: "Docs", href: "/docs", icon: "article" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-surface-container-lowest/95 backdrop-blur-lg z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-outline-variant/10">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors",
              active
                ? "text-primary bg-blue-50/50"
                : "text-outline hover:text-on-surface-variant"
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 24,
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase mt-0.5">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
