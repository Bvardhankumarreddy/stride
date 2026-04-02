"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SearchResult {
  type: "issue" | "doc";
  id: string;
  title: string;
  meta: string;
  href: string;
  highlight?: string;
}

interface RecentItem {
  type: string;
  icon: string;
  label: string;
  title: string;
  href: string;
}

const FILTERS = ["All", "Issues", "Docs"];
const FILTER_MAP: Record<string, string> = { Issues: "issues", Docs: "docs" };

function ResultIcon({ type }: { type: string }) {
  const cfg = type === "issue"
    ? { icon: "confirmation_number", cls: "bg-primary/10 text-primary" }
    : { icon: "description",         cls: "bg-secondary/10 text-secondary" };
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${cfg.cls}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cfg.icon}</span>
    </div>
  );
}

export default function SearchPage() {
  const token = useToken();
  const [query, setQuery]               = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [loading, setLoading]           = useState(false);
  const [recent, setRecent]             = useState<RecentItem[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.issues.list(token, { limit: "3" }),
      api.docs.list(token, { limit: "2" }),
    ]).then(([issuesRes, docsRes]) => {
      const issueItems: RecentItem[] = issuesRes.data.map(i => ({
        type: "issue", icon: "confirmation_number", label: i.id.length > 8 ? `#${i.id.slice(-6).toUpperCase()}` : i.id, title: i.title, href: `/issues/${i.id}`,
      }));
      const docItems: RecentItem[] = docsRes.data.map(d => ({
        type: "doc", icon: "description", label: "Doc", title: d.title, href: `/docs/${d.id}`,
      }));
      setRecent([...issueItems, ...docItems]);
    }).catch(() => {});
  }, [token]);

  const doSearch = useCallback(async (q: string, filter: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (FILTER_MAP[filter]) params.set("filter", FILTER_MAP[filter]);

      const res = await fetch(`${API}/search?${params}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, activeFilter), 250);
    return () => clearTimeout(t);
  }, [query, activeFilter, doSearch]);

  return (
    <div className="bg-background min-h-screen">
      <TopBar breadcrumbs={[{ label: "Search" }]} />

      <main className="pt-20 pb-28 md:pb-10 max-w-2xl mx-auto px-4">
        <div className="pt-4 mb-6">
          {/* Search input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
              search
            </span>
            <input
              autoFocus
              type="text"
              placeholder="Search issues, docs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-base bg-surface-container-lowest border border-outline-variant/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-on-surface-variant/50"
            />
            {loading && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {query && !loading && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={clsx(
                  "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  f === activeFilter
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Recent — shown when no query */}
        {!query && (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">Recent</p>
            <div className="space-y-1">
              {recent.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{item.icon}</span>
                  <span className="text-xs font-bold text-on-surface-variant/60 font-label w-16 flex-shrink-0 truncate">{item.label}</span>
                  <span className="text-sm text-on-surface truncate">{item.title}</span>
                  <span className="ml-auto material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 16 }}>north_west</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {query ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
              {loading ? "Searching…" : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`}
            </p>
            <div className="space-y-1">
              {!loading && results.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl block mb-3">search_off</span>
                  <p className="text-on-surface-variant font-medium">No results found</p>
                  <p className="text-sm text-on-surface-variant/60 mt-1">Try a different search term</p>
                </div>
              ) : (
                results.map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-start gap-3 px-4 py-3.5 rounded-xl hover:bg-surface-container-low transition-colors group">
                    <ResultIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">{item.title}</p>
                      {item.highlight ? (
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate" dangerouslySetInnerHTML={{ __html: item.highlight }} />
                      ) : (
                        <p className="text-xs text-on-surface-variant mt-0.5">{item.meta}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-[10px] font-bold text-on-surface-variant/50 font-label pt-1 uppercase">{item.type}</span>
                  </Link>
                ))
              )}
            </div>
          </>
        ) : (
          /* Quick links */
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">Quick Links</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "confirmation_number", label: "My Issues", href: "/issues",  color: "text-primary bg-primary/10" },
                { icon: "description",         label: "All Docs",  href: "/docs",    color: "text-secondary bg-secondary/10" },
                { icon: "timeline",            label: "Roadmap",   href: "/roadmap", color: "text-amber-600 bg-amber-50" },
                { icon: "view_kanban",         label: "Board",     href: "/board",   color: "text-emerald-600 bg-emerald-50" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10 hover:shadow-md transition-all">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${link.color}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{link.icon}</span>
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
