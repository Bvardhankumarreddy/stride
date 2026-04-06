"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CollaborativeDocEditor from "@/components/CollaborativeDocEditor";
import { useToken } from "@/lib/useToken";
import { api, ApiDoc } from "@/lib/api";
import { toast } from "@/components/Toast";

const FALLBACK_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
};

export default function DocEditorPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [doc, setDoc] = useState<ApiDoc | null>(null);
  const [visibility, setVisibility] = useState<"private" | "org" | "public">("org");
  const [revisions, setRevisions] = useState(1);

  useEffect(() => {
    if (!token || !id) return;
    api.docs.get(token, id).then((d) => {
      setDoc(d);
      setVisibility((d.visibility as "private" | "org" | "public") ?? "org");
      const saved = localStorage.getItem(`stride:doc:${id}:revisions`);
      if (saved) setRevisions(parseInt(saved, 10));
    }).catch(() => {});
  }, [token, id]);

  async function handleVisibilityChange(v: "private" | "org" | "public") {
    if (!token || !id) return;
    setVisibility(v);
    await api.docs.update(token, id, { visibility: v }).catch(() => {});
  }

  async function handleSave(content: object, wordCount: number) {
    if (!token || !id) return;
    try {
      await api.docs.update(token, id, { content, wordCount });
      setRevisions(prev => {
        const next = prev + 1;
        localStorage.setItem(`stride:doc:${id}:revisions`, String(next));
        return next;
      });
      toast("Document saved");
    } catch {
      toast("Failed to save document");
    }
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const created = new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <CollaborativeDocEditor
      docId={id}
      initialContent={(doc.content && typeof doc.content === "object" ? doc.content : FALLBACK_CONTENT) as object}
      breadcrumbs={[{ label: "Specs", href: "/docs" }, { label: doc.title }]}
      docTitle={doc.title}
      docEmoji={doc.emoji || "📄"}
      docMeta={{
        author: doc.author?.name ?? "Unknown",
        authorInitials: doc.author?.initials ?? "?",
        created,
        revisions,
      }}
      visibility={visibility}
      onVisibilityChange={handleVisibilityChange}
      onSave={handleSave}
    />
  );
}
