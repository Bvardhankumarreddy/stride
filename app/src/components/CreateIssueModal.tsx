"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/lib/useToken";
import { api, ApiIssue, ApiUser } from "@/lib/api";
import { toast } from "@/components/Toast";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";

export default function CreateIssueModal() {
  const token = useToken();
  const { open, defaultStatus, closeModal } = useCreateIssueStore();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setTitle("");
    setStatus(defaultStatus);
    setPriority("medium");
    setAssigneeId("");
    setDescription("");
    api.users.list(token).then(setUsers).catch(() => {});
  }, [open, token, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeModal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setSaving(true);
    try {
      await api.issues.create(token, {
        title: title.trim(),
        status,
        priority,
        description: description.trim() || undefined,
        assigneeId: assigneeId || undefined,
      });
      toast("Issue created");
      closeModal();
    } catch (err: any) {
      toast(err.message ?? "Failed to create issue");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-outline-variant/10">
          <h2 className="text-base font-bold text-on-surface">New Issue</h2>
          <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            required
            className="w-full px-4 py-3 text-base font-medium bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface placeholder:text-outline"
          />

          {/* Status + Priority */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="in-review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          {users.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={3}
              className="w-full px-4 py-3 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface placeholder:text-outline resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Creating…" : "Create issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
