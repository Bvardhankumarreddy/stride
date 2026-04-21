import { Injectable, Logger } from '@nestjs/common';
import { TypesenseClient, ISSUES_COLLECTION, DOCS_COLLECTION } from './typesense.client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private ts: TypesenseClient,
    private prisma: PrismaService,
  ) {}

  // ── Issues ─────────────────────────────────────────────────────────────────

  async indexIssue(issue: {
    id: string;
    number?: number | null;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    labels: any;
    projectId?: string | null;
    sprintId?: string | null;
    assignee?: { name: string } | null;
    project?: { key?: string | null } | null;
    createdAt: Date;
  }) {
    const doc = {
      id: issue.id,
      number: issue.number ?? 0,
      title: issue.title,
      description: issue.description ?? '',
      status: issue.status,
      priority: issue.priority,
      labels: Array.isArray(issue.labels) ? issue.labels.map(String) : [],
      projectId: issue.projectId ?? '',
      projectKey: issue.project?.key ?? '',
      sprintId: issue.sprintId ?? '',
      assigneeName: issue.assignee?.name ?? '',
      createdAt: Math.floor(issue.createdAt.getTime() / 1000),
    };

    try {
      await this.ts.client.collections(ISSUES_COLLECTION).documents().upsert(doc);
    } catch (err) {
      this.logger.warn(`Failed to index issue ${issue.id}: ${err.message}`);
    }
  }

  async removeIssue(id: string) {
    try {
      await this.ts.client.collections(ISSUES_COLLECTION).documents(id).delete();
    } catch { /* already gone */ }
  }

  // ── Docs ───────────────────────────────────────────────────────────────────

  async indexDoc(doc: {
    id: string;
    title: string;
    emoji?: string | null;
    status: string;
    wordCount: number;
    projectId?: string | null;
    author?: { name: string } | null;
    createdAt: Date;
  }) {
    const record = {
      id: doc.id,
      title: doc.title,
      emoji: doc.emoji ?? '📄',
      status: doc.status,
      wordCount: doc.wordCount,
      projectId: doc.projectId ?? '',
      authorName: doc.author?.name ?? '',
      createdAt: Math.floor(doc.createdAt.getTime() / 1000),
    };

    try {
      await this.ts.client.collections(DOCS_COLLECTION).documents().upsert(record);
    } catch (err) {
      this.logger.warn(`Failed to index doc ${doc.id}: ${err.message}`);
    }
  }

  async removeDoc(id: string) {
    try {
      await this.ts.client.collections(DOCS_COLLECTION).documents(id).delete();
    } catch { /* already gone */ }
  }

  // ── Multi-search ───────────────────────────────────────────────────────────

  async search(query: string, filter?: 'issues' | 'docs') {
    if (this.ts.available) {
      return this.typesenseSearch(query, filter);
    }
    return this.prismaSearch(query, filter);
  }

  private async typesenseSearch(query: string, filter?: 'issues' | 'docs'): Promise<SearchResult[]> {
    const q = query.trim() || '*';
    const searches: any[] = [];

    if (!filter || filter === 'issues') {
      searches.push({ collection: ISSUES_COLLECTION, q, query_by: 'title,description,assigneeName', sort_by: 'createdAt:desc', per_page: 10 });
    }
    if (!filter || filter === 'docs') {
      searches.push({ collection: DOCS_COLLECTION, q, query_by: 'title,authorName', sort_by: 'createdAt:desc', per_page: 10 });
    }

    const response = await this.ts.client.multiSearch.perform({ searches }, {});
    const results: SearchResult[] = [];

    response.results.forEach((res: any, idx: number) => {
      const type = searches[idx].collection === ISSUES_COLLECTION ? 'issue' : 'doc';
      (res.hits ?? []).forEach((hit: any) => {
        const doc = hit.document;
        if (type === 'issue') {
          const slug = doc.projectKey && doc.number ? `${doc.projectKey}-${doc.number}` : doc.id;
          results.push({ type: 'issue', id: doc.id, title: doc.title, meta: `${doc.status} · ${doc.priority}`, href: `/issues/${slug}`, highlight: hit.highlights?.[0]?.snippet });
        } else {
          results.push({ type: 'doc', id: doc.id, title: doc.title, meta: `${doc.status} · ${doc.authorName || 'Unknown'}`, href: `/docs/${doc.id}`, highlight: hit.highlights?.[0]?.snippet });
        }
      });
    });

    return results;
  }

  private async prismaSearch(query: string, filter?: 'issues' | 'docs'): Promise<SearchResult[]> {
    const q = query.trim();
    const results: SearchResult[] = [];

    if (!filter || filter === 'issues') {
      const issues = await this.prisma.issue.findMany({
        where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
        include: { assignee: { select: { name: true } }, project: { select: { key: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      issues.forEach((i: any) => {
        const slug = i.project?.key && i.number ? `${i.project.key}-${i.number}` : i.id;
        results.push({ type: 'issue', id: i.id, title: i.title, meta: `${i.status} · ${i.priority}`, href: `/issues/${slug}` });
      });
    }

    if (!filter || filter === 'docs') {
      const docs = await this.prisma.document.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      docs.forEach((d) => results.push({ type: 'doc', id: d.id, title: d.title, meta: `${d.status} · ${d.author?.name ?? 'Unknown'}`, href: `/docs/${d.id}` }));
    }

    return results;
  }

  // ── Bulk re-index ──────────────────────────────────────────────────────────

  async reindex(issues: any[], docs: any[]) {
    for (const issue of issues) await this.indexIssue(issue);
    for (const doc of docs) await this.indexDoc(doc);
    return { issues: issues.length, docs: docs.length };
  }
}

export interface SearchResult {
  type: 'issue' | 'doc';
  id: string;
  title: string;
  meta: string;
  href: string;
  highlight?: string;
}
