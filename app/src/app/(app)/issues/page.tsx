"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api, ApiIssue } from "@/lib/api";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";

const LABEL_COLOR: Record<string, string> = {
  Backend:    "bg-blue-50 text-blue-600 border-blue-100",
  AI:         "bg-purple-50 text-purple-600 border-purple-100",
  Design:     "bg-pink-50 text-pink-600 border-pink-100",
  Security:   "bg-red-50 text-red-600 border-red-100",
  Theming:    "bg-slate-100 text-slate-600 border-slate-200",
  iOS:        "bg-sky-50 text-sky-600 border-sky-100",
  Legal:      "bg-amber-50 text-amber-700 border-amber-100",
  Compliance: "bg-orange-50 text-orange-700 border-orange-100",
  Incident:   "bg-red-50 text-red-600 border-red-100",
  default:    "bg-surface-container text-on-surface-variant border-outline-variant/20",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]",
  high:   "bg-orange-500",
  medium: "bg-amber-400",
  low:    "bg-slate-300",
};

const STATUS_BADGE: Record<string, string> = {
  "in-progress": "bg-amber-50 text-amber-700 border border-amber-200/50",
  "todo":        "bg-surface-container-high text-on-surface-variant",
  "done":        "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  "in-review":   "bg-blue-50 text-blue-700 border border-blue-200/50",
};

const STATUS_LABEL: Record<string, string> = {
  "in-progress": "In Progress",
  "todo":        "To Do",
  "done":        "Done",
  "in-review":   "In Review",
};

const STATUSES = ["todo", "in-progress", "in-review", "done"] as const;
const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

type FieldKey = "priority" | "id" | "title" | "status" | "assignee" | "sprint" | "due" | "labels" | "estimate";

const ALL_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "sprint", label: "Sprint" },
  { key: "due", label: "Due Date" },
  { key: "labels", label: "Labels" },
  { key: "estimate", label: "Points" },
];

