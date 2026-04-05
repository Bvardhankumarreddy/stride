"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api, ApiSprint, ApiIssue } from "@/lib/api";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

const STATUS_STYLES: Record<string, string> = {
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
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("Workspace");
  const [projectId, setProjectId] = useState<string | null>(null);

  // Create sprint modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
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
      const [sprintsData, issuesData] = await Promise.all([
        api.sprints.list(token, pid),
        api.issues.list(token, { limit: "200" }),
      ]);
      setSprints(sprintsData);
      setIssues(issuesData.data);
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
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setSprints((prev) => [sprint, ...prev]);
      setShowCreate(false);
      setForm({ name: "", startDate: "", endDate: "" });
    } catch {
      setFormError("Failed to create sprint. Please try again.");
    } finally {
      setSaving(false);
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
              </div>
              {daysLeft(active.endDate) !== null && (
                <div className="text-right">
                  <p className="text-3xl font-black text-on-surface font-headline">{daysLeft(active.endDate)}</p>
                  <p className="text-xs text-on-surface-variant font-medium">days left</p>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Issues", value: activeStats.total, icon: "confirmation_number" },
                { label: "Completed", value: activeStats.completed, icon: "check_circle", color: "text-primary" },
                { label: "In Progress", value: activeStats.inProgress, icon: "play_circle", color: "text-amber-500" },
                { label: "Story Points", value: `${activeStats.points.completed}/${activeStats.points.total}`, icon: "star", color: "text-secondary" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
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
          </section>
        ) : (
          <section className="px-6 py-8 border-b border-outline-variant/10">
            <p className="text-on-surface-variant text-sm">No active sprint.</p>
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
                <div key={sprint.id} className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow">
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
                      className={clsx("h-full rounded-full", sprint.status === "upcoming" ? "bg-surface-container-high" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!loading && sprints.length === 0 && (
              <p className="text-sm text-on-surface-variant">No sprints found.</p>
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
                <Link key={issue.id} href={`/issues/${issue.id}`} className="bg-white rounded-xl p-3.5 shadow-sm border border-outline-variant/10 flex items-start gap-3 hover:shadow-md transition-shadow block">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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
