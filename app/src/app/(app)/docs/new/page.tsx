"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

const EMOJI_OPTIONS = ["📄", "📝", "📋", "📌", "📎", "🗒️", "💡", "🔍", "⚙️", "🚀", "✅", "📊", "🎯", "🛠️", "📐"];

export default function NewDocPage() {
  const router = useRouter();
  const token = useToken();

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📄");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setSaving(true);
    try {
      const doc = await api.docs.create(token, {
        title: title.trim(),
        emoji,
        status: "draft",
      });
      toast("Document created");
      router.push(`/docs/${doc.id}`);
    } catch (err: any) {
      toast(err.message ?? "Failed to create document");
      setSaving(false);
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <TopBar breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "New document" }]} />

      <main className="pt-20 pb-24 max-w-xl mx-auto px-6">
        <div className="pt-8">
          <h1 className="text-2xl font-black tracking-tight text-on-surface font-headline mb-1">New document</h1>
          <p className="text-sm text-on-surface-variant mb-8">Give it a title and pick an icon to get started.</p>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Emoji picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      emoji === e
                        ? "bg-primary/10 ring-2 ring-primary/40 scale-110"
                        : "bg-surface-container hover:bg-surface-container-high"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="title">
                Title
              </label>
              <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
                <span className="text-3xl select-none">{emoji}</span>
                <input
                  id="title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled document"
                  required
                  className="flex-1 text-lg font-semibold bg-transparent focus:outline-none text-on-surface placeholder:text-outline"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/docs")}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "Creating…" : "Create document"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
