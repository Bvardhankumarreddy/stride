"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import clsx from "clsx";

interface DocEditorProps {
  initialContent?: object;
  onChange?: (json: object, wordCount: number) => void;
  readOnly?: boolean;
}

const TOOLBAR_ACTIONS: { label: string; command: "bold" | "italic" | "strike"; title: string; style?: string }[] = [
  { label: "B", command: "bold", title: "Bold (⌘B)" },
  { label: "I", command: "italic", title: "Italic (⌘I)", style: "italic" },
  { label: "S", command: "strike", title: "Strikethrough", style: "line-through" },
];

export default function DocEditor({ initialContent, onChange, readOnly = false }: DocEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing…",
      }),
      CharacterCount,
    ],
    content: initialContent ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    editable: !readOnly,
    onUpdate({ editor }) {
      const words = editor.storage.characterCount.words() as number;
      onChange?.(editor.getJSON(), words);
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const wordCount = editor.storage.characterCount.words() as number;

  return (
    <div className="relative">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 mb-4 p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/10 w-fit">
          {TOOLBAR_ACTIONS.map(({ label, command, title, style }) => (
            <button
              key={command}
              title={title}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleMark(command).run();
              }}
              className={clsx(
                "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                style,
                editor.isActive(command)
                  ? "bg-primary text-white"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-5 bg-outline-variant/20 mx-1" />

          {(["heading", "bulletList", "orderedList", "blockquote"] as const).map((type) => {
            const icons: Record<string, string> = {
              heading: "title",
              bulletList: "format_list_bulleted",
              orderedList: "format_list_numbered",
              blockquote: "format_quote",
            };
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
                  editor.isActive(type) || editor.isActive("heading", { level: 2 })
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icons[type]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="tiptap-editor font-body text-lg text-on-surface/90 leading-relaxed focus:outline-none min-h-[200px]"
      />

      {/* Word count */}
      <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between text-xs text-outline font-label">
        <span>{wordCount} words</span>
        <span>{Math.ceil(wordCount / 200)} min read</span>
      </div>
    </div>
  );
}
