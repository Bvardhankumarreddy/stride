"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";

interface CommandBarProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface RecentItem {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  href: string;
}

const QUICK_ACTIONS = [
  { label: "New Issue", icon: "add", variant: "primary", href: "/board" },
  { label: "New Doc", icon: "description", variant: "surface", href: "/docs/new" },
  { label: "This week's summary", emoji: "📊", variant: "ai", href: "/inbox" },
  { label: "Generate release notes", emoji: "🚀", variant: "ai", href: "/docs" },
];

export default function CommandBar({ open, onClose, initialQuery = "" }: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { openModal } = useCreateIssueStore();
  const token = useToken();
  const [query, setQuery] = useState("");
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (!open || !token) return;
    Promise.all([
      api.issues.list(token, { limit: "3" }),
      api.docs.list(token, { limit: "2" }),
    ]).then(([issuesRes, docsRes]) => {
      const items: RecentItem[] = [
        ...issuesRes.data.map(i => ({
          icon: "confirmation_number",
          iconBg: "bg-orange-100 text-orange-600",
          title: i.title,
          subtitle: `${i.status} · ${i.priority}`,
          href: `/issues/${i.id}`,
        })),
        ...docsRes.data.map(d => ({
          icon: "article",
          iconBg: "bg-blue-100 text-blue-600",
          title: d.title,
          subtitle: `Doc · ${d.status}`,
          href: `/docs/${d.id}`,
        })),
      ];
      setRecentItems(items);
    }).catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open, initialQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) onClose(); // toggle — parent controls open state
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-32 px-4"
      style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/10">
        {/* Search input */}
        <div className="flex items-center px-5 h-16 border-b border-outline-variant/10">
          <span
            className="material-symbols-outlined text-secondary mr-4"
            style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, create, or ask anything..."
            className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-on-surface placeholder:text-outline/60"
          />
          <kbd className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold text-outline uppercase tracking-wider border border-outline-variant/20">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="max-h-[480px] overflow-y-auto hide-scrollbar p-2">
          {/* Quick Actions */}
          <div className="px-3 py-3">
            <h3 className="text-[11px] font-bold text-outline uppercase tracking-[0.1em] mb-3 px-1">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => { if (action.label === "New Issue") { openModal(); onClose(); } else { router.push(action.href); onClose(); } }}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    action.variant === "primary" && "bg-primary text-white hover:opacity-90",
                    action.variant === "surface" && "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
                    action.variant === "ai" && "bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20"
                  )}
                >
                  {action.icon ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{action.icon}</span>
                  ) : (
                    <span>{action.emoji}</span>
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div className="px-3 py-2">
            <h3 className="text-[11px] font-bold text-outline uppercase tracking-[0.1em] mb-2 px-1">
              Recent
            </h3>
            <div className="space-y-0.5">
              {recentItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); onClose(); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 group cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 flex items-center justify-center rounded-lg", item.iconBg)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{item.title}</p>
                      <p className="text-xs text-outline font-body italic">{item.subtitle}</p>
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontSize: 20 }}
                  >
                    subdirectory_arrow_left
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-between">
          <p className="text-[11px] text-outline font-medium">
            Tip: Use{" "}
            <span className="text-primary font-bold">@</span> to mention,{" "}
            <span className="text-primary font-bold">#</span> for issues
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-outline-variant/30 rounded text-[10px] font-bold shadow-sm">
                TAB
              </kbd>
              <span className="text-[10px] text-outline font-bold uppercase tracking-tighter">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-outline-variant/30 rounded text-[10px] font-bold shadow-sm">
                ↵
              </kbd>
              <span className="text-[10px] text-outline font-bold uppercase tracking-tighter">Select</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
