import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "@/store/useNotificationStore";

// Reset store state before each test
beforeEach(() => {
  useNotificationStore.setState({
    notifications: [
      { id: "a", type: "mention", icon: "alternate_email", iconBg: "", title: "T1", body: "B1", time: "1m ago", unread: true, issueId: "STR-1" },
      { id: "b", type: "status", icon: "check_circle", iconBg: "", title: "T2", body: "B2", time: "2m ago", unread: true, issueId: null },
      { id: "c", type: "ai", icon: "auto_awesome", iconBg: "", title: "T3", body: "B3", time: "3m ago", unread: false, issueId: null },
    ],
    unreadCount: 2,
  });
});

describe("useNotificationStore", () => {
  it("initialises with correct unread count", () => {
    expect(useNotificationStore.getState().unreadCount).toBe(2);
  });

  it("markRead reduces unreadCount by 1", () => {
    useNotificationStore.getState().markRead("a");
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(useNotificationStore.getState().notifications.find((n) => n.id === "a")?.unread).toBe(false);
  });

  it("markRead on already-read notification does not change count", () => {
    useNotificationStore.getState().markRead("c");
    expect(useNotificationStore.getState().unreadCount).toBe(2);
  });

  it("markAllRead sets unreadCount to 0", () => {
    useNotificationStore.getState().markAllRead();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().notifications.every((n) => !n.unread)).toBe(true);
  });

  it("setNotifications replaces list and recalculates count", () => {
    const fresh = [
      { id: "x", type: "comment" as const, icon: "chat_bubble", iconBg: "", title: "TX", body: "BX", time: "now", unread: true, issueId: null },
    ];
    useNotificationStore.getState().setNotifications(fresh);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
});
