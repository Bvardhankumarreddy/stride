"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import TopBar from "@/components/TopBar";
import { useToken } from "@/lib/useToken";
import { api, ApiSprint } from "@/lib/api";
import { toast } from "@/components/Toast";
import clsx from "clsx";

type RoadmapAnalysis = {
  overallHealth: string;
  summary: string;
  timeline: string;
  risks: string[];
  recommendations: string[];
  sprintInsights: { name: string; health: string; note: string }[];
};

const HEALTH_STYLES: Record<string, { badge: string; bar: string; icon: string; dot: string }> = {
  "on-track":  { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", bar: "bg-emerald-500", icon: "check_circle", dot: "bg-emerald-400" },
  "at-risk":   { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         bar: "bg-amber-500",   icon: "warning",      dot: "bg-amber-400" },
  "off-track": { badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",             bar: "bg-rose-500",    icon: "cancel",       dot: "bg-rose-400" },
};

const SPRINT_COLORS = [
  { bar: "bg-blue-100 text-blue-700 border-blue-200/50", dot: "bg-blue-400" },
  { bar: "bg-purple-100 text-purple-700 border-purple-200/50", dot: "bg-purple-400" },
  { bar: "bg-amber-100 text-amber-700 border-amber-200/50", dot: "bg-amber-400" },
  { bar: "bg-violet-100 text-violet-700 border-violet-200/50", dot: "bg-violet-400" },
  { bar: "bg-emerald-100 text-emerald-700 border-emerald-200/50", dot: "bg-emerald-400" },
  { bar: "bg-rose-100 text-rose-700 border-rose-200/50", dot: "bg-rose-400" },
];

export default function RoadmapPage() {
  const token = useToken();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<ApiSprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState("Quarter");
  const [teamOpen, setTeamOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const teamRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<RoadmapAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Load projects once
  useEffect(() => {
    if (!token) return;
    api.projects.list(token).then(list => {
      setProjects(list);
      if (list[0]) setSelectedProjectId(list[0].id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  // Reload sprints whenever selected project changes
  useEffect(() => {
    if (!token || !selectedProjectId) return;
    setLoading(true);
    api.sprints.list(token, selectedProjectId)
      .then(s => setSprints(s))
      .catch(() => setSprints([]))
      .finally(() => setLoading(false));
  }, [token, selectedProjectId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const filteredSprints = filterStatus === "All" ? sprints : sprints.filter(s => s.status === filterStatus.toLowerCase());

  async function handleAnalyzeRoadmap() {
    if (!token || sprints.length === 0) return;
    setAnalysisLoading(true);
    setShowAnalysis(true);
    setAnalysis(null);
    try {
      const result = await api.ai.analyzeRoadmap(token, {
        projectName: selectedProject?.name ?? "Project",
        sprints: sprints.map(s => {
          const si = (s.issues ?? []);
          return {
            name: s.name,
            status: s.status,
            startDate: s.startDate,
            endDate: s.endDate,
            totalIssues: s._count?.issues ?? si.length,
            completedIssues: si.filter(i => i.status === "done").length,
            totalPoints: si.reduce((acc, i) => acc + (i.estimate ?? 0), 0),
            completedPoints: si.filter(i => i.status === "done").reduce((acc, i) => acc + (i.estimate ?? 0), 0),
          };
        }),
      });
      setAnalysis(result);
    } catch {
      toast("AI analysis failed. Please try again.");
      setShowAnalysis(false);
    } finally {
      setAnalysisLoading(false);
    }
  }

  const { columns, getLeft, getWidth, todayPct } = useMemo(() => {
    const now = new Date();
    const validSprints = filteredSprints.filter(s => s.startDate && s.endDate);

    let rangeStart: Date;
    let rangeEnd: Date;

    if (validSprints.length === 0) {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    } else {
      const minMs = Math.min(...validSprints.map(s => new Date(s.startDate!).getTime()));
      const maxMs = Math.max(...validSprints.map(s => new Date(s.endDate!).getTime()));
      const minDate = new Date(minMs);
      const maxDate = new Date(maxMs);
      rangeStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      rangeEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    }

    // For Month/Week zoom, narrow the range to current window
    if (zoom === "Month") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (zoom === "Week") {
      const day = now.getDay();
      rangeStart = new Date(now); rangeStart.setDate(now.getDate() - day); rangeStart.setHours(0,0,0,0);
      rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeStart.getDate() + 6); rangeEnd.setHours(23,59,59,999);
    }

    const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 1);

    const getLeft = (date: Date | null) => {
      if (!date) return 0;
      return Math.max(0, Math.min(100, (date.getTime() - rangeStart.getTime()) / totalMs * 100));
    };

    const getWidth = (start: Date | null, end: Date | null) => {
      if (!start || !end) return 0;
      return Math.max(2, Math.min(100 - getLeft(start), (end.getTime() - start.getTime()) / totalMs * 100));
    };

    const todayPct = getLeft(now);

    // Build column headers based on zoom
    const columns: { label: string; date: Date }[] = [];
    if (zoom === "Quarter") {
      const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cur <= rangeEnd) {
        columns.push({ label: cur.toLocaleDateString("en-US", { month: "short", year: columns.length === 0 || cur.getMonth() === 0 ? "2-digit" : undefined }), date: new Date(cur) });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else if (zoom === "Month") {
      // Weekly columns within the month
      const cur = new Date(rangeStart);
      let week = 1;
      while (cur <= rangeEnd) {
        columns.push({ label: `W${week}`, date: new Date(cur) });
        cur.setDate(cur.getDate() + 7);
        week++;
      }
    } else {
      // Daily columns for the week
      const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        columns.push({ label: `${DAYS[cur.getDay()]} ${cur.getDate()}`, date: new Date(cur) });
        cur.setDate(cur.getDate() + 1);
      }
    }

    return { columns, getLeft, getWidth, todayPct };
  }, [filteredSprints, zoom]);

  return (
    <div className="bg-surface">
      <TopBar breadcrumbs={[{ label: "Roadmap" }]} />
      <main className="pt-24 px-6 pb-32 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Roadmap</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {sprints.length > 0 && (
              <button
                onClick={handleAnalyzeRoadmap}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-sm font-bold hover:bg-secondary/20 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Analyze Roadmap
              </button>
            )}
            <div className="bg-surface-container-low p-1 rounded-lg flex items-center">
              {["Quarter", "Month", "Week"].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={clsx(
                    "px-4 py-1.5 text-sm rounded-md font-medium transition-all",
                    z === zoom ? "bg-surface-container-lowest shadow-sm text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {z}
                </button>
              ))}
            </div>
            <div className="relative" ref={teamRef}>
              <button
                onClick={() => setTeamOpen(v => !v)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border rounded-lg text-sm font-medium transition-colors",
                  teamOpen ? "border-primary/30 text-primary bg-primary/5" : "border-outline-variant/20 hover:bg-surface-container-low"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                {selectedProject ? selectedProject.name : "All Projects"}
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
              </button>
              {teamOpen && projects.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 z-50">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); setTeamOpen(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-2 text-sm transition-colors",
                        p.id === selectedProjectId ? "text-primary font-bold bg-primary/5" : "text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(v => !v)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border rounded-lg text-sm font-medium transition-colors",
                  filterOpen || filterStatus !== "All" ? "border-primary/30 text-primary bg-primary/5" : "border-outline-variant/20 hover:bg-surface-container-low"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
                {filterStatus === "All" ? "Filter" : filterStatus}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 z-50">
                  {["All", "Active", "Planned", "Completed"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setFilterStatus(opt); setFilterOpen(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-2 text-sm transition-colors",
                        opt === filterStatus ? "text-primary font-bold bg-primary/5" : "text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-surface-container-low rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-container-low rounded-xl" />
            ))}
          </div>
        ) : filteredSprints.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-16 text-center">
            <p className="text-on-surface-variant text-sm">No sprints found. Create a sprint to see your roadmap.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 mb-10">
            {/* Header */}
            <div className="flex border-b border-outline-variant/10">
              <div className="w-52 p-4 border-r border-outline-variant/10 text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low flex-shrink-0">
                Sprint
              </div>
              <div className="flex-1 flex text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low overflow-hidden">
                {columns.map((col, i) => (
                  <div
                    key={col.date.getTime()}
                    className={clsx("py-4 flex-1 truncate", i < columns.length - 1 && "border-r border-outline-variant/10")}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* TODAY marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                style={{ left: `calc(13rem + ${todayPct / 100} * (100% - 13rem))` }}
              >
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10" />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">TODAY</div>
              </div>

              {filteredSprints.map((sprint, idx) => {
                const color = SPRINT_COLORS[idx % SPRINT_COLORS.length];
                const start = sprint.startDate ? new Date(sprint.startDate) : null;
                const end = sprint.endDate ? new Date(sprint.endDate) : null;
                const left = getLeft(start);
                const width = getWidth(start, end);
                return (
                  <div key={sprint.id} className="flex group hover:bg-surface-container-low/50 transition-colors">
                    <div className="w-52 p-5 border-r border-outline-variant/10 flex items-center gap-3 flex-shrink-0">
                      <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                      <span className="text-sm font-medium text-on-surface truncate">{sprint.name}</span>
                    </div>
                    <div className="flex-1 relative h-16">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundSize: `${columns.length ? 100 / columns.length : 33}% 100%`,
                          backgroundImage: "linear-gradient(to right, transparent 99%, rgba(114,119,133,0.1) 1%)",
                        }}
                      />
                      {start && end && (
                        <div
                          className={clsx("absolute top-4 h-8 rounded-full flex items-center px-4 text-xs font-semibold shadow-sm border overflow-hidden", color.bar)}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="truncate">{sprint.name}</span>
                          {sprint.status === "active" && (
                            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* AI Roadmap Analysis — inline section */}
        {showAnalysis && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            {analysisLoading ? (
              <div className="flex items-center gap-3 px-6 py-8">
                <div className="w-5 h-5 rounded-full border-2 border-secondary border-t-transparent animate-spin flex-shrink-0" />
                <p className="text-sm text-on-surface-variant">Analyzing roadmap…</p>
              </div>
            ) : analysis ? (
              <div className="p-6 space-y-6">
                {/* Top row: health + timeline + re-analyze */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold", HEALTH_STYLES[analysis.overallHealth]?.badge ?? HEALTH_STYLES["at-risk"].badge)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{HEALTH_STYLES[analysis.overallHealth]?.icon ?? "warning"}</span>
                    <span className="capitalize">{analysis.overallHealth.replace("-", " ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                    <span className="capitalize">{analysis.timeline}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="text-xs font-bold text-secondary uppercase tracking-widest">AI Analysis</span>
                  </div>
                </div>

                <p className="text-sm text-on-surface leading-relaxed">{analysis.summary}</p>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Sprint insights */}
                  {analysis.sprintInsights.length > 0 && (
                    <div className="md:col-span-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Sprint Insights</p>
                      <div className="space-y-2">
                        {analysis.sprintInsights.map((si, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-surface-container">
                            <span className={clsx("w-2 h-2 rounded-full mt-1 flex-shrink-0", HEALTH_STYLES[si.health]?.dot ?? "bg-amber-400")} />
                            <div>
                              <p className="text-xs font-bold text-on-surface">{si.name}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">{si.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {analysis.risks.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Risks</p>
                      <ul className="space-y-2">
                        {analysis.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-amber-500 mt-0.5 flex-shrink-0" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>warning</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Recommendations</p>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/10">
                  <button
                    onClick={handleAnalyzeRoadmap}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>refresh</span>
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
            ) : null}
          </div>
        )}

      </main>
    </div>
  );
}
