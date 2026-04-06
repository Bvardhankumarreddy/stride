"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api, ApiSprint, ApiIssue, ApiVelocity } from "@/lib/api";
import { toast } from "@/components/Toast";

type SprintAnalysis = {
  health: string;
  healthReason: string;
  summary: string;
  completionLikelihood: number;
  risks: string[];
  recommendations: string[];
  highlights: string[];
  workloadBalance: string;
};

const HEALTH_STYLES: Record<string, { badge: string; bar: string; icon: string }> = {
  "on-track":  { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", bar: "bg-emerald-500", icon: "check_circle" },
  "at-risk":   { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   bar: "bg-amber-500",   icon: "warning" },
  "off-track": { badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",       bar: "bg-rose-500",    icon: "cancel" },
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-surface-container-high text-on-surface-variant",
  active: "bg-primary/10 text-primary border border-primary/20",
  upcoming: "bg-surface-container-high text-on-surface-variant",
  completed: "bg-surface-container text-outline",
};

function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  return d > 0 ? d : 0;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SprintsPage() {
  const { openModal } = useCreateIssueStore();
  const token = useToken();
  const [sprints, setSprints] = useState<ApiSprint[]>([]);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [velocity, setVelocity] = useState<ApiVelocity[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("Workspace");
  const [projectId, setProjectId] = useState<string | null>(null);

  // AI analysis state
  const [analysis, setAnalysis] = useState<SprintAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // AI standup state
  const [standup, setStandup] = useState<{ yesterday: string[]; today: string[]; blockers: string[]; summary: string } | null>(null);
  const [standupLoading, setStandupLoading] = useState(false);
  const [showStandup, setShowStandup] = useState(false);

  // AI capacity planner state
  type CapacityPlan = {
    assignments: Array<{ issueId: string; issueTitle: string; memberId: string; memberName: string; reason: string }>;
    overloaded: string[];
    underutilized: string[];
    summary: string;
  };
  const [capacity, setCapacity] = useState<CapacityPlan | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);

  // Sprint goal edit state
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  // Create sprint modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.organizations.mine(token).then(org => setOrgName(org.name)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.projects.list(token).then(async (res) => {
      const pid = res[0]?.id;
      if (!pid) { setLoading(false); return; }
      setProjectId(pid);
      const [sprintsData, issuesData, velocityData] = await Promise.all([
        api.sprints.list(token, pid),
        api.issues.list(token, { limit: "200" }),
        api.sprints.velocity(token, pid).catch(() => [] as ApiVelocity[]),
      ]);
      setSprints(sprintsData);
      setIssues(issuesData.data);
      setVelocity(velocityData);
    }).finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (!form.name.trim()) { setFormError("Sprint name is required"); return; }
    setSaving(true);
    setFormError("");
    try {
      let pid = projectId;
      if (!pid) {
        const org = await api.organizations.mine(token);
        const project = await api.projects.create(token, { name: org.name });
        pid = project.id;
        setProjectId(pid);
      }
      const sprint = await api.sprints.create(token, pid, {
        name: form.name.trim(),
        goal: form.goal.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setSprints((prev) => [sprint, ...prev]);
      setShowCreate(false);
      setForm({ name: "", goal: "", startDate: "", endDate: "" });
    } catch {
      setFormError("Failed to create sprint. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyzeSprint() {
    if (!token || !active) return;
    setAnalysisLoading(true);
    setShowAnalysis(true);
    setAnalysis(null);
    try {
      const sprintIssues = issues.filter(i => i.sprintId === active.id);
      const result = await api.ai.analyzeSprint(token, {
        sprintName: active.name,
        startDate: active.startDate,
        endDate: active.endDate,
        issues: sprintIssues.map(i => ({
          id: i.id,
          title: i.title,
          status: i.status,
          priority: i.priority,
          assignee: i.assignee?.name ?? undefined,
          estimate: i.estimate ?? undefined,
        })),
      });
      setAnalysis(result);
    } catch {
      toast("AI analysis failed. Please try again.");
      setShowAnalysis(false);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleStandup() {
    if (!token || !active) return;
    setStandupLoading(true);
    setShowStandup(true);
    setStandup(null);
    try {
      const sprintIssues = issues.filter(i => i.sprintId === active.id);
      const result = await api.ai.standup(token, {
        sprintName: active.name,
        issues: sprintIssues.map(i => ({
          title: i.title,
          status: i.status,
          priority: i.priority,
          assignee: i.assignee?.name ?? undefined,
        })),
      });
      setStandup(result);
    } catch {
      toast("Standup generation failed. Please try again.");
      setShowStandup(false);
    } finally {
      setStandupLoading(false);
    }
  }

  async function handleCapacity() {
    if (!token || !active) return;
    setCapacityLoading(true);
    setShowCapacity(true);
    setCapacity(null);
    try {
      const sprintIssues = issues.filter(i => i.sprintId === active.id && !i.assignee);
      const members = Array.from(
        new Map(
          issues.filter(i => i.assignee).map(i => [i.assignee!.id, { id: i.assignee!.id, name: i.assignee!.name ?? i.assignee!.id }])
        ).values()
      );
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${API}/ai/plan-capacity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sprintName: active.name,
          issues: sprintIssues.map(i => ({ id: i.id, title: i.title, priority: i.priority, estimate: i.estimate ?? undefined })),
          members,
        }),
      });
      const data = await res.json();
      setCapacity(data);
    } catch {
      toast("Capacity planning failed. Please try again.");
      setShowCapacity(false);
    } finally {
      setCapacityLoading(false);
    }
  }

  async function handleSaveGoal() {
    if (!token || !active || !projectId) return;
    try {
      const updated = await api.sprints.update(token, projectId, active.id, { goal: goalDraft });
      setSprints(prev => prev.map(s => s.id === active.id ? { ...s, goal: updated.goal } : s));
      setEditingGoal(false);
    } catch {
      toast("Failed to save sprint goal");
    }
  }

  async function handleStatusChange(sprint: ApiSprint, newStatus: string) {
    if (!token || !projectId) return;
    try {
      const updated = await api.sprints.update(token, projectId, sprint.id, { status: newStatus });
      setSprints((prev) => prev.map((s) => (s.id === sprint.id ? { ...s, status: updated.status } : s)));
      toast(`Sprint ${newStatus === "active" ? "started" : "completed"}`);
    } catch {
      toast("Failed to update sprint status");
    }
  }

  function sprintStats(sprint: ApiSprint) {
    const si = issues.filter((i) => i.sprintId === sprint.id);
    const total = si.length || sprint._count?.issues || 0;
    const completed = si.filter((i) => i.status === "done").length;
    const inProgress = si.filter((i) => i.status === "in-progress").length;
    const pointsTotal = si.reduce((s, i) => s + (i.estimate ?? 0), 0);
    const pointsDone = si.filter((i) => i.status === "done").reduce((s, i) => s + (i.estimate ?? 0), 0);
    return { total, completed, inProgress, points: { total: pointsTotal, completed: pointsDone } };
  }

  const active = sprints.find((s) => s.status === "active");
  const activeStats = active ? sprintStats(active) : null;
  const completionPct = activeStats?.total ? Math.round((activeStats.completed / activeStats.total) * 100) : 0;
  const pointsPct = activeStats?.points.total ? Math.round((activeStats.points.completed / activeStats.points.total) * 100) : 0;
  const backlog = issues.filter((i) => !i.sprintId);

  return (
    <div className="bg-background min-h-dvh">
      <TopBar
        breadcrumbs={[{ label: orgName, href: "/board" }, { label: "Sprints" }]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="hidden md:flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Sprint
          </button>
        }
      />

      <main className="pt-16 pb-24">
        {loading ? (
          <div className="px-6 py-8 space-y-4 animate-pulse">
            <div className="h-8 bg-surface-container-low rounded w-1/3" />
            <div className="h-4 bg-surface-container-low rounded w-1/4" />
            <div className="grid grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-surface-container-low rounded-2xl" />)}
            </div>
          </div>
        ) : active && activeStats ? (
          <section className="px-6 py-8 border-b border-outline-variant/10">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Active Sprint</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-on-surface font-headline">{active.name}</h1>
                <p className="text-sm text-on-surface-variant mt-0.5">{formatDate(active.startDate)} – {formatDate(active.endDate)}</p>
                {/* Sprint Goal */}
                <div className="mt-2">
                  {editingGoal ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={goalDraft}
                        onChange={e => setGoalDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveGoal(); if (e.key === "Escape") setEditingGoal(false); }}
                        placeholder="Sprint goal…"
                        className="text-sm px-3 py-1 border border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-low text-on-surface w-64"
                      />
                      <button onClick={handleSaveGoal} className="text-xs font-bold text-primary hover:underline">Save</button>
                      <button onClick={() => setEditingGoal(false)} className="text-xs text-on-surface-variant hover:underline">Cancel</button>
                    </div>
                  ) : active.goal ? (
                    <button onClick={() => { setGoalDraft(active.goal ?? ""); setEditingGoal(true); }} className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface group">
                      <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>flag</span>
                      <span className="italic">{active.goal}</span>
                      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 13 }}>edit</span>
                    </button>
                  ) : (
                    <button onClick={() => { setGoalDraft(""); setEditingGoal(true); }} className="flex items-center gap-1 text-xs text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                      Set sprint goal
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {daysLeft(active.endDate) !== null && (
                  <div className="text-right">
                    <p className="text-3xl font-black text-on-surface font-headline">{daysLeft(active.endDate)}</p>
                    <p className="text-xs text-on-surface-variant font-medium">days left</p>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleAnalyzeSprint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    Analyze
                  </button>
                  <button
                    onClick={handleStandup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-600 text-xs font-bold hover:bg-violet-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
                    Standup
                  </button>
                  <button
                    onClick={handleCapacity}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>balance</span>
                    Capacity
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Issues", value: activeStats.total, icon: "confirmation_number" },
                { label: "Completed", value: activeStats.completed, icon: "check_circle", color: "text-primary" },
                { label: "In Progress", value: activeStats.inProgress, icon: "play_circle", color: "text-amber-500" },
                { label: "Story Points", value: `${activeStats.points.completed}/${activeStats.points.total}`, icon: "star", color: "text-secondary" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx("material-symbols-outlined", color ?? "text-on-surface-variant")} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-2xl font-black text-on-surface font-headline">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-on-surface-variant mb-1.5">
                  <span>Issue completion</span>
                  <span className="font-bold text-on-surface">{completionPct}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-on-surface-variant mb-1.5">
                  <span>Points burned</span>
                  <span className="font-bold text-on-surface">{pointsPct}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${pointsPct}%` }} />
                </div>
              </div>
            </div>

          {/* AI Sprint Analysis — inline */}
          {showAnalysis && (
            <div className="mt-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              {analysisLoading ? (
                <div className="flex items-center gap-3 px-6 py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-secondary border-t-transparent animate-spin flex-shrink-0" />
                  <p className="text-sm text-on-surface-variant">Analyzing sprint…</p>
                </div>
              ) : analysis ? (
                <div className="p-6 space-y-5">
                  {/* Top row: health + likelihood + AI badge */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold", HEALTH_STYLES[analysis.health]?.badge ?? HEALTH_STYLES["at-risk"].badge)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{HEALTH_STYLES[analysis.health]?.icon ?? "warning"}</span>
                      <span className="capitalize">{analysis.health.replace("-", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={clsx("h-full rounded-full", HEALTH_STYLES[analysis.health]?.bar ?? "bg-amber-500")}
                          style={{ width: `${analysis.completionLikelihood}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-on-surface whitespace-nowrap">{analysis.completionLikelihood}% likely</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <span className="text-xs font-bold text-secondary uppercase tracking-widest">AI Analysis</span>
                    </div>
                  </div>

                  <p className="text-sm text-on-surface leading-relaxed">{analysis.summary}</p>
                  <p className="text-xs text-on-surface-variant">Workload: <span className="font-bold text-on-surface capitalize">{analysis.workloadBalance}</span> · <span className="font-bold text-on-surface">{analysis.healthReason}</span></p>

                  <div className="grid md:grid-cols-3 gap-5 pt-1">
                    {analysis.highlights.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Highlights</p>
                        <ul className="space-y-1.5">
                          {analysis.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-emerald-500 mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.risks.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Risks</p>
                        <ul className="space-y-1.5">
                          {analysis.risks.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-amber-500 mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>warning</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Recommendations</p>
                        <ul className="space-y-1.5">
                          {analysis.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/10">
                    <button
                      onClick={handleAnalyzeSprint}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                      Re-analyze
                    </button>
                    <button
                      onClick={() => setShowAnalysis(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-6 py-5">
                  <p className="text-sm text-on-surface-variant">Analysis unavailable. Try again.</p>
                  <button
                    onClick={handleAnalyzeSprint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Standup */}
          {showStandup && (
            <div className="mt-4 bg-surface-container-lowest rounded-2xl border border-violet-500/15 shadow-sm overflow-hidden">
              {standupLoading ? (
                <div className="flex items-center gap-3 px-6 py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" />
                  <p className="text-sm text-on-surface-variant">Generating standup…</p>
                </div>
              ) : standup ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-violet-500" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>record_voice_over</span>
                      <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">AI Standup</span>
                    </div>
                    <button onClick={() => setShowStandup(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed italic border-l-2 border-violet-400 pl-3">{standup.summary}</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Yesterday</p>
                      <ul className="space-y-1.5">
                        {standup.yesterday.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-emerald-500 mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Today</p>
                      <ul className="space-y-1.5">
                        {standup.today.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>arrow_circle_right</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Blockers</p>
                      {standup.blockers.length === 0 ? (
                        <p className="text-sm text-on-surface-variant italic">No blockers 🎉</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {standup.blockers.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-amber-500 mt-0.5 flex-shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>warning</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/10">
                    <button onClick={handleStandup} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/10 text-violet-600 text-xs font-bold hover:bg-violet-500/20 transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-6 py-5">
                  <p className="text-sm text-on-surface-variant">Failed to generate standup. Try again.</p>
                  <button onClick={handleStandup} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/10 text-violet-600 text-xs font-bold hover:bg-violet-500/20 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
          {/* AI Capacity Planner */}
          {showCapacity && (
            <div className="mt-4 bg-surface-container-lowest rounded-2xl border border-emerald-500/15 shadow-sm overflow-hidden">
              {capacityLoading ? (
                <div className="flex items-center gap-3 px-6 py-5">
                  <span className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-sm text-on-surface-variant">Planning capacity…</p>
                </div>
              ) : capacity ? (
                <div>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>balance</span>
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">AI Capacity Plan</span>
                    </div>
                    <button onClick={() => setShowCapacity(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </div>
                  <div className="px-6 py-4 space-y-4">
                    <p className="text-sm text-on-surface-variant">{capacity.summary}</p>
                    {capacity.assignments.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Suggested Assignments</p>
                        {capacity.assignments.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 bg-surface-container rounded-xl p-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {a.memberName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-on-surface">{a.issueTitle}</p>
                              <p className="text-[11px] text-emerald-700 font-medium">→ {a.memberName}</p>
                              <p className="text-[11px] text-on-surface-variant">{a.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">All issues are already assigned.</p>
                    )}
                    {(capacity.overloaded.length > 0 || capacity.underutilized.length > 0) && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {capacity.overloaded.length > 0 && (
                          <div className="bg-rose-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1.5">Overloaded</p>
                            {capacity.overloaded.map(n => <p key={n} className="text-xs text-rose-700">{n}</p>)}
                          </div>
                        )}
                        {capacity.underutilized.length > 0 && (
                          <div className="bg-emerald-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Available</p>
                            {capacity.underutilized.map(n => <p key={n} className="text-xs text-emerald-700">{n}</p>)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-2 border-t border-outline-variant/10">
                      <button onClick={handleCapacity} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-6 py-5">
                  <p className="text-sm text-on-surface-variant">Failed to plan capacity. Try again.</p>
                  <button onClick={handleCapacity} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>refresh</span>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
          </section>
        ) : (
          <section className="px-6 py-16 border-b border-outline-variant/10 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: 28 }}>sprint</span>
            </div>
            <p className="text-base font-bold text-on-surface">No active sprint</p>
            <p className="text-sm text-on-surface-variant max-w-xs">Start a sprint to begin tracking progress and running AI analysis.</p>
            <button onClick={() => setShowCreate(true)} className="mt-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity">
              New Sprint
            </button>
          </section>
        )}

        <div className="px-6 py-6 grid md:grid-cols-3 gap-6">
          {/* Sprint list */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">All Sprints</h2>
            {sprints.map((sprint) => {
              const stats = sprintStats(sprint);
              const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
              return (
                <div key={sprint.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-on-surface">{sprint.name}</h3>
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", STATUS_STYLES[sprint.status] ?? STATUS_STYLES.upcoming)}>
                        {sprint.status}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-3">
                    <span><strong className="text-on-surface">{stats.completed}</strong>/{stats.total} issues</span>
                    <span><strong className="text-on-surface">{stats.points.completed}</strong>/{stats.points.total} pts</span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full", sprint.status === "upcoming" || sprint.status === "planned" ? "bg-surface-container-high" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {sprint.status !== "completed" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/10">
                      {(sprint.status === "planned" || sprint.status === "upcoming") && (
                        <button
                          onClick={() => handleStatusChange(sprint, "active")}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
                          Start Sprint
                        </button>
                      )}
                      {sprint.status === "active" && (
                        <button
                          onClick={() => handleStatusChange(sprint, "completed")}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                          Complete Sprint
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && sprints.length === 0 && (
              <div className="py-12 flex flex-col items-center text-center gap-2">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: 40 }}>view_timeline</span>
                <p className="text-sm font-bold text-on-surface mt-1">No sprints yet</p>
                <p className="text-xs text-on-surface-variant">Create your first sprint to start planning work.</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
                  New Sprint
                </button>
              </div>
            )}
          </div>

          {/* Backlog */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Backlog</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-outline">{backlog.length}</span>
            </div>
            <div className="space-y-2">
              {backlog.slice(0, 5).map((issue) => (
                <Link key={issue.id} href={`/issues/${issue.id}`} className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm border border-outline-variant/10 flex items-start gap-3 hover:shadow-md transition-shadow block">
                  <span className={clsx("mt-1 w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[issue.priority] ?? "bg-slate-300")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-outline">{issue.id}</p>
                    <p className="text-sm text-on-surface font-medium leading-snug mt-0.5">{issue.title}</p>
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant flex-shrink-0">{issue.estimate ? `${issue.estimate}p` : "—"}</span>
                </Link>
              ))}
              {backlog.length > 5 && (
                <Link href="/issues" className="w-full py-2.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors block text-center">
                  View all {backlog.length} backlog issues
                </Link>
              )}
              {backlog.length === 0 && !loading && (
                <p className="text-xs text-on-surface-variant italic">No backlog issues.</p>
              )}
            </div>
          </div>
        </div>

        {/* Burndown Chart for active sprint */}
        {active && activeStats && activeStats.points.total > 0 && (() => {
          const start = active.startDate ? new Date(active.startDate) : null;
          const end   = active.endDate   ? new Date(active.endDate)   : null;
          if (!start || !end) return null;
          const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
          const daysPassed = Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86_400_000));
          const remaining = activeStats.points.total - activeStats.points.completed;
          const W = 100;
          const H = 80;
          const pts = activeStats.points.total;
          // SVG y=0 is top; y=H is bottom
          // ideal line: (0, H) [all points remaining] → (W, 0) [zero remaining]
          // actual point: x = progress along sprint, y = remaining fraction of H
          const ax = (daysPassed / totalDays) * W;
          const ay = (remaining / pts) * H;
          return (
            <section className="px-6 py-6 border-t border-outline-variant/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Burndown — {active.name}</h2>
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={0} y1={t * H} x2={W} y2={t * H} stroke="rgba(0,0,0,0.05)" strokeWidth={0.5} />
                  ))}
                  {/* Ideal burndown: all points remaining → zero remaining */}
                  <line x1={0} y1={H} x2={W} y2={0} stroke="rgba(124,58,237,0.2)" strokeWidth={1} strokeDasharray="2 2" />
                  {/* Actual: from sprint start (full points) to current remaining */}
                  <line x1={0} y1={H} x2={ax} y2={ay} stroke="#7c3aed" strokeWidth={1.5} strokeLinecap="round" />
                  {/* Current dot */}
                  <circle cx={ax} cy={ay} r={2.5} fill="#7c3aed" />
                </svg>
                <div className="flex items-center justify-between text-xs text-on-surface-variant mt-2">
                  <span>{formatDate(active.startDate)}</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-primary/40" /> Ideal</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-primary" /> Actual</span>
                  </div>
                  <span>{formatDate(active.endDate)}</span>
                </div>
                <p className="text-xs text-center text-on-surface-variant mt-1">
                  <span className="font-bold text-on-surface">{remaining}</span> pts remaining · <span className="font-bold text-on-surface">{daysPassed}</span> / {totalDays} days
                </p>
              </div>
            </section>
          );
        })()}

        {velocity.length > 0 && (() => {
          const maxPts = Math.max(1, ...velocity.map(v => v.committed));
          return (
            <section className="px-6 py-6 border-t border-outline-variant/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Sprint Velocity</h2>
              <div className="space-y-3">
                {velocity.map(v => (
                  <div key={v.sprint} className="flex items-end gap-1 text-xs">
                    <span className="w-20 text-on-surface-variant truncate">{v.sprint}</span>
                    <div className="flex-1 flex items-end gap-1 h-12">
                      <div
                        title={`Committed: ${v.committed}`}
                        style={{ height: `${Math.min(100, (v.committed / maxPts) * 100)}%` }}
                        className="w-4 bg-surface-container-high rounded-t"
                      />
                      <div
                        title={`Completed: ${v.completed}`}
                        style={{ height: `${Math.min(100, (v.completed / maxPts) * 100)}%` }}
                        className="w-4 bg-primary rounded-t"
                      />
                    </div>
                    <span className="text-on-surface-variant">{v.completed}/{v.committed}p</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-surface-container-high inline-block" /> Committed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Completed</span>
              </div>
            </section>
          );
        })()}
      </main>

      <button
        onClick={() => openModal()}
        className="fixed right-6 bottom-24 md:bottom-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40 md:hidden"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
      </button>


      {/* Create Sprint Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-on-surface">New Sprint</h2>
              <button onClick={() => setShowCreate(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">Sprint Name *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Sprint 1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">Sprint Goal <span className="normal-case font-normal opacity-60">(optional)</span></label>
                <input
                  type="text"
                  placeholder="What should this sprint achieve?"
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-rose-500 font-medium">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg border border-outline-variant text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
