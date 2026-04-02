import { create } from "zustand";

export interface AppNotification {
  id: string;
  type: "mention" | "assigned" | "review" | "status" | "ai" | "comment";
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  issueId: string | null;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  hydrated: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setNotifications: (notifications: AppNotification[]) => void;
}

export const ICON_MAP: Record<string, { icon: string; iconBg: string }> = {
  mention: { icon: "alternate_email", iconBg: "bg-primary/10 text-primary" },
  assigned: { icon: "person_add", iconBg: "bg-secondary/10 text-secondary" },
  review: { icon: "rate_review", iconBg: "bg-amber-100 text-amber-600" },
  status: { icon: "check_circle", iconBg: "bg-emerald-100 text-emerald-600" },
  ai: { icon: "auto_awesome", iconBg: "bg-secondary/10 text-secondary" },
  comment: { icon: "chat_bubble", iconBg: "bg-surface-container-high text-on-surface-variant" },
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  hydrated: false,

  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => n.unread).length };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, unread: false })),
      unreadCount: 0,
    })),

  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => n.unread).length, hydrated: true }),
}));
