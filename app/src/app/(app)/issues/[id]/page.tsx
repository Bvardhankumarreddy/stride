"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useToken } from "@/lib/useToken";
import { useSession, signIn } from "next-auth/react";
import { api, ApiIssue, ApiCustomField, ApiUser, ApiIssueActivity, ApiTimeLog, ApiAttachment, apiFetch, issueSlug, ApiError } from "@/lib/api";
import AttachmentsSection from "@/components/AttachmentsSection";
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

const LABELS_FALLBACK = ["bug", "feature", "improvement", "docs", "infra", "design"];

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

  // AI state
  const [aiPanel, setAiPanel]         = useState<"criteria" | "similar" | "summary" | "assign" | "pr" | null>(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiCriteria, setAiCriteria]   = useState<string[] | null>(null);
  const [aiSimilar, setAiSimilar]     = useState<{ id: string; title: string; reason: string; similarityScore: number }[] | null>(null);
  const [aiSummary, setAiSummary]     = useState<{ summary: string; keyDecisions: string[]; openQuestions: string[] } | null>(null);
  const [aiAssign, setAiAssign]       = useState<{ memberId: string; memberName: string; reason: string } | null>(null);
  const [aiPr, setAiPr]               = useState<{ title: string; body: string } | null>(null);
  const [allIssues, setAllIssues]     = useState<{ id: string; title: string; description?: string }[]>([]);

  // Time tracking state
  const [timeLogs, setTimeLogs]         = useState<ApiTimeLog[]>([]);
  const [timeLogsLoaded, setTimeLogsLoaded] = useState(false);
  const [showTimeLogs, setShowTimeLogs] = useState(false);
  const [logMinutes, setLogMinutes]     = useState("");
  const [logNote, setLogNote]           = useState("");
  const [loggingTime, setLoggingTime]   = useState(false);

  // Inline title / description editing
  const [editingTitle, setEditingTitle]       = useState(false);
  const [titleDraft, setTitleDraft]           = useState("");
  const [editingDesc, setEditingDesc]         = useState(false);
  const [descDraft, setDescDraft]             = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef  = useRef<HTMLTextAreaElement>(null);

  // Sub-tasks
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [newSubTaskStatus, setNewSubTaskStatus] = useState("todo");
  const [newSubTaskPriority, setNewSubTaskPriority] = useState("medium");
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState("");
  const [addingSubTask, setAddingSubTask]     = useState(false);
  const [savingSubTask, setSavingSubTask]     = useState(false);

  // Dependencies
  const [addingDep, setAddingDep]         = useState(false);
  const [depSearch, setDepSearch]         = useState("");
  const [depType, setDepType]             = useState<"blocks" | "blocked_by">("blocks");
  const [savingDep, setSavingDep]         = useState(false);

  // Label defs from org
  const [labelDefs, setLabelDefs] = useState<{ name: string; color: string }[]>([]);

  useEffect(() => {
    if (!token || !id) return;
    api.issues.get(token, id).then((iss) => {
      setIssue(iss);
      setTitleDraft(iss.title);
      setDescDraft(iss.description ?? "");
      const initial: Record<string, string> = {};
      (iss.customFieldValues ?? []).forEach((v) => { initial[v.customFieldId] = v.value; });
      setFieldValues(initial);
    }).catch(async (err) => {
      // Auto-switch workspace if the issue lives in another org the user belongs to
      if (err instanceof ApiError && err.status === 409 && err.body?.code === "WRONG_WORKSPACE" && err.body?.organizationId) {
        try {
          const { accessToken } = await api.organizations.switch(token, err.body.organizationId);
          await signIn("credentials", { token: accessToken, redirect: false });
          window.location.reload();
          return;
        } catch { /* fall through to default loading-finish */ }
      }
    }).finally(() => setLoading(false));
    api.issues.activity(token, id).then(setActivity).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    api.customFields.list(token).then(setCustomFields).catch(() => {});
    api.users.list(token).then(setUsers).catch(() => {});
    api.issues.list(token, { limit: "200" }).then(r => setAllIssues(r.data.map(i => ({ id: i.id, title: i.title })))).catch(() => {});
    api.organizations.mine(token).then(org => setLabelDefs(Array.isArray(org.labelDefs) ? org.labelDefs : [])).catch(() => {});
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
                {/* Issue slug (e.g. STR-123) */}
                {issue.project?.key && issue.number != null && (
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    {issue.project.key}-{issue.number}
                  </p>
                )}
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
                  {labels.map((l) => {
                    const def = labelDefs.find(d => d.name === l);
                    return def
                      ? <span key={l} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase text-white" style={{ background: def.color }}>{l}</span>
                      : <span key={l} className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold tracking-wide uppercase">{l}</span>;
                  })}
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

              {/* Sub-tasks */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>checklist</span>
                    Sub-tasks
                    {(issue.children ?? []).length > 0 && (
                      <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                        {issue.children!.filter(c => c.status === "done").length}/{issue.children!.length}
                      </span>
                    )}
                  </h3>
                  <button onClick={() => setAddingSubTask(v => !v)} className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Add
                  </button>
                </div>

                {(issue.children ?? []).length > 0 && (
                  <div className="mb-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round((issue.children!.filter(c => c.status === "done").length / issue.children!.length) * 100)}%` }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  {(issue.children ?? []).map(child => {
                    const slug = issueSlug({ id: child.id, number: child.number, project: { key: issue.project?.key ?? null } });
                    const priorityMeta = PRIORITIES.find(p => p.value === child.priority);
                    return (
                      <Link key={child.id} href={`/issues/${slug}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors group">
                        <span className={`material-symbols-outlined flex-shrink-0 ${child.status === "done" ? "text-emerald-500" : "text-outline"}`}
                          style={{ fontSize: 16, fontVariationSettings: child.status === "done" ? "'FILL' 1" : "'FILL' 0" }}>
                          {child.status === "done" ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span className={`text-sm flex-1 truncate ${child.status === "done" ? "line-through text-outline" : "text-on-surface"}`}>{child.title}</span>
                        {priorityMeta && (
                          <span className={`material-symbols-outlined flex-shrink-0 ${priorityMeta.color}`} title={priorityMeta.label} style={{ fontSize: 14 }}>
                            {priorityMeta.icon}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLES[child.status] ?? STATUS_STYLES.todo}`}>
                          {STATUSES.find(s => s.value === child.status)?.label ?? child.status}
                        </span>
                        {child.assignee ? (
                          <span title={child.assignee.name ?? ""} className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                            {child.assignee.image
                              ? <img src={child.assignee.image} alt="" className="w-full h-full rounded-full object-cover" />
                              : <span className="text-[8px] font-bold text-on-primary-fixed">{child.assignee.initials ?? "?"}</span>}
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-dashed border-outline-variant/40 flex-shrink-0" title="Unassigned" />
                        )}
                        <span className="text-[10px] font-bold text-outline uppercase opacity-0 group-hover:opacity-100 transition-opacity">{slug}</span>
                      </Link>
                    );
                  })}
                </div>

                {addingSubTask && (
                  <div className="mt-2 space-y-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <input
                      autoFocus
                      value={newSubTaskTitle}
                      onChange={e => setNewSubTaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Escape") { setAddingSubTask(false); setNewSubTaskTitle(""); } }}
                      placeholder="Sub-task title…"
                      className="w-full px-3 py-2 text-sm border border-outline-variant/20 rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                    />
                    <div className="flex flex-wrap gap-2">
                      <select value={newSubTaskStatus} onChange={e => setNewSubTaskStatus(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface">
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <select value={newSubTaskPriority} onChange={e => setNewSubTaskPriority(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface">
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <select value={newSubTaskAssignee} onChange={e => setNewSubTaskAssignee(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface flex-1 min-w-32">
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                      </select>
                      <button
                        disabled={savingSubTask || !newSubTaskTitle.trim()}
                        onClick={async () => {
                          if (!token || !newSubTaskTitle.trim()) return;
                          setSavingSubTask(true);
                          try {
                            await api.issues.createSubTask(token, id, {
                              title: newSubTaskTitle.trim(),
                              status: newSubTaskStatus,
                              priority: newSubTaskPriority,
                              assigneeId: newSubTaskAssignee || undefined,
                            });
                            const updated = await api.issues.get(token, id);
                            setIssue(updated);
                            setNewSubTaskTitle("");
                            setNewSubTaskStatus("todo");
                            setNewSubTaskPriority("medium");
                            setNewSubTaskAssignee("");
                            setAddingSubTask(false);
                          } finally { setSavingSubTask(false); }
                        }}
                        className="px-3 py-1 bg-primary text-white text-xs font-bold rounded disabled:opacity-40"
                      >{savingSubTask ? "Adding…" : "Add subtask"}</button>
                    </div>
                  </div>
                )}
              </section>

              {/* Dependencies */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span>
                    Dependencies
                  </h3>
                  <button onClick={() => setAddingDep(v => !v)} className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Add
                  </button>
                </div>

                <div className="space-y-1">
                  {(issue.blocking ?? []).map(dep => (
                    <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low">
                      <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">blocks</span>
                      <Link href={`/issues/${issueSlug(dep.blockedIssue)}`} className="text-sm text-on-surface hover:text-primary truncate flex-1">{dep.blockedIssue.title}</Link>
                      <button onClick={async () => { if (!token) return; await api.issues.removeDependency(token, id, dep.blockedIssue.id); setIssue(await api.issues.get(token, id)); }}
                        className="text-outline hover:text-error transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    </div>
                  ))}
                  {(issue.blockedBy ?? []).map(dep => (
                    <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low">
                      <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 rounded flex-shrink-0">blocked by</span>
                      <Link href={`/issues/${issueSlug(dep.blockingIssue)}`} className="text-sm text-on-surface hover:text-primary truncate flex-1">{dep.blockingIssue.title}</Link>
                      <button onClick={async () => { if (!token) return; await api.issues.removeDependency(token, dep.blockingIssue.id, id); setIssue(await api.issues.get(token, id)); }}
                        className="text-outline hover:text-error transition-colors flex-shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    </div>
                  ))}
                  {(issue.blocking ?? []).length === 0 && (issue.blockedBy ?? []).length === 0 && !addingDep && (
                    <p className="text-xs text-outline italic px-1">No dependencies</p>
                  )}
                </div>

                {addingDep && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <select value={depType} onChange={e => setDepType(e.target.value as "blocks" | "blocked_by")}
                        className="px-2 py-1.5 text-xs border border-outline-variant/20 rounded-lg bg-surface-container-low text-on-surface focus:outline-none">
                        <option value="blocks">blocks</option>
                        <option value="blocked_by">blocked by</option>
                      </select>
                      <input
                        autoFocus
                        value={depSearch}
                        onChange={e => setDepSearch(e.target.value)}
                        placeholder="Search issue ID or title…"
                        className="flex-1 px-3 py-1.5 text-sm border border-outline-variant/20 rounded-lg bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                      />
                    </div>
                    {depSearch.trim() && (
                      <div className="border border-outline-variant/20 rounded-lg bg-surface-container-lowest shadow-sm overflow-hidden max-h-40 overflow-y-auto">
                        {allIssues.filter(i => i.id !== id && (i.id.toLowerCase().includes(depSearch.toLowerCase()) || i.title.toLowerCase().includes(depSearch.toLowerCase()))).slice(0, 6).map(i => (
                          <button key={i.id} onClick={async () => {
                            if (!token) return;
                            setSavingDep(true);
                            try {
                              if (depType === "blocks") await api.issues.addDependency(token, id, i.id);
                              else await api.issues.addDependency(token, i.id, id);
                              setIssue(await api.issues.get(token, id));
                              setAddingDep(false); setDepSearch("");
                            } catch { toast("Failed to add dependency"); }
                            finally { setSavingDep(false); }
                          }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low flex items-center gap-2 border-b border-outline-variant/10 last:border-0">
                            <span className="text-[10px] font-bold text-outline">{i.id}</span>
                            <span className="truncate text-on-surface">{i.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Attachments */}
              <AttachmentsSection
                issueId={id}
                attachments={issue.attachments ?? []}
                onChange={(next) => setIssue((cur) => cur ? { ...cur, attachments: next } : cur)}
              />

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
                      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm p-6">
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
                      {(labelDefs.length > 0 ? labelDefs : LABELS_FALLBACK.map(n => ({ name: n, color: "#6366f1" }))).map((def) => {
                        const active = labels.includes(def.name);
                        return (
                          <button
                            key={def.name}
                            onClick={() => {
                              const next = active ? labels.filter((l) => l !== def.name) : [...labels, def.name];
                              patch({ labels: next });
                            }}
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all"
                            style={active
                              ? { background: def.color, color: "#fff", borderColor: def.color }
                              : { borderColor: "rgb(var(--color-outline-variant)/0.3)" }}
                          >
                            {def.name}
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

              {/* Time Tracking */}
              <section>
                <button
                  onClick={async () => {
                    const next = !showTimeLogs;
                    setShowTimeLogs(next);
                    if (next && !timeLogsLoaded && token) {
                      const logs = await api.timeLogs.list(token, id).catch(() => []);
                      setTimeLogs(logs);
                      setTimeLogsLoaded(true);
                    }
                  }}
                  className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 hover:text-on-surface transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                    Time Tracked
                    {timeLogs.length > 0 && (
                      <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                        {Math.round(timeLogs.reduce((s, l) => s + l.minutes, 0) / 60 * 10) / 10}h
                      </span>
                    )}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{showTimeLogs ? "expand_less" : "expand_more"}</span>
                </button>
                {showTimeLogs && (
                  <div className="space-y-3">
                    {/* Log form */}
                    <div className="bg-surface-container-low rounded-xl p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Minutes"
                          value={logMinutes}
                          onChange={(e) => setLogMinutes(e.target.value)}
                          className="w-24 bg-surface-container border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={logNote}
                          onChange={(e) => setLogNote(e.target.value)}
                          className="flex-1 bg-surface-container border border-outline-variant/20 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                      <button
                        disabled={loggingTime || !logMinutes}
                        onClick={async () => {
                          if (!token || !logMinutes) return;
                          setLoggingTime(true);
                          try {
                            const log = await api.timeLogs.create(token, id, { minutes: parseInt(logMinutes, 10), note: logNote || undefined });
                            setTimeLogs((prev) => [log, ...prev]);
                            setLogMinutes("");
                            setLogNote("");
                          } catch { toast("Failed to log time"); }
                          finally { setLoggingTime(false); }
                        }}
                        className="w-full text-xs font-bold py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {loggingTime ? "Logging…" : "Log time"}
                      </button>
                    </div>
                    {/* Existing logs */}
                    {timeLogs.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No time logged yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {timeLogs.map((log) => (
                          <div key={log.id} className="flex items-start justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2 group">
                            <div>
                              <p className="text-xs font-semibold text-on-surface">
                                {log.minutes >= 60
                                  ? `${Math.floor(log.minutes / 60)}h ${log.minutes % 60 > 0 ? `${log.minutes % 60}m` : ""}`
                                  : `${log.minutes}m`}
                                <span className="font-normal text-on-surface-variant ml-1.5">{log.user?.name ?? "You"}</span>
                              </p>
                              {log.note && <p className="text-[11px] text-on-surface-variant">{log.note}</p>}
                            </div>
                            {log.user?.id === me?.id && (
                              <button
                                onClick={async () => {
                                  if (!token) return;
                                  await api.timeLogs.remove(token, id, log.id).catch(() => {});
                                  setTimeLogs((prev) => prev.filter((l) => l.id !== log.id));
                                }}
                                className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-rose-500 transition-all"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

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

                  {/* Acceptance Criteria */}
                  <button
                    disabled={aiLoading}
                    onClick={async () => {
                      if (aiPanel === "criteria") { setAiPanel(null); return; }
                      setAiPanel("criteria");
                      if (aiCriteria) return;
                      setAiLoading(true);
                      try {
                        const res = await api.ai.acceptanceCriteria(token!, {
                          title: issue.title,
                          description: issue.description ?? undefined,
                          priority: issue.priority,
                          labels: labels,
                        });
                        setAiCriteria(res.criteria);
                      } catch { toast("AI unavailable — check API key"); setAiPanel(null); }
                      finally { setAiLoading(false); }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-lowest rounded-xl text-sm font-bold text-on-surface-variant hover:text-secondary hover:shadow-sm transition-all group disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>checklist</span>
                      Generate acceptance criteria
                    </span>
                    {aiLoading && aiPanel === "criteria"
                      ? <span className="w-3.5 h-3.5 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
                      : <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>{aiPanel === "criteria" ? "expand_less" : "arrow_forward"}</span>
                    }
                  </button>
                  {aiPanel === "criteria" && aiCriteria && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2 border border-secondary/10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Acceptance Criteria</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n"));
                            toast("Copied to clipboard");
                          }}
                          className="text-[10px] font-bold text-on-surface-variant hover:text-secondary flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>content_copy</span>
                          Copy all
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {aiCriteria.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
                            <span className="w-4 h-4 rounded-full bg-secondary/10 text-secondary flex-shrink-0 flex items-center justify-center text-[9px] font-black mt-0.5">{i + 1}</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={async () => {
                          const text = aiCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
                          const newDesc = issue.description ? `${issue.description}\n\n**Acceptance Criteria:**\n${text}` : `**Acceptance Criteria:**\n${text}`;
                          await patch({ description: newDesc });
                          toast("Added to description");
                        }}
                        className="mt-2 w-full py-1.5 text-[11px] font-bold text-secondary border border-secondary/20 rounded-lg hover:bg-secondary/5 transition-colors"
                      >
                        Add to description
                      </button>
                    </div>
                  )}

                  {/* Similar Issues */}
                  <button
                    disabled={aiLoading}
                    onClick={async () => {
                      if (aiPanel === "similar") { setAiPanel(null); return; }
                      setAiPanel("similar");
                      if (aiSimilar) return;
                      setAiLoading(true);
                      try {
                        let candidates = allIssues;
                        if (candidates.length === 0) {
                          const res = await api.issues.list(token!, { limit: "50" });
                          candidates = res.data.filter(i => i.id !== id).map(i => ({ id: i.id, title: i.title, description: i.description ?? undefined }));
                          setAllIssues(candidates);
                        }
                        const res = await api.ai.similarIssues(token!, {
                          target: { id: issue.id, title: issue.title, description: issue.description ?? undefined },
                          candidates: candidates.slice(0, 30),
                        });
                        setAiSimilar(res.similar);
                      } catch { toast("AI unavailable — check API key"); setAiPanel(null); }
                      finally { setAiLoading(false); }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-lowest rounded-xl text-sm font-bold text-on-surface-variant hover:text-secondary hover:shadow-sm transition-all group disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>content_copy</span>
                      Find similar issues
                    </span>
                    {aiLoading && aiPanel === "similar"
                      ? <span className="w-3.5 h-3.5 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
                      : <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>{aiPanel === "similar" ? "expand_less" : "arrow_forward"}</span>
                    }
                  </button>
                  {aiPanel === "similar" && aiSimilar && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 border border-secondary/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-3">Similar Issues</p>
                      {aiSimilar.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">No similar issues found.</p>
                      ) : (
                        <ul className="space-y-3">
                          {aiSimilar.map((s) => (
                            <li key={s.id}>
                              <a href={`/issues/${s.id}`} className="block hover:bg-surface-container-low rounded-lg p-2 -mx-2 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="text-xs font-bold text-on-surface truncate">{s.title}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary flex-shrink-0">
                                    {Math.round(s.similarityScore * 100)}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant leading-snug">{s.reason}</p>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Summarize thread */}
                  <button
                    disabled={aiLoading || !issue.comments?.length}
                    onClick={async () => {
                      if (aiPanel === "summary") { setAiPanel(null); return; }
                      setAiPanel("summary");
                      if (aiSummary) return;
                      setAiLoading(true);
                      try {
                        const res = await api.ai.summarizeComments(token!, {
                          issueTitle: issue.title,
                          comments: (issue.comments ?? []).map(c => ({ author: c.author?.name ?? "Unknown", body: c.body })),
                        });
                        setAiSummary(res);
                      } catch { toast("AI unavailable — check API key"); setAiPanel(null); }
                      finally { setAiLoading(false); }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-lowest rounded-xl text-sm font-bold text-on-surface-variant hover:text-secondary hover:shadow-sm transition-all group disabled:opacity-50"
                    title={!issue.comments?.length ? "No comments to summarize" : undefined}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>summarize</span>
                      Summarize thread
                    </span>
                    {aiLoading && aiPanel === "summary"
                      ? <span className="w-3.5 h-3.5 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
                      : <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>{aiPanel === "summary" ? "expand_less" : "arrow_forward"}</span>
                    }
                  </button>
                  {aiPanel === "summary" && aiSummary && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-secondary/10">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1.5">Summary</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{aiSummary.summary}</p>
                      </div>
                      {aiSummary.keyDecisions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1.5">Key Decisions</p>
                          <ul className="space-y-1">
                            {aiSummary.keyDecisions.map((d, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                <span className="material-symbols-outlined text-emerald-500 flex-shrink-0 mt-0.5" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.openQuestions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1.5">Open Questions</p>
                          <ul className="space-y-1">
                            {aiSummary.openQuestions.map((q, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                <span className="material-symbols-outlined text-amber-500 flex-shrink-0 mt-0.5" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>help</span>
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI auto-assign */}
                  <button
                    disabled={aiLoading || users.length === 0}
                    onClick={async () => {
                      if (aiPanel === "assign") { setAiPanel(null); return; }
                      setAiPanel("assign");
                      if (aiAssign) return;
                      setAiLoading(true);
                      try {
                        const openCounts = await Promise.all(users.map(u =>
                          apiFetch<{ total: number }>(`/issues?assigneeId=${u.id}&limit=1`, token!)
                            .then(r => ({ id: u.id, name: u.name ?? u.email, openIssueCount: r.total ?? 0 }))
                            .catch(() => ({ id: u.id, name: u.name ?? u.email, openIssueCount: 0 }))
                        ));
                        const res = await apiFetch<{ memberId: string; memberName: string; reason: string }>(
                          `/ai/auto-assign`, token!, {
                            method: "POST",
                            body: JSON.stringify({ title: issue!.title, description: issue!.description, priority: issue!.priority, labels: issue!.labels, members: openCounts }),
                          }
                        );
                        setAiAssign(res);
                      } finally { setAiLoading(false); }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_search</span>
                      AI auto-assign
                    </span>
                    {aiLoading && aiPanel === "assign"
                      ? <span className="w-3.5 h-3.5 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
                      : <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>{aiPanel === "assign" ? "expand_less" : "arrow_forward"}</span>
                    }
                  </button>
                  {aiPanel === "assign" && aiAssign && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-secondary/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Suggested Assignee</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {aiAssign.memberName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{aiAssign.memberName}</p>
                          <p className="text-xs text-on-surface-variant">{aiAssign.reason}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          await patch({ assigneeId: aiAssign.memberId });
                          setAiPanel(null);
                        }}
                        className="w-full text-xs font-bold py-2 bg-secondary text-on-secondary rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Assign to {aiAssign.memberName}
                      </button>
                    </div>
                  )}

                  {/* AI PR description */}
                  <button
                    disabled={aiLoading}
                    onClick={async () => {
                      if (aiPanel === "pr") { setAiPanel(null); return; }
                      setAiPanel("pr");
                      if (aiPr) return;
                      setAiLoading(true);
                      try {
                        const res = await apiFetch<{ title: string; body: string }>(
                          `/ai/pr-description`, token!, {
                            method: "POST",
                            body: JSON.stringify({ issueTitle: issue!.title, issueDescription: issue!.description, status: issue!.status, priority: issue!.priority, labels: issue!.labels }),
                          }
                        );
                        setAiPr(res);
                      } finally { setAiLoading(false); }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>merge</span>
                      Write PR description
                    </span>
                    {aiLoading && aiPanel === "pr"
                      ? <span className="w-3.5 h-3.5 border-2 border-secondary/40 border-t-secondary rounded-full animate-spin" />
                      : <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }}>{aiPanel === "pr" ? "expand_less" : "arrow_forward"}</span>
                    }
                  </button>
                  {aiPanel === "pr" && aiPr && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-secondary/10">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">PR Description</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${aiPr.title}\n\n${aiPr.body}`); toast("Copied to clipboard"); }}
                          className="text-[10px] font-bold text-secondary hover:opacity-70 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>content_copy</span>
                          Copy
                        </button>
                      </div>
                      <p className="text-xs font-bold text-on-surface">{aiPr.title}</p>
                      <pre className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap font-mono bg-surface-container rounded-lg p-3 max-h-48 overflow-y-auto">{aiPr.body}</pre>
                    </div>
                  )}

                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
