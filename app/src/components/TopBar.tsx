"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";

interface TopBarProps {
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

function openCommandBar() {
  document.dispatchEvent(new CustomEvent("stride:openCommandBar"));
}

export default function TopBar({ breadcrumbs, actions }: TopBarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const token = useToken();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.notifications.list(token, { limit: "1" }).then((r) => setUnreadCount(r.unreadCount)).catch(() => {});
  }, [token]);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-sm font-medium text-on-surface-variant">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  chevron_right
                </span>
              )}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-on-surface font-semibold">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : (
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg cta-gradient flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <span className="text-xl font-black tracking-tighter text-on-surface">Stride</span>
        </Link>
      )}

      <div className="flex items-center gap-3">
        {actions}

        {/* Notification bell */}
        <Link
          href="/inbox"
          className="relative p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          title="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <button
          onClick={openCommandBar}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          title="Command bar (⌘K)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </button>

        {/* Profile avatar + popover */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
            title={user?.name ?? "Profile"}
          >
            <span className="text-xs font-bold text-on-primary-fixed">{initials}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-xl overflow-hidden z-50">
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
