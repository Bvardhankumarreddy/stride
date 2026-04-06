"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { useState, useRef, useCallback } from "react";
import clsx from "clsx";

interface MentionUser {
  id: string;
  name: string | null;
  initials: string | null;
}

interface CommentEditorProps {
  placeholder?: string;
  users?: MentionUser[];
  onSubmit: (html: string) => void;
  submitting?: boolean;
  onCancel?: () => void;
  initialContent?: string;
  submitLabel?: string;
}

export default function CommentEditor({
  placeholder = "Write a comment...",
  users = [],
  onSubmit,
  submitting = false,
  onCancel,
  initialContent = "",
  submitLabel = "Send",
}: CommentEditorProps) {
  const [menu, setMenu] = useState<{
    active: boolean;
    items: MentionUser[];
    rect: DOMRect | null;
    command: ((item: { id: string; label: string }) => void) | null;
    selectedIndex: number;
  }>({ active: false, items: [], rect: null, command: null, selectedIndex: 0 });

  const menuRef = useRef(menu);
  menuRef.current = menu;

  const select = useCallback((item: MentionUser) => {
    menuRef.current.command?.({ id: item.id, label: item.name ?? item.id });
    setMenu(m => ({ ...m, active: false }));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "mention text-primary font-semibold" },
        suggestion: {
          items: ({ query }: { query: string }) =>
            users.filter(u => (u.name ?? "").toLowerCase().startsWith(query.toLowerCase())).slice(0, 6),
          render: () => ({
            onStart: (props: any) => {
              setMenu({ active: true, items: props.items, rect: props.clientRect?.() ?? null, command: props.command, selectedIndex: 0 });
            },
            onUpdate: (props: any) => {
              setMenu(m => ({ ...m, items: props.items, rect: props.clientRect?.() ?? null, command: props.command, selectedIndex: 0 }));
            },
            onExit: () => {
              setMenu(m => ({ ...m, active: false }));
            },
            onKeyDown: (props: any) => {
              const { event } = props;
              const cur = menuRef.current;
              if (!cur.active || cur.items.length === 0) return false;
              if (event.key === "ArrowDown") {
                setMenu(m => ({ ...m, selectedIndex: (m.selectedIndex + 1) % m.items.length }));
                return true;
              }
              if (event.key === "ArrowUp") {
                setMenu(m => ({ ...m, selectedIndex: (m.selectedIndex - 1 + m.items.length) % m.items.length }));
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                const item = cur.items[cur.selectedIndex];
                if (item) { cur.command?.({ id: item.id, label: item.name ?? item.id }); setMenu(m => ({ ...m, active: false })); }
                return true;
              }
              if (event.key === "Escape") {
                setMenu(m => ({ ...m, active: false }));
                return true;
              }
              return false;
            },
          }),
        },
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[40px] text-on-surface font-body text-base leading-relaxed [&_.mention]:text-primary [&_.mention]:font-semibold",
      },
    },
  });

  const isEmpty = !editor || editor.isEmpty;

  return (
    <div className="relative">
      <EditorContent editor={editor} />

      {/* @mention dropdown */}
      {menu.active && menu.items.length > 0 && menu.rect && (
        <div
          className="fixed z-[200] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 min-w-[160px]"
          style={{ top: menu.rect.bottom + 4, left: menu.rect.left }}
        >
          {menu.items.map((item, i) => (
            <button
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); select(item); }}
              className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left",
                i === menu.selectedIndex ? "bg-primary/5 text-primary" : "text-on-surface hover:bg-surface-container-low"
              )}
            >
              <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {item.initials ?? "?"}
              </span>
              {item.name ?? item.id}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs font-bold px-3 py-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            if (!editor || isEmpty) return;
            onSubmit(editor.getHTML());
            editor.commands.clearContent();
          }}
          disabled={submitting || isEmpty}
          className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {submitting ? "Sending…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
