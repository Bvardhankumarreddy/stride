"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useIssueStore, Issue, ColumnId } from "@/store/useIssueStore";
import { toast } from "@/components/Toast";

const STATUS_COLUMNS: {
  id: ColumnId;
  label: string;
  dotClass: string;
  countClass: string;
  wipMax?: number;
}[] = [
  { id: "todo", label: "To Do", dotClass: "bg-slate-400", countClass: "bg-surface-container-high text-on-surface-variant" },
  { id: "in-progress", label: "In Progress", dotClass: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]", countClass: "bg-blue-50 text-blue-600 border border-blue-100", wipMax: 5 },
  { id: "in-review", label: "In Review", dotClass: "bg-secondary shadow-[0_0_8px_rgba(107,56,212,0.6)]", countClass: "bg-surface-container-high text-on-surface-variant" },
  { id: "done", label: "Done", dotClass: "bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.6)]", countClass: "bg-surface-container-high text-on-surface-variant" },
];

const PRIORITY_GROUPS = [
  { id: "urgent", label: "Urgent", dotClass: "bg-rose-500" },
  { id: "high",   label: "High",   dotClass: "bg-orange-500" },
  { id: "medium", label: "Medium", dotClass: "bg-amber-500" },
  { id: "low",    label: "Low",    dotClass: "bg-emerald-500" },
];

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  high: "bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
  medium: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
  low: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  normal: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]",
};

const VIEWS = ["Board", "List", "Timeline"];

