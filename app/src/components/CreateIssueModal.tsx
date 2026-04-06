"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/lib/useToken";
import { api, ApiUser, ApiCustomField, ApiIssueTemplate } from "@/lib/api";
import { toast } from "@/components/Toast";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";

const BUILTIN_TEMPLATES: Omit<ApiIssueTemplate, "id" | "createdAt" | "createdBy">[] = [
  {
    name: "Bug Report",
    description: "Something isn't working as expected",
    titlePrefix: "Bug: ",
    body: "## Steps to Reproduce\n1. \n2. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n- OS: \n- Browser/Version: ",
    priority: "high",
    labels: ["bug"],
  },
  {
    name: "Feature Request",
    description: "Suggest a new feature or improvement",
    titlePrefix: "Feature: ",
    body: "## Problem\n\n## Proposed Solution\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n\n## Additional Context",
    priority: "medium",
    labels: ["feature"],
  },
  {
    name: "Task",
    description: "A unit of work to be completed",
    titlePrefix: "",
    body: "## What needs to be done\n\n## Definition of Done\n- [ ] ",
    priority: "medium",
    labels: [],
  },
];

export default function CreateIssueModal() {
  const token = useToken();
  const { open, defaultStatus, closeModal } = useCreateIssueStore();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [customFields, setCustomFields] = useState<ApiCustomField[]>([]);
  const [cfValues, setCfValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<ApiIssueTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setTitle("");
    setStatus(defaultStatus);
    setPriority("medium");
    setAssigneeId("");
    setDescription("");
    setCfValues({});
    setShowTemplates(false);
    Promise.all([
      api.users.list(token),
      api.customFields.list(token),
      api.projects.list(token),
      api.templates.list(token),
    ]).then(([u, cf, projects, tmpl]) => {
      setUsers(u);
      setCustomFields(cf);
      setDefaultProjectId(projects[0]?.id ?? null);
      setCustomTemplates(tmpl);
    }).catch(() => {});
  }, [open, token, defaultStatus]);

  function applyTemplate(tmpl: typeof BUILTIN_TEMPLATES[0] | ApiIssueTemplate) {
    if (tmpl.titlePrefix) setTitle(tmpl.titlePrefix);
    if (tmpl.body) setDescription(tmpl.body);
    if (tmpl.priority) setPriority(tmpl.priority);
    setShowTemplates(false);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeModal]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setSaving(true);
    try {
      const issue = await api.issues.create(token, {
        title: title.trim(),
        status,
        priority,
        description: description.trim() || undefined,
        assigneeId: assigneeId || undefined,
        projectId: defaultProjectId || undefined,
      });
      // Save custom field values if any were filled in
      const entries = Object.entries(cfValues).filter(([, v]) => v.trim() !== "");
      if (entries.length > 0) {
        await api.customFields.saveValues(token, issue.id, entries.map(([fieldId, value]) => ({ fieldId, value })));
      }
      toast("Issue created");
      window.dispatchEvent(new CustomEvent("stride:issueCreated"));
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
          <div className="flex items-center gap-2">
            {/* Template picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>description</span>
                Templates
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{showTemplates ? "expand_less" : "expand_more"}</span>
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xl z-10 overflow-hidden">
                  {[...BUILTIN_TEMPLATES, ...customTemplates].map((tmpl, i) => (
                    <button
                      key={"id" in tmpl ? (tmpl as ApiIssueTemplate).id : i}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0"
                    >
                      <p className="text-sm font-semibold text-on-surface">{tmpl.name}</p>
                      {tmpl.description && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{tmpl.description}</p>}
                    </button>
                  ))}
                  {BUILTIN_TEMPLATES.length + customTemplates.length === 0 && (
                    <p className="px-4 py-3 text-xs text-on-surface-variant">No templates available</p>
                  )}
                </div>
              )}
            </div>
            <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
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

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Custom Fields</label>
              {customFields.map(cf => (
                <div key={cf.id} className="space-y-1">
                  <label className="text-xs text-on-surface-variant">
                    {cf.name}{cf.required && <span className="text-error ml-0.5">*</span>}
                  </label>
                  {cf.type === "select" ? (
                    <select
                      value={cfValues[cf.id] ?? ""}
                      onChange={e => setCfValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    >
                      <option value="">— select —</option>
                      {cf.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : cf.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={cfValues[cf.id] === "true"}
                      onChange={e => setCfValues(prev => ({ ...prev, [cf.id]: e.target.checked ? "true" : "false" }))}
                      className="accent-primary"
                    />
                  ) : (
                    <input
                      type={cf.type === "number" ? "number" : cf.type === "date" ? "date" : "text"}
                      value={cfValues[cf.id] ?? ""}
                      onChange={e => setCfValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

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
