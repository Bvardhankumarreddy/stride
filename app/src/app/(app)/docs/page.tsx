"use client";

import { useEffect, useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToken } from "@/lib/useToken";
import { api, ApiDoc } from "@/lib/api";
import clsx from "clsx";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  "in-review": "bg-secondary/10 text-secondary",
  published: "bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  "in-review": "In Review",
  published: "Published",
};

const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "a-z", label: "Title A–Z" },
  { id: "z-a", label: "Title Z–A" },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "in-review", label: "In Review" },
  { id: "published", label: "Published" },
];

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function DocsPage() {
  const router = useRouter();
  const token = useToken();
  const [docs, setDocs] = useState<ApiDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (!token) return;
    api.docs.list(token, { limit: "100" }).then((res) => {
      setDocs(res.data);
    }).finally(() => setLoading(false));
  }, [token]);

  const displayDocs = useMemo(() => {
    let result = filterStatus === "all" ? docs : docs.filter(d => d.status === filterStatus);
    if (sort === "newest") result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else if (sort === "oldest") result = [...result].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    else if (sort === "a-z") result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "z-a") result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    return result;
  }, [docs, sort, filterStatus]);

  const activeSort = SORT_OPTIONS.find(o => o.id === sort)!;
  const activeFilter = FILTER_OPTIONS.find(o => o.id === filterStatus)!;

  return (
    <div className="bg-background min-h-screen" onClick={() => { setSortOpen(false); setFilterOpen(false); }}>
      <TopBar
        breadcrumbs={[{ label: "Specs" }]}
        actions={
          <button onClick={() => router.push("/docs/new")} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New doc
          </button>
        }
      />

      <main className="pt-20 pb-28 md:pb-10 max-w-3xl mx-auto px-4">
        <div className="pt-4 mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Specs</h1>
            <p className="text-sm text-on-surface-variant mt-1">{loading ? "…" : `${displayDocs.length} of ${docs.length}`} documents</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setSortOpen(v => !v); setFilterOpen(false); }}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
                  sortOpen
                    ? "bg-primary/5 text-primary border-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sort</span>
                {activeSort.label}
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 z-50">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.id}
                      onClick={() => { setSort(o.id); setSortOpen(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-2 text-sm transition-colors",
                        o.id === sort ? "text-primary font-bold bg-primary/5" : "text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setFilterOpen(v => !v); setSortOpen(false); }}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
                  filterStatus !== "all"
                    ? "bg-primary/5 text-primary border-primary/20"
                    : filterOpen
                    ? "bg-surface-container-high text-on-surface border-outline-variant/20"
                    : "text-on-surface-variant hover:bg-surface-container-high border-outline-variant/20"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
                {filterStatus === "all" ? "Filter" : activeFilter.label}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 py-1 z-50">
                  {FILTER_OPTIONS.map(o => (
                    <button
                      key={o.id}
                      onClick={() => { setFilterStatus(o.id); setFilterOpen(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-2 text-sm transition-colors",
                        o.id === filterStatus ? "text-primary font-bold bg-primary/5" : "text-on-surface hover:bg-surface-container-low"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI suggestion — most recently updated doc */}
        {!loading && docs.length > 0 && sort === "newest" && filterStatus === "all" && (
          <div className="mb-6 p-4 rounded-2xl bg-secondary/5 border border-secondary/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Continue where you left off</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                <span className="font-medium text-on-surface">{docs[0].title}</span> was last edited {timeAgo(docs[0].updatedAt)}.
              </p>
            </div>
            <Link href={`/docs/${docs[0].id}`} className="ml-auto flex-shrink-0 text-xs font-semibold text-primary hover:underline">Open →</Link>
          </div>
        )}

        {/* Doc cards */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-surface-container-low rounded-2xl animate-pulse" />
            ))
          ) : displayDocs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-on-surface-variant text-sm">No documents match your filter.</p>
            </div>
          ) : displayDocs.map((doc) => (
            <Link
              key={doc.id}
              href={`/docs/${doc.id}`}
              className="block bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl leading-none select-none">{doc.emoji || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${STATUS_CLASS[doc.status] ?? STATUS_CLASS.draft}`}>
                      {STATUS_LABEL[doc.status] ?? doc.status}
                    </span>
                    {doc.visibility === "private" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>lock</span>
                        Private
                      </span>
                    )}
                    {doc.visibility === "public" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>public</span>
                        Public
                      </span>
                    )}
                    {doc.project && (
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">{doc.project.name}</span>
                    )}
                  </div>
                  <h2 className="font-headline font-bold text-base text-on-surface group-hover:text-primary transition-colors leading-snug">{doc.title}</h2>
                  <div className="flex items-center gap-3 mt-3">
                    {doc.author && (
                      <div className="w-5 h-5 rounded-full bg-primary-fixed border border-surface-container-lowest flex items-center justify-center">
                        <span className="text-[7px] font-bold text-on-primary-fixed">{doc.author.initials}</span>
                      </div>
                    )}
                    <span className="text-xs text-on-surface-variant">Updated {timeAgo(doc.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <button onClick={() => router.push("/docs/new")} className="w-full mt-4 py-5 rounded-2xl border-2 border-dashed border-outline-variant/20 text-sm text-on-surface-variant hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Create new document
        </button>
      </main>
    </div>
  );
}