function IssueCard({ card, isDragging = false }: { card: Issue; isDragging?: boolean }) {
  return (
    <article
      className={clsx(
        "p-4 rounded-xl transition-all",
        isDragging && "opacity-50 rotate-1",
        card.featured
          ? "bg-surface-container-lowest shadow-[0_8px_24px_rgba(33,112,228,0.08)] border-2 border-primary-container ring-4 ring-primary-container/5"
          : card.done
          ? "bg-surface-container-lowest border border-outline-variant/10 shadow-none"
          : "bg-surface-container-lowest shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-transparent hover:border-outline-variant/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={clsx("text-[10px] font-bold tracking-tight font-headline", card.featured ? "text-primary" : "text-slate-400")}>
          {card.projectKey && card.number ? `${card.projectKey}-${card.number}` : card.id.slice(-6).toUpperCase()}
        </span>
        {card.done ? (
          <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        ) : card.priority ? (
          <span className={clsx("w-2 h-2 rounded-full", PRIORITY_DOT[card.priority] ?? "bg-slate-400")} />
        ) : null}
      </div>
      <h3 className="text-sm font-medium leading-tight mb-4 text-on-surface line-clamp-2">{card.title}</h3>
      {!card.done && card.label && (
        <div className="flex items-center justify-between">
          <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", card.featured ? "bg-primary/5 text-primary border border-primary/10" : "bg-surface-container-low text-slate-500")}>
            {card.label}
          </span>
          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="text-[8px] font-bold text-on-surface-variant">{card.assigneeInitials ?? "?"}</span>
          </div>
        </div>
      )}
    </article>
  );
}

function SortableCard({ card }: { card: Issue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <Link href={`/issues/${card.projectKey && card.number ? `${card.projectKey}-${card.number}` : card.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <IssueCard card={card} isDragging={isDragging} />
      </Link>
    </div>
  );
}

function DroppableColumn({ col, cards, onAdd }: { col: (typeof STATUS_COLUMNS)[number]; cards: Issue[]; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx("flex-shrink-0 w-80 flex flex-col h-full transition-colors rounded-2xl p-2 -m-2", isOver && "bg-primary/5")}
    >
      <div className="flex items-center justify-between mb-4 px-1 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={clsx("w-2 h-2 rounded-full", col.dotClass)} />
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{col.label}</h2>
          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", col.wipMax && cards.length >= col.wipMax ? "bg-red-50 text-red-600 border border-red-200" : col.countClass)}>
            {col.wipMax ? `${cards.length} / ${col.wipMax}` : cards.length}
          </span>
        </div>
        <button onClick={onAdd} className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        </button>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className={clsx("flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-6", col.id === "done" && "opacity-60 grayscale-[0.5]")}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
          <button onClick={onAdd} className="w-full p-3 rounded-xl border border-dashed border-outline-variant/30 text-xs text-on-surface-variant hover:border-primary/30 hover:text-primary transition-colors text-center">
            + Add issue
          </button>
        </div>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const { openModal } = useCreateIssueStore();
  const token = useToken();
  const [activeView, setActiveView] = useState("Board");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { issues, hydrated, setIssues, moveIssue, reorderIssue } = useIssueStore();
  const [orgName, setOrgName] = useState("Workspace");

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  // Group by state
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee">("status");
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api.organizations.mine(token).then(org => setOrgName(org.name)).catch(() => {});
  }, [token]);

  function fetchAndSetIssues(t: string) {
    api.issues.list(t, { limit: "100" }).then((res) => {
      setIssues(res.data.map((issue) => ({
        id: issue.id,
        number: issue.number,
        projectKey: issue.project?.key ?? null,
        title: issue.title,
        label: Array.isArray(issue.labels) ? issue.labels[0] ?? null : null,
        priority: issue.priority,
        columnId: issue.status as ColumnId,
        assignee: issue.assignee?.name ?? undefined,
        assigneeInitials: issue.assignee?.initials ?? undefined,
        estimate: issue.estimate,
        done: issue.status === "done",
      })));
    });
  }

  useEffect(() => {
    if (!token || hydrated) return;
    fetchAndSetIssues(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hydrated]);

  // Re-fetch when a new issue is created anywhere
  useEffect(() => {
    if (!token) return;
    function handler() { fetchAndSetIssues(token!); }
    window.addEventListener("stride:issueCreated", handler);
    return () => window.removeEventListener("stride:issueCreated", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupByOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const uniqueAssignees = useMemo(() => {
    const names = issues.map(i => i.assignee ?? "Unassigned");
    return [...new Set(names)];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (filterPriorities.size && !filterPriorities.has(i.priority ?? "")) return false;
      return true;
    });
  }, [issues, filterPriorities]);

  function togglePriority(p: string) {
    setFilterPriorities(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeIssue = activeId ? issues.find((i) => i.id === activeId) ?? null : null;
  const originalColumnRef = useRef<string | null>(null);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    const iss = useIssueStore.getState().issues.find((i) => i.id === active.id);
    originalColumnRef.current = iss?.columnId ?? null;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeIssue = useIssueStore.getState().issues.find((i) => i.id === active.id);
    if (!activeIssue) return;
    const isColumn = STATUS_COLUMNS.some((c) => c.id === over.id);
    if (isColumn && activeIssue.columnId !== over.id) moveIssue(active.id as string, over.id as ColumnId);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const originalColumn = originalColumnRef.current;
    originalColumnRef.current = null;

    if (!over || active.id === over.id) return;

    const issueId = active.id as string;
    const stateIssues = useIssueStore.getState().issues;
    const activeIssue = stateIssues.find((i) => i.id === issueId);
    const overIssue   = stateIssues.find((i) => i.id === over.id);

    if (activeIssue && overIssue && activeIssue.columnId !== overIssue.columnId) {
      moveIssue(issueId, overIssue.columnId as ColumnId);
    } else if (overIssue) {
      reorderIssue(issueId, over.id as string);
    }

    // Enforce WIP limit before persisting
    const newColumn = useIssueStore.getState().issues.find((i) => i.id === issueId)?.columnId;
    if (newColumn && newColumn !== originalColumn) {
      const col = STATUS_COLUMNS.find(c => c.id === newColumn);
      const colCount = useIssueStore.getState().issues.filter(i => i.columnId === newColumn).length;
      if (col?.wipMax && colCount > col.wipMax) {
        if (originalColumn) moveIssue(issueId, originalColumn as ColumnId);
        toast(`WIP limit reached for "${col.label}" (max ${col.wipMax})`);
        return;
      }
    }
    if (newColumn && newColumn !== originalColumn && token) {
      try {
        await api.issues.update(token, issueId, { status: newColumn });
      } catch {
        // Revert optimistic update on failure
        if (originalColumn) moveIssue(issueId, originalColumn as ColumnId);
        toast("Failed to update issue status");
      }
    }
  }

  const hasActiveFilters = filterPriorities.size > 0;

  const topBarActions = (
    <nav className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
      {VIEWS.map((v) => {
        const href = v === "List" ? "/issues" : v === "Timeline" ? "/roadmap" : "/board";
        return (
          <Link
            key={v}
            href={href}
            onClick={() => setActiveView(v)}
            className={clsx(
              "px-3 py-1 text-sm rounded-md transition-all",
              v === activeView ? "bg-surface-container-lowest text-primary font-bold shadow-sm" : "font-medium text-on-surface-variant hover:text-on-surface"
            )}
          >
            {v}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="bg-background">
      <TopBar breadcrumbs={[{ label: orgName }]} actions={topBarActions} />

      {/* Toolbar */}
      <div className="fixed top-16 left-0 md:left-64 right-0 bg-surface-container-lowest z-30 px-6 py-3 flex items-center gap-2 border-b border-outline-variant/10">

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen(v => !v); setGroupByOpen(false); }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
              hasActiveFilters
                ? "bg-primary/5 text-primary border-primary/20"
                : filterOpen
                ? "bg-surface-container-high text-on-surface border-outline-variant/20"
                : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
            Filter{hasActiveFilters ? ` (${filterPriorities.size})` : ""}
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 p-3 z-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Priority</p>
              <div className="space-y-1">
                {PRIORITY_GROUPS.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterPriorities.has(p.id)}
                      onChange={() => togglePriority(p.id)}
                      className="accent-primary"
                    />
                    <span className={clsx("w-2 h-2 rounded-full", p.dotClass)} />
                    <span className="text-sm text-on-surface">{p.label}</span>
                  </label>
                ))}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilterPriorities(new Set())}
                  className="mt-2 w-full text-xs font-bold text-error hover:bg-error/5 rounded-lg py-1.5 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Group by */}
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => { setGroupByOpen(v => !v); setFilterOpen(false); }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
              groupBy !== "status"
                ? "bg-primary/5 text-primary border-primary/20"
                : groupByOpen
                ? "bg-surface-container-high text-on-surface border-outline-variant/20"
                : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group_work</span>
            Group: {groupBy === "status" ? "Status" : groupBy === "priority" ? "Priority" : "Assignee"}
          </button>
          {groupByOpen && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 z-50">
              {(["status", "priority", "assignee"] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setGroupBy(opt); setGroupByOpen(false); }}
                  className={clsx(
                    "w-full text-left px-4 py-2 text-sm capitalize transition-colors",
                    opt === groupBy ? "text-primary font-bold bg-primary/5" : "text-on-surface hover:bg-surface-container-low"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto">
          <button onClick={() => openModal()} className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white shadow-md hover:opacity-90 active:scale-95 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          </button>
        </div>
      </div>

      {/* Board — status grouping with DnD */}
      {groupBy === "status" && (
        <main className="pt-[9.5rem] px-6 overflow-x-auto hide-scrollbar flex gap-6" style={{ height: "calc(100vh - 9.5rem)" }}>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            {STATUS_COLUMNS.map((col) => {
              const colIssues = filteredIssues.filter((i) => i.columnId === col.id);
              return <DroppableColumn key={col.id} col={col} cards={colIssues} onAdd={() => openModal(col.id)} />;
            })}
            <DragOverlay>
              {activeIssue && (
                <div className="w-80 rotate-2 shadow-2xl">
                  <IssueCard card={activeIssue} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
          <div className="w-6 flex-shrink-0" />
        </main>
      )}

      {/* Priority grouping */}
      {groupBy === "priority" && (
        <main className="pt-[9.5rem] px-6 pb-12 space-y-8 overflow-y-auto" style={{ minHeight: "calc(100vh - 9.5rem)" }}>
          {PRIORITY_GROUPS.map(group => {
            const groupIssues = filteredIssues.filter(i => i.priority === group.id);
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={clsx("w-2 h-2 rounded-full", group.dotClass)} />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{group.label}</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{groupIssues.length}</span>
                </div>
                {groupIssues.length === 0 ? (
                  <p className="text-sm text-on-surface-variant/50 italic pl-4">No issues</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {groupIssues.map(card => (
                      <Link key={card.id} href={`/issues/${card.projectKey && card.number ? `${card.projectKey}-${card.number}` : card.id}`}>
                        <IssueCard card={card} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      )}

      {/* Assignee grouping */}
      {groupBy === "assignee" && (
        <main className="pt-[9.5rem] px-6 pb-12 space-y-8 overflow-y-auto" style={{ minHeight: "calc(100vh - 9.5rem)" }}>
          {uniqueAssignees.map(assignee => {
            const groupIssues = filteredIssues.filter(i => (i.assignee ?? "Unassigned") === assignee);
            return (
              <div key={assignee}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center">
                    <span className="text-[7px] font-bold text-on-primary-fixed">{assignee.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{assignee}</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{groupIssues.length}</span>
                </div>
                {groupIssues.length === 0 ? (
                  <p className="text-sm text-on-surface-variant/50 italic pl-4">No issues</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {groupIssues.map(card => (
                      <Link key={card.id} href={`/issues/${card.projectKey && card.number ? `${card.projectKey}-${card.number}` : card.id}`}>
                        <IssueCard card={card} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      )}

      {/* AI Command Bar — desktop */}
      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50 pointer-events-none" style={{ paddingLeft: "calc(64px + 1rem)" }}>
        <div className="pointer-events-auto glass-panel border border-white/40 rounded-2xl shadow-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-on-surface-variant/50 outline-none"
            placeholder="Ask AI to group by priority or summarize status..."
            type="text"
            onFocus={() => document.dispatchEvent(new CustomEvent("stride:openCommandBar"))}
            readOnly
          />
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-container rounded-md text-[10px] font-bold text-on-surface-variant flex-shrink-0">
            <span>⌘</span><span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
