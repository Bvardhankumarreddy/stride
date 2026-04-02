"use client";

import { useState } from "react";
import { ClientSideSuspense } from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import clsx from "clsx";
import TopBar from "@/components/TopBar";
import { RoomProvider, useOthers, useSelf } from "@/liveblocks.config";
import { toast } from "@/components/Toast";

const TOOLBAR_ACTIONS: { label: string; command: "bold" | "italic" | "strike"; title: string; style?: string }[] = [
  { label: "B", command: "bold", title: "Bold (⌘B)" },
  { label: "I", command: "italic", title: "Italic (⌘I)", style: "italic" },
  { label: "S", command: "strike", title: "Strikethrough", style: "line-through" },
];

interface Props {
  docId: string;
  initialContent?: object;
  breadcrumbs: { label: string; href?: string }[];
  docTitle: string;
  docEmoji: string;
  docMeta: { author: string; authorInitials: string; created: string; revisions: number };
  visibility?: "private" | "org" | "public";
  onVisibilityChange?: (v: "private" | "org" | "public") => void;
  onSave?: (content: object, wordCount: number) => Promise<void>;
  children?: React.ReactNode;
}

function PresenceAvatars() {
  const others = useOthers();
  const self = useSelf();

  const all = [
    ...(self ? [{ id: "self", name: self.info?.name ?? "You", color: self.info?.color ?? "#1a73e8", initials: self.info?.initials ?? "?" }] : []),
    ...others.map((o) => ({
      id: String(o.connectionId),
      name: o.info?.name ?? "Someone",
      color: o.info?.color ?? "#6b38d4",
      initials: o.info?.initials ?? "?",
    })),
  ];

  return (
    <div className="flex -space-x-2 items-center">
      {all.slice(0, 4).map((user, i) => (
        <div
          key={user.id}
          title={user.name}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
          style={{ backgroundColor: user.color, zIndex: 4 - i }}
        >
          {user.initials}
        </div>
      ))}
      {all.length > 4 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container flex items-center justify-center text-[9px] font-bold text-outline">
          +{all.length - 4}
        </div>
      )}
      {all.length > 1 && (
        <span className="ml-3 text-xs text-on-surface-variant font-medium">
          {all.length - 1} editing
        </span>
      )}
    </div>
  );
}

const VISIBILITY_CONFIG = {
  private: { icon: "lock", label: "Private", next: "org" as const },
  org:     { icon: "group", label: "Team", next: "public" as const },
  public:  { icon: "public", label: "Public", next: "private" as const },
};

function CollabEditorInner({ initialContent, breadcrumbs, docTitle, docEmoji, docMeta, visibility = "org", onVisibilityChange, onSave, children }: Props) {
  const [saving, setSaving] = useState(false);
  const liveblocks = useLiveblocksExtension({
    initialContent,
    field: "content",
    comments: false,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      liveblocks,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing…",
      }),
      CharacterCount,
    ],
    editable: true,
    immediatelyRender: false,
  });

  const wordCount = (editor?.storage.characterCount.words() as number) ?? 0;

  const actions = (
    <div className="flex items-center gap-3">
      <span className="hidden md:flex items-center gap-2 text-on-surface-variant text-xs font-medium bg-surface-container-low px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Live
      </span>
      <PresenceAvatars />
      {onVisibilityChange && (() => {
        const cfg = VISIBILITY_CONFIG[visibility];
        return (
          <button
            onClick={() => onVisibilityChange(cfg.next)}
            title={`Visibility: ${cfg.label} — click to change`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/20"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cfg.icon}</span>
            {cfg.label}
          </button>
        );
      })()}
      {onSave && (
        <button
          onClick={async () => {
            if (!editor) return;
            setSaving(true);
            await onSave(editor.getJSON(), wordCount);
            setSaving(false);
          }}
          disabled={saving}
          className="bg-surface-container-high text-on-surface px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
          {saving ? "Saving…" : "Save"}
        </button>
      )}
      <button
        onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied to clipboard"); }}
        className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
      >
        Share
      </button>
    </div>
  );

  return (
    <div className="bg-background">
      <TopBar breadcrumbs={breadcrumbs} actions={actions} />

      <main className="pt-24 pb-32 px-6 min-h-screen relative flex justify-center">
        <article className="max-w-[720px] w-full">
          <header className="mb-10">
            <div className="text-6xl mb-6 select-none">{docEmoji}</div>
            <h1 className="font-headline font-extrabold text-4xl md:text-5xl tracking-tight text-on-surface leading-tight">
              {docTitle}
            </h1>
            <div className="flex items-center gap-3 mt-4 text-sm text-on-surface-variant flex-wrap">
              <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center">
                <span className="text-[8px] font-bold text-on-primary-fixed">{docMeta.authorInitials}</span>
              </div>
              <span>{docMeta.author}</span>
              <span>·</span>
              <span>Created {docMeta.created}</span>
              <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wide">Draft</span>
              <span className="hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant/60">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>history</span>
                {docMeta.revisions} revisions
              </span>
            </div>
          </header>

          {editor && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 mb-4 p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/10 w-fit">
                {TOOLBAR_ACTIONS.map(({ label, command, title, style }) => (
                  <button
                    key={command}
                    title={title}
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleMark(command).run(); }}
                    className={clsx(
                      "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                      style,
                      editor.isActive(command) ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <div className="w-px h-5 bg-outline-variant/20 mx-1" />
                {(["heading", "bulletList", "orderedList", "blockquote"] as const).map((type) => {
                  const icons: Record<string, string> = { heading: "title", bulletList: "format_list_bulleted", orderedList: "format_list_numbered", blockquote: "format_quote" };
                  const chains: Record<string, () => void> = {
                    heading: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                    bulletList: () => editor.chain().focus().toggleBulletList().run(),
                    orderedList: () => editor.chain().focus().toggleOrderedList().run(),
                    blockquote: () => editor.chain().focus().toggleBlockquote().run(),
                  };
                  return (
                    <button
                      key={type}
                      title={type}
                      onMouseDown={(e) => { e.preventDefault(); chains[type](); }}
                      className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        editor.isActive(type) ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-high"
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icons[type]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Editor */}
              <EditorContent
                editor={editor}
                className="tiptap-editor font-body text-lg text-on-surface/90 leading-relaxed focus:outline-none min-h-[200px]"
              />

              {/* Word count */}
              <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between text-xs text-outline font-label">
                <span>{wordCount} words</span>
                <span>{Math.ceil(wordCount / 200)} min read</span>
              </div>
            </>
          )}

          {children}
        </article>

      </main>
    </div>
  );
}

export default function CollaborativeDocEditor(props: Props) {
  return (
    <RoomProvider
      id={`doc-${props.docId}`}
      initialPresence={{ cursor: null, name: "", color: "" }}
    >
      <ClientSideSuspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center">
            <div className="flex items-center gap-3 text-on-surface-variant text-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Connecting…
            </div>
          </div>
        }
      >
        <CollabEditorInner {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
