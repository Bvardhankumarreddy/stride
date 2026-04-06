"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useSession, signOut } from "next-auth/react";
import { useNotificationStore, ICON_MAP, AppNotification } from "@/store/useNotificationStore";
import { useToken } from "@/lib/useToken";
import { api, ApiNotification, ApiOrganization } from "@/lib/api";

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

function makeSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, update: updateSession } = useSession();
  const token = useToken();
  const user = session?.user as any;
  const { unreadCount, hydrated, setNotifications } = useNotificationStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Workspace switcher state
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const [workspaces, setWorkspaces] = useState<{ organization: ApiOrganization; role: string }[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  // Create workspace state
  const [createOpen, setCreateOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!wsOpen) return;
    function handleClick(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [wsOpen]);

  useEffect(() => {
    if (!token || hydrated) return;
    api.notifications.list(token, { limit: "50" }).then(res => {
      setNotifications(res.data.map(mapNotification));
    }).catch(() => {});
  }, [token, hydrated, setNotifications]);

  useEffect(() => {
    if (!token) return;
    api.organizations.listAll(token).then(setWorkspaces).catch(() => {});
  }, [token]);

  async function handleSwitch(orgId: string) {
    if (!token || orgId === user?.organizationId) { setWsOpen(false); return; }
    setSwitching(orgId);
    try {
      const res = await api.organizations.switch(token, orgId);
      await updateSession({ organizationId: res.organizationId });
      window.location.href = "/dashboard";
    } catch {
      setSwitching(null);
    }
  }

  async function handleCreateWorkspace(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !newWsName.trim()) return;
    setCreating(true);
    try {
      const org = await api.organizations.create(token, { name: newWsName.trim(), slug: makeSlug(newWsName.trim()) });
      const res = await api.organizations.switch(token, org.id);
      await updateSession({ organizationId: res.organizationId });
      window.location.href = "/dashboard";
    } catch {
      setCreating(false);
    }
  }

  const currentOrg = workspaces.find(w => w.organization.id === user?.organizationId)?.organization;
  const currentOrgName = currentOrg?.name ?? "Workspace";

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex-col p-4 gap-1 z-30">
      {/* Workspace switcher */}
      <div className="relative mb-4" ref={wsRef}>
        <button
          onClick={() => { setWsOpen(v => !v); setCreateOpen(false); }}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-container-high transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl cta-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20 flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="text-sm font-black text-on-surface leading-tight font-headline truncate">{currentOrgName}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Workspace</p>
          </div>
          <span className="material-symbols-outlined text-outline opacity-60" style={{ fontSize: 16 }}>unfold_more</span>
        </button>

        {wsOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/15 overflow-hidden">
            {!createOpen ? (
              <>
                <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Your workspaces
                </div>
                <div className="px-2 pb-2 max-h-48 overflow-y-auto">
                  {workspaces.map(({ organization: org, role }) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitch(org.id)}
                      disabled={switching === org.id}
                      className={clsx(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors text-sm",
                        org.id === user?.organizationId
                          ? "bg-primary/5 text-primary"
                          : "hover:bg-surface-container-low text-on-surface-variant"
                      )}
                    >
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-primary">
                        {org.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-xs">{org.name}</p>
                        <p className="text-[10px] text-outline capitalize">{role}</p>
                      </div>
                      {org.id === user?.organizationId && (
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>check</span>
                      )}
                      {switching === org.id && (
                        <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-outline-variant/10">
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Create workspace
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleCreateWorkspace} className="p-3">
                <p className="text-xs font-bold text-on-surface mb-2">New workspace</p>
                <input
                  autoFocus
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCreateOpen(false)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-low">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating || !newWsName.trim()}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 disabled:opacity-40">
                    {creating ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.filter(item => !item.adminOnly || ["owner", "admin"].includes(user?.role)).map(item => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                active ? "bg-white text-primary shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container-high font-medium"
              )}
            >
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/inbox" && unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-white">{unreadCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="pt-4 border-t border-outline-variant/20 relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-xl overflow-hidden">
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
              <Link href="/settings" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>manage_accounts</span>
                Profile &amp; settings
              </Link>
              <Link href="/settings/members" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
                Members
              </Link>
            </div>
            <div className="p-2 border-t border-outline-variant/10">
              <button onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Sign out
              </button>
            </div>
          </div>
        )}

        <button onClick={() => setMenuOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-3 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors">
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
