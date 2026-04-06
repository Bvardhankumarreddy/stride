"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api, ApiIssue, ApiCustomField, ApiUser } from "@/lib/api";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";
import { toast } from "@/components/Toast";

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

const FIXED_FIELDS = [
  { key: "priority", label: "Priority" },
  { key: "id",       label: "ID" },
  { key: "title",    label: "Title" },
  { key: "status",   label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "sprint",   label: "Sprint" },
  { key: "due",      label: "Due Date" },
  { key: "labels",   label: "Labels" },
  { key: "estimate", label: "Points" },
];

const DEFAULT_WIDTHS: Record<string, number> = {
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

function ResizeHandle({ col, onStart }: { col: string; onStart: (col: string, e: React.MouseEvent) => void }) {
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
  issue, selected, onToggle, visibleFields, onUpdate, users, customFields,
}: {
  issue: ApiIssue;
  selected: boolean;
  onToggle: () => void;
  visibleFields: Set<string>;
  onUpdate: (id: string, patch: Partial<ApiIssue> & { assigneeId?: string | null }) => void;
  users: Pick<ApiUser, "id" | "name" | "initials">[];
  customFields: ApiCustomField[];
}) {
  const token = useToken();
  const labels = Array.isArray(issue.labels) ? issue.labels : [];

  const [editStatus,   setEditStatus]   = useState(false);
  const [editPriority, setEditPriority] = useState(false);
  const [editAssignee, setEditAssignee] = useState(false);
  const [editEstimate, setEditEstimate] = useState(false);
  const [editDue,      setEditDue]      = useState(false);

  const statusRef   = useRef<HTMLTableCellElement>(null);
  const priorityRef = useRef<HTMLTableCellElement>(null);
  const assigneeRef = useRef<HTMLTableCellElement>(null);

  useClickOutside(statusRef,   () => setEditStatus(false));
  useClickOutside(priorityRef, () => setEditPriority(false));
  useClickOutside(assigneeRef, () => setEditAssignee(false));

  async function applyPatch(patch: Partial<ApiIssue> & { assigneeId?: string | null }) {
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

      {/* Priority */}
      {visibleFields.has("priority") && (
        <td ref={priorityRef} className="px-2 py-2 relative">
          <button onClick={() => setEditPriority(v => !v)} title="Change priority" className="flex items-center justify-center w-full">
            <span className={clsx("w-2 h-2 rounded-full", PRIORITY_DOT[issue.priority] ?? "bg-slate-300")} />
          </button>
          {editPriority && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[130px]">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => { applyPatch({ priority: p }); setEditPriority(false); }}
                  className={clsx("w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2 font-medium capitalize", issue.priority === p && "text-primary bg-primary/5")}>
                  <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[p])} />{p}
                </button>
              ))}
            </div>
          )}
        </td>
      )}

      {/* ID */}
      {visibleFields.has("id") && (
        <td className={clsx("px-2 py-2 text-[11px] font-bold tracking-tight truncate", selected ? "text-primary" : "text-outline")}>
          {issue.id}
        </td>
      )}

      {/* Title */}
      {visibleFields.has("title") && (
        <td className="px-2 py-2 text-on-surface truncate">
          <Link href={`/issues/${issue.id}`} className="hover:text-primary transition-colors font-medium text-sm">
            {issue.title}
          </Link>
        </td>
      )}

      {/* Status */}
      {visibleFields.has("status") && (
        <td ref={statusRef} className="px-2 py-2 relative">
          <button onClick={() => setEditStatus(v => !v)} title="Change status">
            <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold hover:opacity-80 transition-opacity", STATUS_BADGE[issue.status] ?? STATUS_BADGE.todo)}>
              {issue.status === "in-progress" && <span className="w-1 h-1 rounded-full bg-amber-600 animate-pulse" />}
              {STATUS_LABEL[issue.status] ?? issue.status}
            </span>
          </button>
          {editStatus && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[150px]">
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

      {/* Assignee — inline edit */}
      {visibleFields.has("assignee") && (
        <td ref={assigneeRef} className="px-2 py-2 relative">
          <button onClick={() => setEditAssignee(v => !v)} title="Change assignee" className="w-full text-left">
            {issue.assignee ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed flex-shrink-0">{issue.assignee.initials}</div>
                <span className="text-xs text-on-surface-variant truncate">{issue.assignee.name}</span>
              </div>
            ) : (
              <span className="text-xs text-outline italic hover:text-on-surface-variant transition-colors">Unassigned</span>
            )}
          </button>
          {editAssignee && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[180px] max-h-52 overflow-y-auto">
              <button onClick={() => { applyPatch({ assigneeId: null }); setEditAssignee(false); }}
                className={clsx("w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2", !issue.assignee && "text-primary bg-primary/5")}>
                <div className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center flex-shrink-0 text-outline" style={{ fontSize: 10 }}>—</div>
                <span className="text-on-surface-variant">Unassigned</span>
              </button>
              {users.map(u => (
                <button key={u.id} onClick={() => { applyPatch({ assigneeId: u.id }); setEditAssignee(false); }}
                  className={clsx("w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2", issue.assignee?.id === u.id && "text-primary bg-primary/5")}>
                  <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed flex-shrink-0">{u.initials}</div>
                  <span className="font-medium truncate">{u.name}</span>
                  {issue.assignee?.id === u.id && <span className="material-symbols-outlined ml-auto text-primary" style={{ fontSize: 12 }}>check</span>}
                </button>
              ))}
            </div>
          )}
        </td>
      )}

      {/* Sprint */}
      {visibleFields.has("sprint") && (
        <td className="px-2 py-2">
          <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", issue.sprint ? "bg-surface-container text-on-surface-variant" : "border border-outline-variant/20 text-outline italic")}>
            {issue.sprint?.name ?? "Backlog"}
          </span>
        </td>
      )}

      {/* Due date — inline edit */}
      {visibleFields.has("due") && (
        <td className="px-2 py-2">
          {editDue ? (
            <input
              type="date"
              autoFocus
              defaultValue={issue.dueDate ? issue.dueDate.split("T")[0] : ""}
              onBlur={e => { setEditDue(false); applyPatch({ dueDate: e.target.value || null }); }}
              onKeyDown={e => { if (e.key === "Escape") setEditDue(false); }}
              className="w-full text-xs border border-primary/30 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-surface-container-low text-on-surface"
            />
          ) : (
            <button onClick={() => setEditDue(true)} title="Set due date" className="text-[11px] text-on-surface-variant italic hover:text-on-surface transition-colors w-full text-left">
              {formatDate(issue.dueDate)}
            </button>
          )}
        </td>
      )}

      {/* Labels */}
      {visibleFields.has("labels") && (
        <td className="px-2 py-2">
          <div className="flex gap-1 flex-wrap">
            {labels.map(l => (
              <span key={l} className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold border", LABEL_COLOR[l] ?? LABEL_COLOR.default)}>{l}</span>
            ))}
          </div>
        </td>
      )}

      {/* Estimate — inline edit */}
      {visibleFields.has("estimate") && (
        <td className="px-2 py-2 text-right pr-4">
          {editEstimate ? (
            <input
              type="number"
              autoFocus
              defaultValue={issue.estimate ?? ""}
              min={0}
              className="w-14 text-right text-xs border border-primary/30 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-surface-container-low text-on-surface"
              onBlur={e => { setEditEstimate(false); const v = parseInt(e.target.value, 10); applyPatch({ estimate: isNaN(v) ? null : v }); }}
              onKeyDown={e => { if (e.key === "Escape") setEditEstimate(false); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
          ) : (
            <button onClick={() => setEditEstimate(true)} title="Set estimate" className="text-[11px] font-bold text-on-surface hover:text-primary w-full text-right transition-colors">
              {issue.estimate ? `${issue.estimate} pts` : <span className="text-outline italic font-normal">—</span>}
            </button>
          )}
        </td>
      )}

      {/* Custom field columns */}
      {customFields.filter(cf => visibleFields.has(`cf_${cf.id}`)).map(cf => {
        const cfv = issue.customFieldValues?.find(v => v.customFieldId === cf.id);
        return (
          <td key={cf.id} className="px-2 py-2 text-xs text-on-surface-variant truncate">
            {cfv?.value ?? <span className="text-outline italic">—</span>}
          </td>
        );
      })}
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
  const [users, setUsers]         = useState<Pick<ApiUser, "id" | "name" | "initials">[]>([]);
  const [customFields, setCustomFields] = useState<ApiCustomField[]>([]);

  // Field visibility
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set(FIXED_FIELDS.map(f => f.key)));
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<{ status: string[]; priority: string[]; assigneeIds: string[] }>({
    status: [], priority: [], assigneeIds: [],
  });

  // Column resize
  const [colWidths, setColWidths] = useState<Record<string, number>>({ ...DEFAULT_WIDTHS });
  const resizeRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkAssigneeOpen, setBulkAssigneeOpen] = useState(false);
  const bulkStatusRef = useRef<HTMLDivElement>(null);
  const bulkAssigneeRef = useRef<HTMLDivElement>(null);
  useClickOutside(bulkStatusRef, () => setBulkStatusOpen(false));
  useClickOutside(bulkAssigneeRef, () => setBulkAssigneeOpen(false));

  async function bulkApply(data: { status?: string; assigneeId?: string; priority?: string }) {
    if (!token || selected.size === 0) return;
    const ids = [...selected];
    try {
      await api.issues.bulkUpdate(token, ids, data);
      setAllIssues(prev => prev.map(i => {
        if (!selected.has(i.id)) return i;
        const next = { ...i, ...data };
        if ("assigneeId" in data) {
          next.assignee = data.assigneeId ? (users.find(u => u.id === data.assigneeId) as any ?? null) : null;
        }
        return next;
      }));
      setSelected(new Set());
    } catch {
      toast("Bulk update failed");
    }
  }

  useClickOutside(fieldsRef, () => setFieldsOpen(false));
  useClickOutside(filterRef, () => setFilterOpen(false));

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.issues.list(token, { limit: "50" }),
      api.users.list(token),
      api.customFields.list(token),
    ]).then(([issueRes, userRes, cfRes]) => {
      setAllIssues(issueRes.data);
      setTotal(issueRes.total);
      setUsers(userRes);
      setCustomFields(cfRes);
    }).finally(() => setLoading(false));
  }, [token, refreshKey]);

  // Refresh when an issue is created or custom fields change (from any page)
  useEffect(() => {
    const refresh = () => setRefreshKey(k => k + 1);
    window.addEventListener("stride:issueCreated", refresh);
    window.addEventListener("stride:customFieldsChanged", refresh);
    return () => {
      window.removeEventListener("stride:issueCreated", refresh);
      window.removeEventListener("stride:customFieldsChanged", refresh);
    };
  }, []);

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

  function startResize(col: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { col, startX: e.clientX, startWidth: colWidths[col] ?? 120 };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // Build the full field list including custom fields
  const allFields = [
    ...FIXED_FIELDS,
    ...customFields.map(cf => ({ key: `cf_${cf.id}`, label: cf.name })),
  ];

  // Unique assignees from loaded data
  const uniqueAssignees = Array.from(
    new Map(allIssues.filter(i => i.assignee).map(i => [i.assignee!.id, i.assignee!])).values()
  );

  // Filtering
  const filteredIssues = allIssues.filter(issue => {
    if (filters.status.length && !filters.status.includes(issue.status)) return false;
    if (filters.priority.length && !filters.priority.includes(issue.priority)) return false;
    if (filters.assigneeIds.length) {
      const id = issue.assignee?.id ?? "unassigned";
      if (!filters.assigneeIds.includes(id)) return false;
    }
    return true;
  });

  const inProgress = filteredIssues.filter(i => i.status === "in-progress");
  const todo       = filteredIssues.filter(i => i.status === "todo");
  const done       = filteredIssues.filter(i => i.status === "done");

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function toggleFilter(type: "status" | "priority" | "assigneeIds", val: string) {
    setFilters(prev => {
      const arr = prev[type];
      return { ...prev, [type]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  function toggleField(key: string) {
    if (key === "title") return;
    setVisibleFields(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function handleIssueUpdate(id: string, patch: Partial<ApiIssue> & { assigneeId?: string | null }) {
    setAllIssues(prev => prev.map(i => {
      if (i.id !== id) return i;
      // Resolve assigneeId → assignee for local state
      if ("assigneeId" in patch) {
        const newAssignee = patch.assigneeId
          ? (users.find(u => u.id === patch.assigneeId) ?? null)
          : null;
        return { ...i, ...patch, assignee: newAssignee as ApiIssue["assignee"] };
      }
      return { ...i, ...patch };
    }));
  }

  const activeFilterCount = filters.status.length + filters.priority.length + filters.assigneeIds.length;
  const visibleColCount = 1 + allFields.filter(f => visibleFields.has(f.key)).length;

  const topBarActions = (
    <div className="hidden md:flex items-center gap-2">
      {/* Filters */}
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
          <div className="absolute right-0 top-full mt-2 z-50 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 w-64 p-3 max-h-[80vh] overflow-y-auto">
            {/* Status */}
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
            {/* Priority */}
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Priority</p>
            <div className="flex flex-col gap-0.5 mb-3">
              {PRIORITIES.map(p => (
                <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={filters.priority.includes(p)} onChange={() => toggleFilter("priority", p)} className="rounded text-primary h-3.5 w-3.5" />
                  <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[p])} />
                  <span className="text-xs font-medium text-on-surface-variant capitalize">{p}</span>
                </label>
              ))}
            </div>
            {/* Assignee */}
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Assignee</p>
            <div className="flex flex-col gap-0.5">
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                <input type="checkbox" checked={filters.assigneeIds.includes("unassigned")} onChange={() => toggleFilter("assigneeIds", "unassigned")} className="rounded text-primary h-3.5 w-3.5" />
                <div className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-outline flex-shrink-0" style={{ fontSize: 10 }}>—</div>
                <span className="text-xs font-medium text-on-surface-variant">Unassigned</span>
              </label>
              {uniqueAssignees.map(a => (
                <label key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={filters.assigneeIds.includes(a.id)} onChange={() => toggleFilter("assigneeIds", a.id)} className="rounded text-primary h-3.5 w-3.5" />
                  <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed flex-shrink-0">{a.initials}</div>
                  <span className="text-xs font-medium text-on-surface-variant truncate">{a.name}</span>
                </label>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters({ status: [], priority: [], assigneeIds: [] })}
                className="mt-3 w-full text-center text-xs text-primary font-semibold py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fields toggle */}
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
          <div className="absolute right-0 top-full mt-2 z-50 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 w-52 py-2 max-h-[80vh] overflow-y-auto">
            <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 mb-1">Built-in columns</p>
            {FIXED_FIELDS.map(f => (
              <label key={f.key} className={clsx("flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-low cursor-pointer", f.key === "title" && "opacity-40 pointer-events-none")}>
                <input type="checkbox" checked={visibleFields.has(f.key)} onChange={() => toggleField(f.key)} disabled={f.key === "title"} className="rounded text-primary h-3.5 w-3.5" />
                <span className="text-xs font-medium text-on-surface-variant">{f.label}</span>
              </label>
            ))}
            {customFields.length > 0 && (
              <>
                <p className="px-3 pt-3 pb-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant border-t border-outline-variant/10 mt-1">Custom columns</p>
                {customFields.map(cf => (
                  <label key={cf.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-low cursor-pointer">
                    <input type="checkbox" checked={visibleFields.has(`cf_${cf.id}`)} onChange={() => toggleField(`cf_${cf.id}`)} className="rounded text-primary h-3.5 w-3.5" />
                    <span className="text-xs font-medium text-on-surface-variant">{cf.name}</span>
                    <span className="ml-auto text-[9px] font-bold text-outline uppercase">{cf.type}</span>
                  </label>
                ))}
              </>
            )}
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
        <section className="px-6 py-4 bg-surface-container-lowest/90 backdrop-blur-sm sticky top-16 z-20 border-b border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold font-headline tracking-tight">Issues</h1>
              <span className="text-on-surface-variant font-medium text-xs px-2 py-0.5 bg-surface-container rounded-full">{loading ? "…" : total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
                <Link href="/board" className="px-3 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:text-on-surface transition-all">Board</Link>
                <button className="px-3 py-1 text-xs font-bold rounded-md bg-surface-container-low text-primary shadow-sm">List</button>
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

              {/* Bulk status */}
              <div className="relative" ref={bulkStatusRef}>
                <button onClick={() => { setBulkStatusOpen(v => !v); setBulkAssigneeOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container text-xs font-semibold">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>swap_horiz</span>
                  Status
                </button>
                {bulkStatusOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[150px] z-50">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => { bulkApply({ status: s }); setBulkStatusOpen(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low flex items-center">
                        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGE[s] ?? STATUS_BADGE.todo)}>
                          {STATUS_LABEL[s]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk assignee */}
              <div className="relative" ref={bulkAssigneeRef}>
                <button onClick={() => { setBulkAssigneeOpen(v => !v); setBulkStatusOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-container text-xs font-semibold">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person</span>
                  Assignee
                </button>
                {bulkAssigneeOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[180px] max-h-52 overflow-y-auto z-50">
                    <button onClick={() => { bulkApply({ assigneeId: "" }); setBulkAssigneeOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2 text-on-surface-variant">
                      <div className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-outline text-[10px]">—</div>
                      Unassigned
                    </button>
                    {users.map(u => (
                      <button key={u.id} onClick={() => { bulkApply({ assigneeId: u.id }); setBulkAssigneeOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-low flex items-center gap-2 text-on-surface-variant">
                        <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed">{u.initials}</div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                {STATUS_LABEL[s]}<span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
              </button>
            ))}
            {filters.priority.map(p => (
              <button key={p} onClick={() => toggleFilter("priority", p)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize hover:bg-primary/20 transition-colors">
                {p}<span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
              </button>
            ))}
            {filters.assigneeIds.map(aid => {
              const label = aid === "unassigned" ? "Unassigned" : (uniqueAssignees.find(a => a.id === aid)?.name ?? aid);
              return (
                <button key={aid} onClick={() => toggleFilter("assigneeIds", aid)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                  {label}<span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Table */}
        <section className="overflow-x-auto">
          <table className="border-collapse hidden md:table w-full" style={{ tableLayout: "fixed", minWidth: 700 }}>
            <colgroup>
              <col style={{ width: 40 }} />
              {allFields.filter(f => visibleFields.has(f.key)).map(f => (
                <col key={f.key} style={{ width: colWidths[f.key] ?? 120 }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-background text-on-surface-variant text-[11px] font-bold uppercase tracking-widest text-left border-b border-outline-variant/20">
                <th className="px-4 py-2.5"><input type="checkbox" className="rounded border-outline-variant text-primary h-3.5 w-3.5" /></th>
                {visibleFields.has("priority") && <th className="px-2 py-2.5 relative"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>priority_high</span><ResizeHandle col="priority" onStart={startResize} /></th>}
                {visibleFields.has("id")       && <th className="px-2 py-2.5 relative">ID<ResizeHandle col="id" onStart={startResize} /></th>}
                {visibleFields.has("title")    && <th className="px-2 py-2.5 relative">Title<ResizeHandle col="title" onStart={startResize} /></th>}
                {visibleFields.has("status")   && <th className="px-2 py-2.5 relative">Status<ResizeHandle col="status" onStart={startResize} /></th>}
                {visibleFields.has("assignee") && <th className="px-2 py-2.5 relative">Assignee<ResizeHandle col="assignee" onStart={startResize} /></th>}
                {visibleFields.has("sprint")   && <th className="px-2 py-2.5 relative">Sprint<ResizeHandle col="sprint" onStart={startResize} /></th>}
                {visibleFields.has("due")      && <th className="px-2 py-2.5 relative">Due<ResizeHandle col="due" onStart={startResize} /></th>}
                {visibleFields.has("labels")   && <th className="px-2 py-2.5 relative">Labels<ResizeHandle col="labels" onStart={startResize} /></th>}
                {visibleFields.has("estimate") && <th className="px-2 py-2.5 text-right pr-4 relative">Pts<ResizeHandle col="estimate" onStart={startResize} /></th>}
                {customFields.filter(cf => visibleFields.has(`cf_${cf.id}`)).map(cf => (
                  <th key={cf.id} className="px-2 py-2.5 relative">{cf.name}<ResizeHandle col={`cf_${cf.id}`} onStart={startResize} /></th>
                ))}
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
                    {inProgress.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} users={users} customFields={customFields} />)}
                  </>}
                  {todo.length > 0 && <>
                    <GroupHeader icon="circle" iconColor="text-outline" label="To Do" count={todo.length} colSpan={visibleColCount} />
                    {todo.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} users={users} customFields={customFields} />)}
                  </>}
                  {done.length > 0 && <>
                    <GroupHeader icon="check_circle" iconColor="text-emerald-500" label="Done" count={done.length} colSpan={visibleColCount} />
                    {done.map(i => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} visibleFields={visibleFields} onUpdate={handleIssueUpdate} users={users} customFields={customFields} />)}
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
