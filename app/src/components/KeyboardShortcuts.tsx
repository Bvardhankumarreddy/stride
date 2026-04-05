"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";

const SHORTCUTS = [
  { keys: "c", description: "Create new issue" },
  { keys: "g i", description: "Go to Issues" },
  { keys: "g b", description: "Go to Board" },
  { keys: "g s", description: "Go to Sprints" },
  { keys: "g d", description: "Go to Dashboard" },
  { keys: "?", description: "Show keyboard shortcuts" },
];

export default function KeyboardShortcuts() {
  const router = useRouter();
  const { openModal } = useCreateIssueStore();
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let pendingKey: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea/select or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;

      // Skip if modifier keys are held (except shift for ?)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // Handle two-key sequences starting with "g"
      if (pendingKey === "g") {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingKey = null;
        setPending(null);

        if (key === "i") { e.preventDefault(); router.push("/issues"); return; }
        if (key === "b") { e.preventDefault(); router.push("/board"); return; }
        if (key === "s") { e.preventDefault(); router.push("/sprints"); return; }
        if (key === "d") { e.preventDefault(); router.push("/dashboard"); return; }
        return;
      }

      if (key === "g") {
        e.preventDefault();
        pendingKey = "g";
        setPending("g");
        pendingTimer = setTimeout(() => {
          pendingKey = null;
          setPending(null);
        }, 1000);
        return;
      }

      if (key === "c") {
        e.preventDefault();
        openModal();
        return;
      }

      if (key === "?") {
        e.preventDefault();
        setShowHelp(v => !v);
        return;
      }

      if (key === "Escape") {
        setShowHelp(false);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [router, openModal]);

  if (!showHelp) {
    return pending ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface-container-high rounded-xl shadow-lg text-sm text-on-surface font-mono">
        <span className="font-bold">{pending}</span>
        <span className="text-on-surface-variant ml-1">— press next key</span>
      </div>
    ) : null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-on-surface">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">{s.description}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-xs font-mono font-bold border border-outline-variant/20">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
