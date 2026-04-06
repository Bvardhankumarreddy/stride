"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useToken } from "@/lib/useToken";
import { useSession } from "next-auth/react";
import { api, ApiIssue, ApiCustomField, ApiUser, ApiIssueActivity, apiFetch } from "@/lib/api";
import CommentEditor from "@/components/CommentEditor";
import { toast } from "@/components/Toast";

const STATUSES = [
  { value: "todo",        label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "in-review",  label: "In Review" },
  { value: "done",        label: "Done" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent",  icon: "keyboard_double_arrow_up",   color: "text-red-600" },
  { value: "high",   label: "High",    icon: "keyboard_double_arrow_up",   color: "text-orange-600" },
  { value: "medium", label: "Medium",  icon: "drag_handle",                color: "text-amber-600" },
  { value: "low",    label: "Low",     icon: "keyboard_double_arrow_down", color: "text-slate-500" },
];

const STATUS_STYLES: Record<string, string> = {
  "in-progress": "bg-primary-container text-on-primary-container",
  "todo":        "bg-surface-container-high text-on-surface-variant",
  "done":        "bg-emerald-50 text-emerald-700",
  "in-review":   "bg-blue-50 text-blue-700",
};

const LABELS_OPTIONS = ["bug", "feature", "improvement", "docs", "infra", "design"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

const selectCls = "w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer";
const inputCls  = "w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40";

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const { data: session } = useSession();
  const me = session?.user as any;

  const [issue, setIssue]               = useState<ApiIssue | null>(null);
  const [loading, setLoading]           = useState(true);
  const [posting, setPosting]           = useState(false);
  const [customFields, setCustomFields] = useState<ApiCustomField[]>([]);
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({});
  const [users, setUsers]               = useState<ApiUser[]>([]);
  const [sprints, setSprints]           = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity]         = useState<ApiIssueActivity[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Inline title / description editing
  const [editingTitle, setEditingTitle]       = useState(false);
  const [titleDraft, setTitleDraft]           = useState("");
  const [editingDesc, setEditingDesc]         = useState(false);
  const [descDraft, setDescDraft]             = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!token || !id) return;
    api.issues.get(token, id).then((iss) => {
      setIssue(iss);
      setTitleDraft(iss.title);
      setDescDraft(iss.description ?? "");
      const initial: Record<string, string> = {};
      (iss.customFieldValues ?? []).forEach((v) => { initial[v.customFieldId] = v.value; });
      setFieldValues(initial);
    }).finally(() => setLoading(false));
    api.issues.activity(token, id).then(setActivity).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    api.customFields.list(token).then(setCustomFields).catch(() => {});
    api.users.list(token).then(setUsers).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !issue) return;
    // Use issue.projectId if set, otherwise fall back to the org's first project
    const fetchSprints = async () => {
      const pid = issue.projectId ?? (await api.projects.list(token))[0]?.id;
      if (pid) api.sprints.list(token, pid).then(setSprints).catch(() => {});
    };
    fetchSprints();
  }, [token, issue?.id]);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingDesc)  descRef.current?.focus(); }, [editingDesc]);

  async function patch(update: Record<string, unknown>) {
    if (!token || !id) return;
    try {
      const updated = await api.issues.update(token, id, update as any);
      setIssue(updated);
    } catch {
      toast("Failed to update");
    }
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== issue?.title) {
      await patch({ title: titleDraft.trim() });
    }
  }

  async function saveDesc() {
    setEditingDesc(false);
    if (descDraft !== (issue?.description ?? "")) {
      await patch({ description: descDraft });
    }
  }

  async function saveFieldValues(values: Record<string, string>) {
    if (!token || !id) return;
    const entries = Object.entries(values)
      .filter(([, v]) => v !== "")
      .map(([fieldId, value]) => ({ fieldId, value }));
    try { await api.customFields.saveValues(token, id, entries); }
    catch { toast("Failed to save field"); }
  }


  const priority = issue ? (PRIORITIES.find((p) => p.value === issue.priority) ?? PRIORITIES[2]) : null;
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
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied"); }}
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
        {/* ── Left — main content ── */}
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
                {/* Editable title */}
                {editingTitle ? (
                  <input
                    ref={titleRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(issue.title); } }}
                    className="w-full font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-[1.1] bg-surface-container-low rounded-xl px-3 py-1 border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ) : (
                  <h1
                    onClick={() => { setEditingTitle(true); setTitleDraft(issue.title); }}
                    className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-[1.1] cursor-text hover:bg-surface-container-low rounded-xl px-3 py-1 -mx-3 transition-colors group"
                  >
                    {issue.title}
                    <span className="material-symbols-outlined text-on-surface-variant/30 opacity-0 group-hover:opacity-100 transition-opacity ml-2 align-middle" style={{ fontSize: 20 }}>edit</span>
                  </h1>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${STATUS_STYLES[issue.status] ?? STATUS_STYLES.todo}`}>
                    {STATUSES.find((s) => s.value === issue.status)?.label ?? issue.status}
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

              {/* Editable description */}
              <article className="mb-8">
                {editingDesc ? (
                  <div>
                    <textarea
                      ref={descRef}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      onBlur={saveDesc}
                      rows={6}
                      className="w-full font-body text-lg text-on-surface-variant leading-relaxed bg-surface-container-low rounded-xl px-3 py-2 border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      placeholder="Add a description…"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveDesc} className="text-xs font-bold px-3 py-1.5 bg-primary text-white rounded-lg">Save</button>
                      <button onClick={() => { setEditingDesc(false); setDescDraft(issue.description ?? ""); }} className="text-xs font-bold px-3 py-1.5 border border-outline-variant rounded-lg text-on-surface-variant">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setEditingDesc(true); setDescDraft(issue.description ?? ""); }}
                    className="cursor-text group relative"
                  >
                    {issue.description ? (
                      <p className="font-body text-xl text-on-surface-variant leading-relaxed hover:bg-surface-container-low rounded-xl px-3 py-2 -mx-3 transition-colors">
                        {issue.description}
                      </p>
                    ) : (
                      <p className="font-body text-base text-outline italic hover:bg-surface-container-low rounded-xl px-3 py-2 -mx-3 transition-colors">
                        Add a description…
                      </p>
                    )}
                    <span className="material-symbols-outlined text-on-surface-variant/30 opacity-0 group-hover:opacity-100 absolute top-2 right-0 transition-opacity" style={{ fontSize: 16 }}>edit</span>
                  </div>
                )}
              </article>

              {/* Comments */}
              <section className="mt-10 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forum</span>
                  Activity &amp; Comments
                  {issue.comments && issue.comments.length > 0 && (
                    <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">{issue.comments.length}</span>
                  )}
                </h3>
                <div className="space-y-8">
                  {activity.map((a) => (
                    <div key={a.id} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center mt-0.5">
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 12 }}>
                          {a.type === "created" ? "add_circle" : a.type === "status_changed" ? "swap_horiz" : a.type === "assignee_changed" ? "person" : a.type === "priority_changed" ? "priority_high" : "edit"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          <span className="font-semibold text-on-surface">{a.user?.name ?? "Someone"}</span>
                          {" "}
                          {a.type === "created" && "created this issue"}
                          {a.type === "status_changed" && <><span>changed status from </span><span className="font-semibold text-on-surface">{a.from}</span><span> to </span><span className="font-semibold text-on-surface">{a.to}</span></>}
                          {a.type === "assignee_changed" && <><span>reassigned from </span><span className="font-semibold text-on-surface">{a.from}</span><span> to </span><span className="font-semibold text-on-surface">{a.to}</span></>}
                          {a.type === "priority_changed" && <><span>changed priority from </span><span className="font-semibold text-on-surface">{a.from}</span><span> to </span><span className="font-semibold text-on-surface">{a.to}</span></>}
                        </p>
                        <p className="text-[10px] text-outline mt-0.5">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}

                  {(issue.comments ?? []).map((c) => (
                    <div key={c.id} className="flex gap-4 group/comment">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-on-surface-variant">{c.author?.initials ?? "?"}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-on-surface">{c.author?.name ?? "Unknown"}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-on-surface-variant">{timeAgo(c.createdAt)}</span>
                            {c.author?.id === me?.id && editingCommentId !== c.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={() => { setEditingCommentId(c.id); setEditCommentDraft(c.body); }}
                                  className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                                  title="Edit comment"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                                </button>
                                <button
                                  onClick={() => setDeletingCommentId(c.id)}
                                  className="p-1 rounded hover:bg-red-50 text-on-surface-variant hover:text-red-500 transition-colors"
                                  title="Delete comment"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="p-3 bg-surface-container-low rounded-xl border border-primary/20">
                            <CommentEditor
                              users={users}
                              initialContent={editCommentDraft}
                              submitLabel="Save"
                              onCancel={() => setEditingCommentId(null)}
                              onSubmit={async (html) => {
                                if (!token) return;
                                try {
                                  await api.comments.update(token, id, c.id, { body: html });
                                  const updated = await api.issues.get(token, id);
                                  setIssue(updated);
                                  setEditingCommentId(null);
                                } catch { toast("Failed to update comment"); }
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="font-body text-base text-on-surface-variant leading-relaxed prose prose-sm max-w-none [&_.mention]:text-primary [&_.mention]:font-semibold"
                            dangerouslySetInnerHTML={{ __html: c.body }}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Delete confirmation */}
                  {deletingCommentId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-on-surface mb-2">Delete comment?</h3>
                        <p className="text-sm text-on-surface-variant mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDeletingCommentId(null)}
                            className="flex-1 py-2 rounded-lg border border-outline-variant text-sm font-bold text-on-surface-variant hover:bg-surface-container"
                          >Cancel</button>
                          <button
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await api.comments.remove(token, id, deletingCommentId);
                                const updated = await api.issues.get(token, id);
                                setIssue(updated);
                                setDeletingCommentId(null);
                              } catch { toast("Failed to delete comment"); }
                            }}
                            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600"
                          >Delete</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      {me?.initials ?? "?"}
                    </div>
                    <div className="flex-1 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                      <CommentEditor
                        users={users}
                        submitting={posting}
                        onSubmit={async (html) => {
                          if (!token || !id) return;
                          setPosting(true);
                          try {
                            await apiFetch(`/issues/${id}/comments`, token, { method: "POST", body: JSON.stringify({ body: html }) });
                            const updated = await api.issues.get(token, id);
                            setIssue(updated);
                          } finally { setPosting(false); }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="text-on-surface-variant">Issue not found.</p>
          )}
        </div>

        {/* ── Right — editable metadata sidebar ── */}
        <aside className="hidden md:flex flex-[0.35] flex-col bg-surface-container-low border-l border-outline-variant/10 p-8 lg:p-10 space-y-8 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-surface-container-high rounded" />)}
            </div>
          ) : issue && (
            <>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-5">Details</h3>
                <div className="space-y-4">

                  <FieldRow label="Status">
                    <select value={issue.status} onChange={(e) => patch({ status: e.target.value })} className={selectCls}>
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </FieldRow>

                  <FieldRow label="Priority">
                    <select value={issue.priority} onChange={(e) => patch({ priority: e.target.value })} className={selectCls}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </FieldRow>

                  <FieldRow label="Assignee">
                    <select
                      value={issue.assignee?.id ?? ""}
                      onChange={(e) => patch({ assigneeId: e.target.value || null })}
                      className={selectCls}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                    </select>
                  </FieldRow>

                  <FieldRow label="Sprint">
                    <select
                      value={issue.sprint?.id ?? ""}
                      onChange={(e) => patch({ sprintId: e.target.value || null })}
                      className={selectCls}
                    >
                      <option value="">No sprint (Backlog)</option>
                      {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </FieldRow>

                  <FieldRow label="Due Date">
                    <input
                      type="date"
                      value={issue.dueDate ? new Date(issue.dueDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => patch({ dueDate: e.target.value || null })}
                      className={inputCls}
                    />
                  </FieldRow>

                  <FieldRow label="Estimate (pts)">
                    <input
                      type="number"
                      min={0}
                      value={issue.estimate ?? ""}
                      onChange={(e) => patch({ estimate: e.target.value ? Number(e.target.value) : undefined })}
                      className={inputCls}
                      placeholder="—"
                    />
                  </FieldRow>

                  <FieldRow label="Labels">
                    <div className="flex flex-wrap gap-1.5">
                      {LABELS_OPTIONS.map((opt) => {
                        const active = labels.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              const next = active ? labels.filter((l) => l !== opt) : [...labels, opt];
                              patch({ labels: next });
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                              active
                                ? "bg-primary text-white border-primary"
                                : "bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-primary/40"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </FieldRow>

                  {issue.project && (
                    <FieldRow label="Project">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/20">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>rocket_launch</span>
                        <span className="text-sm text-on-surface">{issue.project.name}</span>
                      </div>
                    </FieldRow>
                  )}
                </div>
              </section>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-5">Custom Fields</h3>
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
                        <FieldRow key={field.id} label={`${field.name}${field.required ? " *" : ""}`}>
                          {field.type === "text" && (
                            <input type="text" value={val} onChange={(e) => handleChange(e.target.value)}
                              onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                              className={inputCls} placeholder="—" />
                          )}
                          {field.type === "number" && (
                            <input type="number" value={val} onChange={(e) => handleChange(e.target.value)}
                              onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                              className={inputCls} placeholder="0" />
                          )}
                          {field.type === "date" && (
                            <input type="date" value={val} onChange={(e) => handleChange(e.target.value)}
                              onBlur={() => saveFieldValues({ ...fieldValues, [field.id]: val })}
                              className={inputCls} />
                          )}
                          {field.type === "select" && (
                            <select value={val} onChange={(e) => handleChange(e.target.value)} className={selectCls}>
                              <option value="">—</option>
                              {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                          {field.type === "checkbox" && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={val === "true"}
                                onChange={(e) => handleChange(e.target.checked ? "true" : "false")}
                                className="w-4 h-4 rounded text-primary" />
                              <span className="text-sm text-on-surface">{val === "true" ? "Yes" : "No"}</span>
                            </label>
                          )}
                        </FieldRow>
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
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
