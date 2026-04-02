"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useSession, signOut } from "next-auth/react";
import { useNotificationStore, ICON_MAP, AppNotification } from "@/store/useNotificationStore";
import { useToken } from "@/lib/useToken";
import { api, ApiNotification } from "@/lib/api";

const NAV_ITEMS = [
  { label: "My Work", icon: "home_app_logo", href: "/dashboard" },
  { label: "Inbox", icon: "inbox", href: "/inbox" },
  { label: "Search", icon: "search", href: "/search" },
  { label: "Projects", icon: "folder_open", href: "/board" },
  { label: "Issues", icon: "confirmation_number", href: "/issues" },
  { label: "Sprints", icon: "sprint", href: "/sprints" },
  { label: "Docs", icon: "description", href: "/docs" },
  { label: "Roadmap", icon: "map", href: "/roadmap" },
  { label: "Settings", icon: "settings", href: "/settings", adminOnly: true },
];

function mapNotification(n: ApiNotification): AppNotification {
  const iconData = ICON_MAP[n.type] ?? ICON_MAP.comment;
  const diff = Date.now() - new Date(n.createdAt).getTime();
  const m = Math.floor(diff / 60_000);
  const time = m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
  return {
    id: n.id,
    type: n.type as AppNotification["type"],
    icon: iconData.icon,
    iconBg: iconData.iconBg,
    title: n.title,
    body: n.body,
    time,
    unread: !n.read,
    issueId: n.issueId,
  };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const token = useToken();
  const user = session?.user as any;
  const { unreadCount, hydrated, setNotifications } = useNotificationStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!token || hydrated) return;
    api.notifications.list(token, { limit: "50" }).then((res) => {
      setNotifications(res.data.map(mapNotification));
    }).catch(() => {});
  }, [token, hydrated, setNotifications]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex-col p-4 gap-1 z-30">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 mb-6 px-2 group">
        <div className="w-10 h-10 rounded-xl cta-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:opacity-90 transition-opacity">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
        </div>
        <div>
          <h2 className="text-lg font-black text-on-surface leading-tight font-headline">Stride</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Workspace</p>
        </div>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.adminOnly || ["owner", "admin"].includes(user?.role)).map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                active
                  ? "bg-white text-primary shadow-sm font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high font-medium"
              )}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{
                  fontSize: 20,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/inbox" && unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="pt-4 border-t border-outline-variant/20 relative" ref={menuRef}>
        {/* Popover menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-xl overflow-hidden">
            {/* Profile header */}
            <div className="px-4 py-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-on-primary-fixed">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{user?.name ?? "—"}</p>
                  <p className="text-xs text-on-surface-variant truncate">{user?.email ?? ""}</p>
                  {user?.role && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline mt-0.5 capitalize">{user.role}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 space-y-0.5">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>manage_accounts</span>
                Profile &amp; settings
              </Link>
              <Link
                href="/settings/members"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
                Members
              </Link>
            </div>

            <div className="p-2 border-t border-outline-variant/10">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-on-primary-fixed">{initials}</span>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-bold text-on-surface truncate font-headline">{user?.name ?? "Loading…"}</p>
            <p className="text-[10px] text-outline truncate">{user?.email ?? ""}</p>
          </div>
          <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>
            {menuOpen ? "expand_more" : "expand_less"}
          </span>
        </button>
      </div>
    </aside>
  );
}