const DEFAULT_WIDTHS: Record<FieldKey, number> = {
  priority: 32, id: 80, title: 280, status: 112,
  assignee: 144, sprint: 112, due: 96, labels: 144, estimate: 64,
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function useClickOutside(ref: { readonly current: HTMLElement | null }, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function ResizeHandle({ col, onStart }: { col: FieldKey; onStart: (col: FieldKey, e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={e => onStart(col, e)}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors select-none"
    />
  );
}

function GroupHeader({ icon, iconColor, label, count, colSpan }: { icon: string; iconColor: string; label: string; count: number; colSpan: number }) {
  return (
    <tr className="border-b border-outline-variant/5 bg-background/30">
      <td colSpan={colSpan} className="px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
          <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          {label}
          <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant ml-1">{count}</span>
        </span>
      </td>
    </tr>
  );
}

function IssueRow({
  issue, selected, onToggle, visibleFields, onUpdate,
}: {
  issue: ApiIssue;
  selected: boolean;
  onToggle: () => void;
  visibleFields: Set<FieldKey>;
  onUpdate: (id: string, patch: Partial<ApiIssue>) => void;
}) {
  const token = useToken();
  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  const [editStatus, setEditStatus] = useState(false);
  const [editPriority, setEditPriority] = useState(false);
  const statusRef = useRef<HTMLTableCellElement>(null);
  const priorityRef = useRef<HTMLTableCellElement>(null);

  useClickOutside(statusRef, () => setEditStatus(false));
  useClickOutside(priorityRef, () => setEditPriority(false));

  async function applyPatch(patch: Partial<ApiIssue>) {
    if (!token) return;
    try {
      await api.issues.update(token, issue.id, patch);
      onUpdate(issue.id, patch);
    } catch {}
  }

  return (
    <tr className={clsx("border-b border-outline-variant/5 transition-colors group", selected ? "bg-primary/5" : "hover:bg-surface-container-lowest")}>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={selected} onChange={onToggle} className="rounded border-outline-variant text-primary h-3.5 w-3.5 cursor-pointer" />
      </td>

      {visibleFields.has("priority") && (
        <td ref={priorityRef} className="px-2 py-2 relative">
          <button onClick={() => setEditPriority(v => !v)} title="Change priority" className="flex items-center justify-center w-full">
            <span className={clsx("w-2 h-2 rounded-full", PRIORITY_DOT[issue.priority] ?? "bg-slate-300")} />
          </button>
          {editPriority && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[130px]">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => { applyPatch({ priority: p }); setEditPriority(false); }}
                  className={clsx("w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2 font-medium capitalize", issue.priority === p && "text-primary bg-primary/5")}>
                  <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[p])} />
                  {p}
                </button>
              ))}
            </div>
          )}
        </td>
      )}

      {visibleFields.has("id") && (
        <td className={clsx("px-2 py-2 text-[11px] font-bold tracking-tight truncate", selected ? "text-primary" : "text-outline")}>
          {issue.id}
        </td>
      )}

      {visibleFields.has("title") && (
        <td className="px-2 py-2 text-on-surface truncate">
          <Link href={`/issues/${issue.id}`} className="hover:text-primary transition-colors font-medium text-sm">
            {issue.title}
          </Link>
        </td>
      )}

      {visibleFields.has("status") && (
        <td ref={statusRef} className="px-2 py-2 relative">
          <button onClick={() => setEditStatus(v => !v)} title="Change status">
            <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold hover:opacity-80 transition-opacity", STATUS_BADGE[issue.status] ?? STATUS_BADGE.todo)}>
              {issue.status === "in-progress" && <span className="w-1 h-1 rounded-full bg-amber-600 animate-pulse" />}
              {STATUS_LABEL[issue.status] ?? issue.status}
            </span>
          </button>
          {editStatus && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[150px]">
              {STATUSES.map(s => (
                <button key={s} onClick={() => { applyPatch({ status: s }); setEditStatus(false); }}
                  className={clsx("w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center", issue.status === s && "bg-primary/5")}>
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGE[s] ?? STATUS_BADGE.todo)}>
                    {STATUS_LABEL[s]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </td>
      )}

      {visibleFields.has("assignee") && (
        <td className="px-2 py-2">
          {issue.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed flex-shrink-0">{issue.assignee.initials}</div>
              <span className="text-xs text-on-surface-variant truncate">{issue.assignee.name}</span>
            </div>
          ) : <span className="text-xs text-outline italic">Unassigned</span>}
        </td>
      )}

      {visibleFields.has("sprint") && (
        <td className="px-2 py-2">
          <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", issue.sprint ? "bg-surface-container text-on-surface-variant" : "border border-outline-variant/20 text-outline italic")}>
            {issue.sprint?.name ?? "Backlog"}
          </span>
        </td>
      )}

      {visibleFields.has("due") && (
        <td className="px-2 py-2 text-[11px] text-on-surface-variant italic">
          {formatDate(issue.dueDate)}
        </td>
      )}

      {visibleFields.has("labels") && (
        <td className="px-2 py-2">
          <div className="flex gap-1 flex-wrap">
            {labels.map(l => (
              <span key={l} className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold border", LABEL_COLOR[l] ?? LABEL_COLOR.default)}>{l}</span>
            ))}
          </div>
        </td>
      )}

      {visibleFields.has("estimate") && (
        <td className="px-2 py-2 text-right pr-4 text-[11px] font-bold text-on-surface">
          {issue.estimate ? `${issue.estimate} pts` : "—"}
        </td>
      )}
    </tr>
  );
}

