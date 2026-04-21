"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import { useToken } from "@/lib/useToken";
import { api, ApiIssue, ApiDoc, issueSlug } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useCreateIssueStore } from "@/store/useCreateIssueStore";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  high:   "bg-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
  medium: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
  low:    "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  default:"bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]",
};


function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1d ago" : `${d}d ago`;
}

function greeting(name: string | null | undefined) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name?.split(" ")[0] ?? "there"}`;
}

export default function DashboardPage() {
  const { openModal } = useCreateIssueStore();
  const token = useToken();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [myIssues, setMyIssues] = useState<ApiIssue[]>([]);
  const [allIssues, setAllIssues] = useState<ApiIssue[]>([]);
  const [docs,   setDocs]   = useState<ApiDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueTab, setIssueTab] = useState<"mine" | "all">("mine");

  useEffect(() => {
    if (!token || !user?.id) return;
    Promise.all([
      api.issues.list(token, { limit: "50", assigneeId: user.id }),
      api.issues.list(token, { limit: "50" }),
      api.docs.list(token, { limit: "4" }),
    ]).then(([mineRes, allRes, docsRes]) => {
      setMyIssues(mineRes.data);
      setAllIssues(allRes.data);
      setDocs(docsRes.data);
    }).finally(() => setLoading(false));
  }, [token, user?.id]);

  const displayIssues = issueTab === "mine" ? myIssues : allIssues;
  const inProgress = allIssues.filter((i) => i.status === "in-progress").length;
  const todo       = allIssues.filter((i) => i.status === "todo").length;
  const overdue    = allIssues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "done").length;

  return (
    <div className="bg-background">
      <TopBar />
      <main className="pt-24 px-6 pb-32 max-w-5xl mx-auto space-y-10">

        {/* Welcome */}
        <section className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface">
            {greeting(user?.name)}
          </h1>
          <p className="text-on-surface-variant font-medium text-lg">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </section>

        {/* AI Digest */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-secondary/40 to-primary/40 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-700" />
          <div className="relative bg-surface-container-lowest p-6 rounded-xl border border-secondary/10 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h2 className="font-headline font-bold text-lg tracking-tight">Your AI Digest</h2>
            </div>
            <ul className="space-y-3">
              {loading ? (
                <li className="h-4 w-48 bg-surface-container-high rounded animate-pulse" />
              ) : [
                `${allIssues.filter((i: ApiIssue) => i.status === "done").length} issues completed across all work`,
                `${inProgress} issue${inProgress !== 1 ? "s" : ""} in progress right now`,
                `${todo} issue${todo !== 1 ? "s" : ""} waiting to be picked up`,
                ...(overdue > 0 ? [`${overdue} overdue issue${overdue !== 1 ? "s" : ""} need attention`] : []),
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2.5 flex-shrink-0" />
                  <span className="font-body text-lg">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <Link href="/issues" className="text-sm font-bold text-secondary flex items-center gap-1 group/btn">
                View all issues
                <span className="material-symbols-outlined transition-transform group-hover/btn:translate-x-1" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Docs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-extrabold text-xl tracking-tight">Recent Docs</h3>
            <Link href="/docs" className="text-primary text-sm font-bold">See all</Link>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar -mx-6 px-6">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-none w-64 h-36 bg-surface-container-low rounded-xl animate-pulse" />
            )) : docs.map((doc) => (
              <Link key={doc.id} href={`/docs/${doc.id}`} className="flex-none w-64 bg-surface-container-low p-5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group block">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-2xl">
                    {doc.emoji}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {doc.project?.name ?? "General"}
                  </span>
                </div>
                <h4 className="font-body text-xl font-semibold mb-1 group-hover:text-primary transition-colors truncate">{doc.title}</h4>
                <p className="text-xs text-on-surface-variant">Edited {timeAgo(doc.updatedAt)}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* My Issues */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-headline font-extrabold text-xl tracking-tight">Issues</h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">{displayIssues.length}</span>
            </div>
            <div className="flex gap-1 p-1 bg-surface-container-low rounded-lg w-fit text-sm font-medium">
              <button onClick={() => setIssueTab("mine")} className={`px-3 py-1.5 rounded-md transition-all ${issueTab === "mine" ? "bg-surface-container-lowest shadow-sm text-primary font-bold" : "text-on-surface-variant"}`}>Mine ({myIssues.length})</button>
              <button onClick={() => setIssueTab("all")} className={`px-3 py-1.5 rounded-md transition-all ${issueTab === "all" ? "bg-surface-container-lowest shadow-sm text-primary font-bold" : "text-on-surface-variant"}`}>All ({allIssues.length})</button>
            </div>
          </div>
          <div className="space-y-2">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-container-lowest rounded-xl animate-pulse" />
            )) : displayIssues.slice(0, 8).map((issue) => (
              <Link key={issue.id} href={`/issues/${issueSlug(issue)}`} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-container-low transition-all duration-200 group block">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[issue.priority] ?? PRIORITY_DOT.default}`} />
                  <div>
                    <p className="font-headline font-semibold text-on-surface group-hover:text-primary transition-colors">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-on-surface-variant/60">{issueSlug(issue)}</span>
                      {issue.project && <>
                        <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary">{issue.project.name}</span>
                      </>}
                    </div>
                  </div>
                </div>
                {issue.assignee && (
                  <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-on-primary-fixed">{issue.assignee.initials}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
          <Link href="/issues" className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors block text-center">
            View all issues →
          </Link>
        </section>
      </main>

      <button
        onClick={() => openModal()}
        className="fixed right-6 bottom-24 md:bottom-8 w-14 h-14 rounded-full ai-shimmer text-white shadow-xl flex items-center justify-center z-40 hover:scale-105 transition-transform active:scale-95"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>
    </div>
  );
}
