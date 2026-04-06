"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  total: number;
  done: number;
  inProgress: number;
  totalPts: number;
  donePts: number;
};

type Project = {
  id: string;
  name: string;
  sprints: Sprint[];
};

type RoadmapData = {
  org: { name: string; slug: string } | null;
  projects: Project[];
};

const STATUS_STYLES: Record<string, { pill: string; label: string }> = {
  active:    { pill: "bg-primary/10 text-primary border border-primary/20",              label: "Active" },
  completed: { pill: "bg-emerald-100 text-emerald-700",                                  label: "Done" },
  planned:   { pill: "bg-surface-container-high text-on-surface-variant",                label: "Planned" },
  upcoming:  { pill: "bg-surface-container-high text-on-surface-variant",                label: "Upcoming" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PublicRoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const params = new URLSearchParams(window.location.search);
    const org = params.get("org") ?? "";
    fetch(`${API}/public/roadmap${org ? `?org=${encodeURIComponent(org)}` : ""}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-outline-variant/20 bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="font-headline font-black text-on-surface text-lg tracking-tight">stride</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Public Roadmap</span>
          <Link href="/login" className="text-xs font-bold px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-surface-container-low rounded w-64" />
            <div className="h-4 bg-surface-container-low rounded w-96" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-surface-container-low rounded-2xl" />
            ))}
          </div>
        ) : error || !data?.org ? (
          <div className="text-center py-24 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: 32 }}>map</span>
            </div>
            <p className="text-lg font-bold text-on-surface">No public roadmap available</p>
            <p className="text-sm text-on-surface-variant">This workspace hasn&apos;t shared a public roadmap yet.</p>
            <Link href="/" className="inline-block mt-4 text-sm font-bold text-primary hover:underline">Learn about Stride →</Link>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">
                {data.org.name} Roadmap
              </h1>
              <p className="text-on-surface-variant text-base">Track our progress and upcoming work.</p>
            </div>

            {data.projects.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No projects found.</p>
            ) : (
              data.projects.map((project) => (
                <div key={project.id} className="mb-12">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-5 flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>folder</span>
                    {project.name}
                  </h2>

                  {project.sprints.length === 0 ? (
                    <p className="text-sm text-on-surface-variant pl-4">No sprints yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {project.sprints.map((sprint) => {
                        const pct = sprint.total ? Math.round((sprint.done / sprint.total) * 100) : 0;
                        const style = STATUS_STYLES[sprint.status] ?? STATUS_STYLES.planned;
                        return (
                          <div
                            key={sprint.id}
                            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-6 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-bold text-on-surface text-base">{sprint.name}</h3>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${style.pill}`}>
                                    {style.label}
                                  </span>
                                </div>
                                {sprint.goal && (
                                  <p className="text-sm text-on-surface-variant">{sprint.goal}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs text-on-surface-variant">{formatDate(sprint.startDate)}</p>
                                <p className="text-xs text-on-surface-variant">→ {formatDate(sprint.endDate)}</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-on-surface-variant">{sprint.done}/{sprint.total} issues complete</span>
                                <span className="text-xs font-bold text-on-surface">{pct}%</span>
                              </div>
                              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                {sprint.inProgress} in progress
                              </span>
                              {sprint.totalPts > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                                  <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>star</span>
                                  {sprint.donePts}/{sprint.totalPts} pts
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </main>

      <footer className="border-t border-outline-variant/10 mt-16 py-8 text-center">
        <p className="text-xs text-on-surface-variant">
          Powered by{" "}
          <Link href="/" className="font-bold text-primary hover:underline">Stride</Link>
          {" "}— the AI-native project management platform
        </p>
      </footer>
    </div>
  );
}
