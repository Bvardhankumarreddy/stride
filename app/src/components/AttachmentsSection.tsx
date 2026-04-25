"use client";

import { useState } from "react";
import { api, ApiAttachment } from "@/lib/api";
import { useToken } from "@/lib/useToken";
import { toast } from "@/components/Toast";

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(?:\?|$)/i;

function looksLikeImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

function inferTypeFromUrl(url: string): "link" | "image" {
  return looksLikeImageUrl(url) ? "image" : "link";
}

function formatBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  issueId: string;
  attachments: ApiAttachment[];
  onChange: (next: ApiAttachment[]) => void;
}

export default function AttachmentsSection({ issueId, attachments, onChange }: Props) {
  const token = useToken();
  const [adding, setAdding] = useState<null | "link" | "image">(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setAdding(null);
    setUrl("");
    setName("");
  }

  async function addAttachment(type: "link" | "image") {
    if (!token || !url.trim()) return;
    setSaving(true);
    try {
      // Auto-derive type if user pasted an image URL into the link form
      const finalType = type === "link" ? inferTypeFromUrl(url.trim()) : "image";
      const finalName = name.trim() || (() => {
        try { return new URL(url.trim()).hostname; } catch { return url.trim(); }
      })();
      const created = await api.issues.addAttachment(token, issueId, {
        type: finalType,
        url: url.trim(),
        name: finalName,
      });
      onChange([created, ...attachments]);
      reset();
    } catch (e: any) {
      toast(e.message ?? "Failed to add attachment");
    } finally {
      setSaving(false);
    }
  }

  async function remove(att: ApiAttachment) {
    if (!token) return;
    if (!confirm(`Remove "${att.name}"?`)) return;
    try {
      await api.issues.removeAttachment(token, issueId, att.id);
      onChange(attachments.filter((a) => a.id !== att.id));
    } catch (e: any) {
      toast(e.message ?? "Failed to remove attachment");
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_file</span>
          Attachments
          {attachments.length > 0 && (
            <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
              {attachments.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding("link")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>Link
          </button>
          <button
            onClick={() => setAdding("image")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>image</span>Image URL
          </button>
        </div>
      </div>

      {/* Existing attachments */}
      {attachments.length === 0 && !adding && (
        <p className="text-xs text-outline italic">No attachments yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((att) => (
          <div key={att.id} className="group relative flex items-start gap-3 p-3 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/40 transition-colors">
            {att.type === "image" ? (
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-outline-variant/20" loading="lazy" />
              </a>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                  {att.type === "file" ? "description" : "link"}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-on-surface hover:text-primary block truncate">
                {att.name}
              </a>
              <p className="text-[11px] text-on-surface-variant truncate">
                {att.type === "link" ? "Link" : (att.mimeType ?? att.type)}
                {att.size != null && att.size > 0 && ` · ${formatBytes(att.size)}`}
                {att.createdBy?.name && ` · ${att.createdBy.name}`}
              </p>
            </div>

            <button
              onClick={() => remove(att)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-outline hover:text-error flex-shrink-0"
              title="Remove"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {adding === "link" ? "Add link" : "Add image URL"}
          </p>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={adding === "image" ? "https://example.com/image.png" : "https://example.com"}
            className="w-full px-3 py-2 text-sm border border-outline-variant/20 rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full px-3 py-2 text-sm border border-outline-variant/20 rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
            >Cancel</button>
            <button
              onClick={() => addAttachment(adding)}
              disabled={saving || !url.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40"
            >{saving ? "Adding…" : "Add"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
