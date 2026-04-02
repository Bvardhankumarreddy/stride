"use client";

import { useEffect, useState } from "react";
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function IssueRow({ issue, selected, onToggle }: { issue: ApiIssue; selected: boolean; onToggle: () => void }) {
  const labels: string[] = Array.isArray(issue.labels) ? issue.labels : [];
  return (
    <tr className={clsx("border-b border-outline-variant/5 transition-colors group", selected ? "bg-primary/5" : "hover:bg-surface-container-lowest")}>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={selected} onChange={onToggle} className="rounded border-outline-variant text-primary h-3.5 w-3.5 cursor-pointer" />
      </td>
      <td className="px-2 py-2">
        <span className={clsx("inline-block w-2 h-2 rounded-full", PRIORITY_DOT[issue.priority] ?? "bg-slate-300")} />
      </td>
      <td className={clsx("px-2 py-2 text-[11px] font-bold tracking-tight", selected ? "text-primary" : "text-outline")}>{issue.id}</td>
      <td className="px-2 py-2 text-on-surface truncate max-w-xs">
        <Link href={`/issues/${issue.id}`} className="hover:text-primary transition-colors font-medium text-sm">{issue.title}</Link>
      </td>
      <td className="px-2 py-2">
        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGE[issue.status] ?? STATUS_BADGE.todo)}>
          {issue.status === "in-progress" && <span className="w-1 h-1 rounded-full bg-amber-600 animate-pulse" />}
          {STATUS_LABEL[issue.status] ?? issue.status}
        </span>
      </td>
      <td className="px-2 py-2">
        {issue.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] font-bold text-on-primary-fixed flex-shrink-0">{issue.assignee.initials}</div>
            <span className="text-xs text-on-surface-variant truncate">{issue.assignee.name}</span>
          </div>
        ) : <span className="text-xs text-outline italic">Unassigned</span>}
      </td>
      <td className="px-2 py-2">
        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold", issue.sprint ? "bg-surface-container text-on-surface-variant" : "border border-outline-variant/20 text-outline italic")}>
          {issue.sprint?.name ?? "Backlog"}
        </span>
      </td>
      <td className="px-2 py-2 text-[11px] text-on-surface-variant italic">{formatDate(issue.dueDate)}</td>
      <td className="px-2 py-2">
        <div className="flex gap-1 flex-wrap">
          {labels.map((l) => (
            <span key={l} className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold border", LABEL_COLOR[l] ?? LABEL_COLOR.default)}>{l}</span>
          ))}
        </div>
      </td>
      <td className="px-2 py-2 text-right pr-4 text-[11px] font-bold text-on-surface">{issue.estimate ? `${issue.estimate} pts` : "—"}</td>
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

  useEffect(() => {
    if (!token) return;
    api.issues.list(token, { limit: "50" }).then((res) => {
      setAllIssues(res.data);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, [token]);

  const inProgress = allIssues.filter((i) => i.status === "in-progress");
  const todo       = allIssues.filter((i) => i.status === "todo");
  const done       = allIssues.filter((i) => i.status === "done");

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const topBarActions = (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors border border-outline-variant/20 cursor-pointer">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
        Filters
      </div>
      <button onClick={() => openModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        New Issue
      </button>
    </div>
  );

  function GroupHeader({ icon, iconColor, label, count }: { icon: string; iconColor: string; label: string; count: number }) {
    return (
      <tr className="border-b border-outline-variant/5 bg-background/30">
        <td colSpan={10} className="px-4 py-2">
          <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
            <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            {label}
            <span className="text-[10px] font-black bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant ml-1">{count}</span>
          </span>
        </td>
      </tr>
    );
  }

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
              {["check_circle", "person_add", "label", "calendar_month"].map((ic) => (
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

        {/* Table */}
        <section className="overflow-x-auto">
          <table className="w-full border-collapse hidden md:table" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-background text-on-surface-variant text-[11px] font-bold uppercase tracking-widest text-left border-b border-outline-variant/20">
                <th className="w-10 px-4 py-2.5"><input type="checkbox" className="rounded border-outline-variant text-primary h-3.5 w-3.5" /></th>
                <th className="w-8 px-2 py-2.5"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>priority_high</span></th>
                <th className="w-20 px-2 py-2.5">ID</th>
                <th className="px-2 py-2.5">Title</th>
                <th className="w-28 px-2 py-2.5">Status</th>
                <th className="w-36 px-2 py-2.5">Assignee</th>
                <th className="w-28 px-2 py-2.5">Sprint</th>
                <th className="w-24 px-2 py-2.5">Due</th>
                <th className="w-36 px-2 py-2.5">Labels</th>
                <th className="w-16 px-2 py-2.5 text-right pr-4">Pts</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant/5">
                    <td colSpan={10} className="px-4 py-3">
                      <div className="h-4 bg-surface-container-low rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {inProgress.length > 0 && <>
                    <GroupHeader icon="play_circle" iconColor="text-amber-500" label="In Progress" count={inProgress.length} />
                    {inProgress.map((i) => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} />)}
                  </>}
                  {todo.length > 0 && <>
                    <GroupHeader icon="circle" iconColor="text-outline" label="To Do" count={todo.length} />
                    {todo.map((i) => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} />)}
                  </>}
                  {done.length > 0 && <>
                    <GroupHeader icon="check_circle" iconColor="text-emerald-500" label="Done" count={done.length} />
                    {done.map((i) => <IssueRow key={i.id} issue={i} selected={selected.has(i.id)} onToggle={() => toggleSelect(i.id)} />)}
                  </>}
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
            ) : allIssues.map((issue) => (
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
            Showing {allIssues.length} of {total}
          </div>
        )}
      </main>

      <button className="fixed right-6 bottom-24 md:bottom-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40 md:hidden">
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
      </button>
    </div>
  );
}