export default function IssuesPage() {
  const { openModal } = useCreateIssueStore();
  const token = useToken();
  const [allIssues, setAllIssues] = useState<ApiIssue[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  // Field visibility
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(new Set(ALL_FIELDS.map(f => f.key)));
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<{ status: string[]; priority: string[] }>({ status: [], priority: [] });

  // Column resize
  const [colWidths, setColWidths] = useState<Record<FieldKey, number>>({ ...DEFAULT_WIDTHS });
  const resizeRef = useRef<{ col: FieldKey; startX: number; startWidth: number } | null>(null);

  useClickOutside(fieldsRef, () => setFieldsOpen(false));
  useClickOutside(filterRef, () => setFilterOpen(false));

  useEffect(() => {
    if (!token) return;
    api.issues.list(token, { limit: "50" }).then(res => {
      setAllIssues(res.data);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { col, startX, startWidth } = resizeRef.current;
      setColWidths(prev => ({ ...prev, [col]: Math.max(40, startWidth + e.clientX - startX) }));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  function startResize(col: FieldKey, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { col, startX: e.clientX, startWidth: colWidths[col] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const filteredIssues = allIssues.filter(issue => {
    if (filters.status.length && !filters.status.includes(issue.status)) return false;
    if (filters.priority.length && !filters.priority.includes(issue.priority)) return false;
    return true;
  });

  const inProgress = filteredIssues.filter(i => i.status === "in-progress");
  const todo       = filteredIssues.filter(i => i.status === "todo");
  const done       = filteredIssues.filter(i => i.status === "done");

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function toggleFilter(type: "status" | "priority", val: string) {
    setFilters(prev => {
      const arr = prev[type];
      return { ...prev, [type]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  function toggleField(key: FieldKey) {
    if (key === "title") return;
    setVisibleFields(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function handleIssueUpdate(id: string, patch: Partial<ApiIssue>) {
    setAllIssues(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  const activeFilterCount = filters.status.length + filters.priority.length;
  const visibleColCount = 1 + ALL_FIELDS.filter(f => visibleFields.has(f.key)).length;

  const topBarActions = (
    <div className="hidden md:flex items-center gap-2">
      {/* Filters dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => { setFilterOpen(v => !v); setFieldsOpen(false); }}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border cursor-pointer",
            filterOpen || activeFilterCount > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        {filterOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-outline-variant/20 w-60 p-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Status</p>
            <div className="flex flex-col gap-0.5 mb-3">
              {STATUSES.map(s => (
                <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={filters.status.includes(s)} onChange={() => toggleFilter("status", s)} className="rounded text-primary h-3.5 w-3.5" />
                  <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGE[s] ?? STATUS_BADGE.todo)}>
                    {STATUS_LABEL[s]}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Priority</p>
            <div className="flex flex-col gap-0.5">
              {PRIORITIES.map(p => (
                <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={filters.priority.includes(p)} onChange={() => toggleFilter("priority", p)} className="rounded text-primary h-3.5 w-3.5" />
                  <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[p])} />
                  <span className="text-xs font-medium text-on-surface-variant capitalize">{p}</span>
                </label>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters({ status: [], priority: [] })}
                className="mt-3 w-full text-center text-xs text-primary font-semibold py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fields toggle dropdown */}
      <div className="relative" ref={fieldsRef}>
        <button
          onClick={() => { setFieldsOpen(v => !v); setFilterOpen(false); }}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border cursor-pointer",
            fieldsOpen ? "bg-primary/10 text-primary border-primary/30" : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_column</span>
          Fields
        </button>
        {fieldsOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-outline-variant/20 w-48 py-2">
            <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 mb-1">Toggle columns</p>
            {ALL_FIELDS.map(f => (
              <label key={f.key} className={clsx("flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-low cursor-pointer", f.key === "title" && "opacity-40 pointer-events-none")}>
                <input type="checkbox" checked={visibleFields.has(f.key)} onChange={() => toggleField(f.key)} disabled={f.key === "title"} className="rounded text-primary h-3.5 w-3.5" />
                <span className="text-xs font-medium text-on-surface-variant">{f.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => openModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        New Issue
      </button>
    </div>
  );

  return (
    <div className="bg-background min-h-dvh">
      <TopBar breadcrumbs={[{ label: "Issues" }]} actions={topBarActions} />

      <main className="pt-16 pb-24 min-h-screen">
        {/* Header */}
        <section className="px-6 py-4 bg-white/80 backdrop-blur-sm sticky top-16 z-20 border-b border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold font-headline tracking-tight">Issues</h1>
              <span className="text-on-surface-variant font-medium text-xs px-2 py-0.5 bg-surface-container rounded-full">{loading ? "…" : total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
                <Link href="/board" className="px-3 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:text-on-surface transition-all">Board</Link>
                <button className="px-3 py-1 text-xs font-bold rounded-md bg-white text-primary shadow-sm">List</button>
                <Link href="/roadmap" className="px-3 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:text-on-surface transition-all">Timeline</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-6 py-2 bg-on-surface text-white flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-3">
              <span className="font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[10px]">{selected.size}</span>
                Selected
              </span>
              <div className="h-4 w-px bg-white/20" />
              {["check_circle", "person_add", "label", "calendar_month"].map(ic => (
                <button key={ic} className="p-2 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ic}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSelected(new Set())}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="px-6 py-2 flex items-center gap-2 flex-wrap border-b border-outline-variant/10 bg-primary/5">
            <span className="text-xs text-on-surface-variant font-medium">Filtered by:</span>
            {filters.status.map(s => (
              <button key={s} onClick={() => toggleFilter("status", s)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                {STATUS_LABEL[s]}
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
              </button>
            ))}
            {filters.priority.map(p => (
              <button key={p} onClick={() => toggleFilter("priority", p)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize hover:bg-primary/20 transition-colors">
                {p}
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <section className="overflow-x-auto">
          <table className="border-collapse hidden md:table w-full" style={{ tableLayout: "fixed", minWidth: 700 }}>
            <colgroup>
              <col style={{ width: 40 }} />
              {ALL_FIELDS.filter(f => visibleFields.has(f.key)).map(f => (
                <col key={f.key} style={{ width: colWidths[f.key] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-background text-on-surface-variant text-[11px] font-bold uppercase tracking-widest text-left border-b border-outline-variant/20">
                <th className="px-4 py-2.5"><input type="checkbox" className="rounded border-outline-variant text-primary h-3.5 w-3.5" /></th>
                {visibleFields.has("priority") && (
                  <th className="px-2 py-2.5 relative">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>priority_high</span>
                    <ResizeHandle col="priority" onStart={startResize} />
                  </th>
                )}
                {visibleFields.has("id") && <th className="px-2 py-2.5 relative">ID<ResizeHandle col="id" onStart={startResize} /></th>}
                {visibleFields.has("title") && <th className="px-2 py-2.5 relative">Title<ResizeHandle col="title" onStart={startResize} /></th>}
                {visibleFields.has("status") && <th className="px-2 py-2.5 relative">Status<ResizeHandle col="status" onStart={startResize} /></th>}
                {visibleFields.has("assignee") && <th className="px-2 py-2.5 relative">Assignee<ResizeHandle col="assignee" onStart={startResize} /></th>}
                {visibleFields.has("sprint") && <th className="px-2 py-2.5 relative">Sprint<ResizeHandle col="sprint" onStart={startResize} /></th>}
                {visibleFields.has("due") && <th className="px-2 py-2.5 relative">Due<ResizeHandle col="due" onStart={startResize} /></th>}
                {visibleFields.has("labels") && <th className="px-2 py-2.5 relative">Labels<ResizeHandle col="labels" onStart={startResize} /></th>}
                {visibleFields.has("estimate") && <th className="px-2 py-2.5 text-right pr-4 relative">Pts<ResizeHandle col="estimate" onStart={startResize} /></th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant/5">
                    <td colSpan={visibleColCount} className="px-4 py-3">
                      <div className="h-4 bg-surface-container-low rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {inProgress.length > 0 && <>
                    <GroupHeader icon="play_circle" iconColor="text-amber-500" label="In Progress" count={inProgress.length} colSpan={visibleColCount} />
                    {inProgress.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} />)}
                  </>}
                  {todo.length > 0 && <>
                    <GroupHeader icon="circle" iconColor="text-outline" label="To Do" count={todo.length} colSpan={visibleColCount} />
                    {todo.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} />)}
                  </>}
                  {done.length > 0 && <>
                    <GroupHeader icon="check_circle" iconColor="text-emerald-500" label="Done" count={done.length} colSpan={visibleColCount} />
                    {done.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} />)}
                  </>}
                  {filteredIssues.length === 0 && (
                    <tr>
                      <td colSpan={visibleColCount} className="px-4 py-12 text-center text-on-surface-variant text-sm">
                        {activeFilterCount > 0 ? "No issues match the current filters." : "No issues yet."}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-outline-variant/10">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 h-16 animate-pulse bg-surface-container-lowest" />
              ))
            ) : filteredIssues.map(issue => (
              <Link key={issue.id} href={`/issues/${issue.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-lowest transition-colors">
                <span className={clsx("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[issue.priority] ?? "bg-slate-300")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{issue.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{issue.id} · {issue.assignee?.name ?? "Unassigned"}</p>
                </div>
                <span className="text-xs font-bold text-outline">{issue.estimate ? `${issue.estimate}p` : ""}</span>
              </Link>
            ))}
          </div>
        </section>

        {!loading && (
          <div className="px-6 py-4 text-sm text-on-surface-variant text-center border-t border-outline-variant/10">
            Showing {filteredIssues.length}{activeFilterCount > 0 ? ` (filtered from ${allIssues.length})` : ""} of {total}
          </div>
        )}
      </main>

      <button onClick={() => openModal()} className="fixed right-6 bottom-24 md:bottom-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40 md:hidden">
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
      </button>
    </div>
  );
}
