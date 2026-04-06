"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api, ApiNotification } from "@/lib/api";
import { useNotificationStore, ICON_MAP, AppNotification } from "@/store/useNotificationStore";

const TABS = ["All", "Mentions", "Assigned", "AI Digest"];

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

export default function InboxPage() {
  const token = useToken();
  const { notifications, unreadCount, markRead, markAllRead, setNotifications } = useNotificationStore();
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.notifications.list(token, { limit: "50" }).then((res) => {
      setNotifications(res.data.map(mapNotification));
    }).finally(() => setLoading(false));
  }, [token, setNotifications]);

  async function handleMarkRead(id: string) {
    markRead(id);
    if (token) api.notifications.markRead(token, id).catch(() => {});
  }

  async function handleMarkAllRead() {
    markAllRead();
    if (token) api.notifications.markAllRead(token).catch(() => {});
  }

  const filtered = notifications.filter((n) => {
    if (activeTab === "Mentions") return n.type === "mention";
    if (activeTab === "Assigned") return n.type === "assigned";
    if (activeTab === "AI Digest") return n.type === "ai";
    return true;
  });

  return (
    <div className="bg-background min-h-screen">
      <TopBar breadcrumbs={[{ label: "Inbox" }]} />

      <main className="pt-20 pb-28 md:pb-10 max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Inbox</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">{loading ? "…" : unreadCount} unread notifications</p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
            Mark all read
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "flex-1 px-3 py-1.5 text-sm rounded-lg transition-all font-medium",
                tab === activeTab ? "bg-surface-container-lowest text-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {tab}
              {tab === "All" && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-10">No notifications.</p>
          ) : filtered.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif.id)}
              className={clsx(
                "relative flex gap-4 p-4 rounded-xl transition-colors cursor-pointer group",
                notif.unread ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-surface-container-low"
              )}
            >
              {notif.unread && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              <div className={clsx("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", notif.iconBg)}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                  {notif.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx("text-sm leading-snug", notif.unread ? "font-semibold text-on-surface" : "font-medium text-on-surface/80")}>
                  {notif.title}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                <span className="text-[10px] text-on-surface-variant/60 mt-1.5 block">{notif.time}</span>
              </div>
              {notif.issueId && (
                <span className="flex-shrink-0 text-[10px] font-bold text-on-surface-variant/50 self-start pt-1 font-label">
                  {notif.issueId}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* AI Digest banner */}
        <div className="mt-8 p-5 rounded-2xl bg-secondary/5 border border-secondary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="text-sm font-bold text-on-surface">AI Daily Digest</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Today</span>
          </div>
          <p className="text-sm text-on-surface/80 leading-relaxed">
            You have <strong>{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</strong>. Stay on top of your work by reviewing the latest updates.
          </p>
        </div>
      </main>
    </div>
  );
}
