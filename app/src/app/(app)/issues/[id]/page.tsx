"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useToken } from "@/lib/useToken";
import { useSession } from "next-auth/react";
import { api, ApiIssue, ApiCustomField, apiFetch } from "@/lib/api";
import { toast } from "@/components/Toast";

const PRIORITY_COLORS: Record<string, { label: string; icon: string; color: string }> = {
  urgent: { label: "Urgent",  icon: "keyboard_double_arrow_up", color: "text-red-600" },
  high:   { label: "High",    icon: "keyboard_double_arrow_up", color: "text-orange-600" },
  medium: { label: "Medium",  icon: "drag_handle",              color: "text-amber-600" },
  low:    { label: "Low",     icon: "keyboard_double_arrow_down",color: "text-slate-500" },
};

const STATUS_STYLES: Record<string, string> = {
  "in-progress": "bg-primary-container text-on-primary-container",
  "todo":        "bg-surface-container-high text-on-surface-variant",
  "done":        "bg-emerald-50 text-emerald-700",
  "in-review":   "bg-blue-50 text-blue-700",
};
const STATUS_LABELS: Record<string, string> = {
  "in-progress": "In Progress", "todo": "To Do", "done": "Done", "in-review": "In Review",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const { data: session } = useSession();
  const me = session?.user as any;

  const [issue, setIssue]           = useState<ApiIssue | null>(null);
  const [loading, setLoading]       = useState(true);
  const [comment, setComment]       = useState("");
  const [posting, setPosting]       = useState(false);
  const [customFields, setCustomFields] = useState<ApiCustomField[]>([]);
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !id) return;
    api.issues.get(token, id).then((iss) => {
      setIssue(iss);
      const initial: Record<string, string> = {};
      (iss.customFieldValues ?? []).forEach((v) => { initial[v.customFieldId] = v.value; });
      setFieldValues(initial);
    }).finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    api.customFields.list(token).then(setCustomFields).catch(() => {});
  }, [token]);

  async function saveFieldValues(values: Record<string, string>) {
    if (!token || !id) return;
    const entries = Object.entries(values)
      .filter(([, v]) => v !== "")
      .map(([fieldId, value]) => ({ fieldId, value }));
    try {
      await api.customFields.saveValues(token, id, entries);
    } catch {
      toast("Failed to save field");
    }
  }

  async function submitComment() {
    if (!comment.trim() || !token || !id) return;
    setPosting(true);
    try {
      await apiFetch(`/issues/${id}/comments`, token, {
        method: "POST",
        body: JSON.stringify({ body: comment }),
      });
      setComment("");
      const updated = await api.issues.get(token, id);
      setIssue(updated);
    } finally {
      setPosting(false);
    }
  }

  const priority = issue ? (PRIORITY_COLORS[issue.priority] ?? PRIORITY_COLORS.medium) : null;
  const labels: string[] = Array.isArray(issue?.labels) ? issue!.labels : [];

  return (
    <div className="bg-background min-h-screen">
      <TopBar
        breadcrumbs={[
          { label: "Issues", href: "/issues" },
          { label: issue?.sprint?.name ?? "Backlog", href: "/issues" },
          { label: id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied to clipboard"); }}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>share</span>
            </button>
            <Link href="/issues" className="p-2 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </Link>
          </div>
        }
      />

      <div className="pt-16 flex min-h-screen">
        {/* Left — main content */}
        <div className="flex-[0.65] bg-surface-container-lowest p-8 lg:p-14 overflow-y-auto pb-48">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-surface-container-low rounded w-3/4" />
              <div className="h-4 bg-surface-container-low rounded w-1/2" />
              <div className="h-32 bg-surface-container-low rounded" />
            </div>
          ) : issue ? (
            <>
              <section className="mb-8">
                <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-[1.1]">
                  {issue.title}
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${STATUS_STYLES[issue.status] ?? STATUS_STYLES.todo}`}>
                    {STATUS_LABELS[issue.status] ?? issue.status}
                  </span>
                  {priority && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold tracking-wide uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {priority.label} Priority
                    </span>
                  )}
                  {labels.map((l) => (
                    <span key={l} className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold tracking-wide uppercase">{l}</span>
                  ))}
                </div>
              </section>

              {issue.description && (
                <article>
                  <p className="font-body text-xl text-on-surface-variant mb-6 leading-relaxed">{issue.description}</p>
                </article>
              )}

              {/* Comments */}
              <section className="mt-16 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forum</span>
                  Activity &amp; Comments
                  {issue.comments && issue.comments.length > 0 && (
                    <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">{issue.comments.length}</span>
                  )}
                </h3>
                <div className="space-y-8">
                  {(issue.comments ?? []).map((c) => (
                    <div key={c.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-on-surface-variant">{c.author?.initials ?? "?"}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-on-surface">{c.author?.name ?? "Unknown"}</span>
                          <span className="text-[11px] text-on-surface-variant">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="font-body text-lg text-on-surface-variant leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Comment box */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      {(me as any)?.initials ?? "?"}
                    </div>
                    <div className="flex-1 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 font-body text-lg resize-none text-on-surface placeholder:text-outline"
                        placeholder="Write a comment..."
                        rows={2}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={submitComment}
                          disabled={posting || !comment.trim()}
                          className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {posting ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="text-on-surface-variant">Issue not found.</p>
          )}
        </div>

        {/* Right — metadata sidebar */}
        <aside className="hidden md:flex flex-[0.35] flex-col bg-surface-container-low border-l border-outline-variant/10 p-8 lg:p-10 space-y-10 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-6">Details</h3>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-surface-container-high rounded" />)}
              </div>
            ) : issue && (
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-semibold text-on-surface">{STATUS_LABELS[issue.status] ?? issue.status}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Priority</p>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${priority?.color ?? ""}`} style={{ fontSize: 16 }}>{priority?.icon}</span>
                    <span className={`text-sm font-semibold ${priority?.color ?? ""}`}>{priority?.label}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Assignee</p>
                  {issue.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">{issue.assignee.initials}</div>
                      <span className="text-sm font-semibold text-on-surface">{issue.assignee.name}</span>
                    </div>
                  ) : <span className="text-sm text-outline italic">Unassigned</span>}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Due Date</p>
                  <span className="text-sm font-semibold text-on-surface">
                    {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </span>
                </div>
                {issue.project && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Project</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>rocket_launch</span>
                      <span className="text-sm font-semibold text-on-surface">{issue.project.name}</span>
                    </div>
                  </div>
                )}
                {issue.sprint && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Sprint</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>refresh</span>
                      <span className="text-sm font-semibold text-on-surface">{issue.sprint.name}</span>
                    </div>
                  </div>
                )}
                {issue.estimate && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Estimate</p>
                    <span className="text-sm font-semibold text-on-surface">{issue.estimate} pts</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Custom Fields */}
          {customFields.length > 0 && issue && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-6">Custom Fields</h3>
              <div className="space-y-4">
                {customFields.map((field) => {
                  const val = fieldValues[field.id] ?? "";
                  const handleChange = (newVal: string) => {
                    const updated = { ...fieldValues, [field.id]: newVal };
                    setFieldValues(updated);
                    if (field.type === "checkbox" || field.type === "select") {
                      saveFieldValues(updated);
                    }
                  };
                  return (
                    <div key={field.id} className="space-y-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                        {field.name}
                        {field.required && <span className="text-red-500">*</span>}
                      </p>
                      {field.type === "text" && (
                        <input type="text" value={val}
                          onChange={(e) => handleChange(e.target.value)}
                          onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="—"
                        />
                      )}
                      {field.type === "number" && (
                        <input type="number" value={val}
                          onChange={(e) => handleChange(e.target.value)}
                          onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="0"
                        />
                      )}
                      {field.type === "date" && (
                        <input type="date" value={val}
                          onChange={(e) => handleChange(e.target.value)}
                          onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      )}
                      {field.type === "select" && (
                        <select value={val} onChange={(e) => handleChange(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">—</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === "checkbox" && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={val === "true"}
                            onChange={(e) => handleChange(e.target.checked ? "true" : "false")}
                            className="w-4 h-4 rounded text-primary"
                          />
                          <span className="text-sm text-on-surface">{val === "true" ? "Yes" : "No"}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* AI Intelligence */}
          <section className="p-5 bg-secondary/5 rounded-2xl border border-secondary/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-secondary text-5xl">auto_awesome</span>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-secondary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI Intelligence
            </h3>
            <div className="space-y-2">
              {["Generate acceptance criteria", "Summarize thread", "Find similar issues"].map((action) => (
                <button
                  key={action}
                  onClick={() => document.dispatchEvent(new CustomEvent("stride:openCommandBar", { detail: { query: action } }))}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl text-sm font-bold text-on-surface-variant hover:text-secondary hover:shadow-sm transition-all group"
                >
                  {action}
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
