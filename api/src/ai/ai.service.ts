import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  constructor(private config: ConfigService) {}

  private getClient(): Anthropic | null {
    if (this.client) return this.client;
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!key) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI features disabled');
      return null;
    }
    this.client = new Anthropic({ apiKey: key });
    return this.client;
  }

  private async complete(system: string, prompt: string, maxTokens = 1024): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (msg.content[0] as { text: string }).text;
      // Strip markdown code fences if Claude wraps the JSON despite instructions
      return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    } catch (err) {
      this.logger.error(`Claude API error: ${err.message}`);
      return null;
    }
  }

  // ── Daily digest ────────────────────────────────────────────────────────────

  async generateDigest(input: {
    sprintName: string;
    startDate: string;
    endDate: string;
    teamSize?: number;
    issues: Array<{ id: string; title: string; status: string; priority: string; assignee?: string; estimate?: number }>;
  }): Promise<{
    health: string;
    healthReason: string;
    summary: string;
    blockers: string[];
    highlights: string[];
    recommendations: string[];
  } | null> {
    const system = `You are an engineering team lead generating a daily sprint digest.
Analyse the sprint data and return ONLY valid JSON with these keys:
- "health": one of "on-track", "at-risk", "off-track"
- "health_reason": one sentence explaining the health rating
- "summary": 2-3 sentence narrative of sprint progress
- "blockers": array of strings, each a current blocker or risk
- "highlights": array of strings, each a positive highlight
- "recommendations": array of strings, each an actionable recommendation
No markdown fences, no extra text.`;

    const done = input.issues.filter(i => i.status === 'done');
    const inProgress = input.issues.filter(i => i.status === 'in-progress');
    const todo = input.issues.filter(i => i.status === 'todo');
    const urgentOpen = input.issues.filter(i => ['urgent', 'high'].includes(i.priority) && i.status !== 'done');

    const issuesStr = input.issues.map(i =>
      `- [${i.status.toUpperCase()}] ${i.id}: ${i.title} (priority=${i.priority}` +
      (i.assignee ? `, assignee=${i.assignee}` : '') +
      (i.estimate ? `, estimate=${i.estimate}pt` : '') + ')'
    ).join('\n');

    const prompt =
      `Sprint: ${input.sprintName} (${input.startDate} → ${input.endDate})\n` +
      `Team size: ${input.teamSize ?? 'unknown'}\n` +
      `Progress: ${done.length} done, ${inProgress.length} in-progress, ${todo.length} todo\n` +
      `Urgent/High priority open: ${urgentOpen.length}\n\nIssues:\n${issuesStr}`;

    const raw = await this.complete(system, prompt, 1024);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        health: data.health,
        healthReason: data.health_reason,
        summary: data.summary,
        blockers: data.blockers ?? [],
        highlights: data.highlights ?? [],
        recommendations: data.recommendations ?? [],
      };
    } catch {
      return null;
    }
  }

  // ── Release notes ───────────────────────────────────────────────────────────

  async generateReleaseNotes(input: {
    sprintName: string;
    projectName: string;
    startDate: string;
    endDate: string;
    version?: string;
    issues: Array<{ id: string; title: string; status: string; priority: string; labels: string[]; assignee?: string }>;
  }): Promise<{
    version: string;
    title: string;
    highlights: string[];
    sections: Record<string, string[]>;
    markdown: string;
  } | null> {
    const system = `You are a technical writer generating release notes from a completed sprint.
Return ONLY valid JSON with these keys:
- "version": the version string (use what's provided or infer from sprint name)
- "title": a short, punchy release title
- "highlights": array of 2-3 top headline features/fixes
- "sections": object where keys are section names (e.g. "Features", "Bug Fixes", "Improvements") and values are arrays of changelog strings
- "markdown": full release notes as a Markdown string ready to publish
Only include issues with status "done". No markdown fences around the JSON itself.`;

    const doneIssues = input.issues.filter(i => i.status === 'done');
    const issuesStr = doneIssues.map(i =>
      `- ${i.id}: ${i.title}` +
      (i.labels.length ? ` [${i.labels.join(', ')}]` : '') +
      (i.assignee ? ` (by ${i.assignee})` : '')
    ).join('\n');

    const prompt =
      `Project: ${input.projectName}\n` +
      `Sprint: ${input.sprintName} (${input.startDate} → ${input.endDate})\n` +
      (input.version ? `Version: ${input.version}\n` : '') +
      `\nCompleted issues (${doneIssues.length}):\n${issuesStr}`;

    const raw = await this.complete(system, prompt, 2048);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return {
        version: input.version ?? input.sprintName,
        title: `${input.sprintName} Release`,
        highlights: [],
        sections: { Notes: [raw] },
        markdown: raw,
      };
    }
  }

  // ── Acceptance criteria ─────────────────────────────────────────────────────

  async generateAcceptanceCriteria(input: {
    title: string;
    description?: string;
    priority?: string;
    labels?: string[];
  }): Promise<string[] | null> {
    const system = `You are a senior product manager writing acceptance criteria for engineering issues.
Output ONLY a JSON array of strings — each string is one acceptance criterion in "Given/When/Then" or plain imperative style.
No markdown, no preamble, no explanation. Example: ["User can log in with email and password", "Invalid credentials show an error message"]`;

    let context = `Title: ${input.title}`;
    if (input.description) context += `\nDescription: ${input.description}`;
    if (input.priority) context += `\nPriority: ${input.priority}`;
    if (input.labels?.length) context += `\nLabels: ${input.labels.join(', ')}`;

    const raw = await this.complete(system, context, 512);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw.split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
    }
  }

  // ── Similar issues ──────────────────────────────────────────────────────────

  async findSimilarIssues(input: {
    target: { id: string; title: string; description?: string };
    candidates: Array<{ id: string; title: string; description?: string }>;
  }): Promise<Array<{ id: string; title: string; reason: string; similarityScore: number }> | null> {
    if (input.candidates.length === 0) return [];

    const system = `You are a duplicate-detection engine for an issue tracker.
Given a target issue and a list of candidates, identify which are similar or potentially duplicate.
Return ONLY a JSON array of objects with keys: "id", "title", "reason" (one sentence), "similarity_score" (float 0-1).
Only include candidates with similarity_score >= 0.4. If none qualify, return [].
No markdown, no preamble.`;

    const targetStr = `ID: ${input.target.id}\nTitle: ${input.target.title}` +
      (input.target.description ? `\nDescription: ${input.target.description}` : '');

    const candidatesStr = input.candidates.map(c =>
      `ID: ${c.id}\nTitle: ${c.title}` + (c.description ? `\nDescription: ${c.description}` : '')
    ).join('\n\n');

    const raw = await this.complete(system, `TARGET:\n${targetStr}\n\nCANDIDATES:\n${candidatesStr}`, 1024);
    if (!raw) return null;

    try {
      const items: any[] = JSON.parse(raw);
      return items.map(i => ({ id: i.id, title: i.title, reason: i.reason, similarityScore: i.similarity_score }));
    } catch {
      return [];
    }
  }

  // ── Sprint analysis ─────────────────────────────────────────────────────────

  async analyzeSprint(input: {
    sprintName: string;
    startDate: string | null;
    endDate: string | null;
    issues: Array<{ id: string; title: string; status: string; priority: string; assignee?: string; estimate?: number }>;
  }): Promise<{
    health: string;
    healthReason: string;
    summary: string;
    completionLikelihood: number;
    risks: string[];
    recommendations: string[];
    highlights: string[];
    workloadBalance: string;
  } | null> {
    const system = `You are an agile engineering coach analysing a sprint. Return ONLY valid JSON with these keys:
- "health": one of "on-track", "at-risk", "off-track"
- "health_reason": one sentence explaining the health rating
- "summary": 2-3 sentence narrative of sprint state and trajectory
- "completion_likelihood": integer 0-100 — estimated % chance the sprint completes all issues on time
- "risks": array of strings, each a specific risk or blocker
- "recommendations": array of strings, each an actionable recommendation for the team
- "highlights": array of strings, each a positive highlight
- "workload_balance": one of "balanced", "unbalanced", "overloaded"
No markdown fences, no extra text.`;

    const done = input.issues.filter(i => i.status === 'done');
    const inProgress = input.issues.filter(i => i.status === 'in-progress');
    const todo = input.issues.filter(i => i.status === 'todo');
    const unassigned = input.issues.filter(i => !i.assignee);
    const urgent = input.issues.filter(i => i.priority === 'urgent' && i.status !== 'done');

    const now = new Date();
    const end = input.endDate ? new Date(input.endDate) : null;
    const start = input.startDate ? new Date(input.startDate) : null;
    const totalDays = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)) : null;
    const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)) : null;

    const issuesStr = input.issues.map(i =>
      `- [${i.status.toUpperCase()}] ${i.title} (priority=${i.priority}` +
      (i.assignee ? `, assignee=${i.assignee}` : ', UNASSIGNED') +
      (i.estimate ? `, ${i.estimate}pt` : '') + ')'
    ).join('\n');

    const prompt =
      `Sprint: ${input.sprintName}\n` +
      (start && end ? `Duration: ${input.startDate} → ${input.endDate} (${totalDays} days total, ${daysLeft} days left)\n` : '') +
      `Progress: ${done.length} done, ${inProgress.length} in-progress, ${todo.length} todo\n` +
      `Urgent open: ${urgent.length} · Unassigned: ${unassigned.length}\n\nIssues:\n${issuesStr}`;

    const raw = await this.complete(system, prompt, 1024);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        health: data.health ?? 'at-risk',
        healthReason: data.health_reason ?? '',
        summary: data.summary ?? '',
        completionLikelihood: Math.max(0, Math.min(100, data.completion_likelihood ?? 50)),
        risks: data.risks ?? [],
        recommendations: data.recommendations ?? [],
        highlights: data.highlights ?? [],
        workloadBalance: data.workload_balance ?? 'balanced',
      };
    } catch {
      return null;
    }
  }

  // ── Roadmap analysis ─────────────────────────────────────────────────────────

  async analyzeRoadmap(input: {
    projectName: string;
    sprints: Array<{
      name: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      totalIssues: number;
      completedIssues: number;
      totalPoints: number;
      completedPoints: number;
    }>;
  }): Promise<{
    overallHealth: string;
    summary: string;
    timeline: string;
    risks: string[];
    recommendations: string[];
    sprintInsights: Array<{ name: string; health: string; note: string }>;
  } | null> {
    const system = `You are a senior engineering manager reviewing a project roadmap. Return ONLY valid JSON with these keys:
- "overall_health": one of "on-track", "at-risk", "off-track"
- "summary": 2-3 sentence executive summary of the roadmap health and outlook
- "timeline": one of "achievable", "optimistic", "unrealistic"
- "risks": array of strings, each a roadmap-level risk
- "recommendations": array of strings, each a strategic recommendation
- "sprint_insights": array of objects, one per sprint, each with "name", "health" (one of "on-track","at-risk","off-track"), "note" (one sentence insight)
No markdown fences, no extra text.`;

    const sprintsStr = input.sprints.map(s => {
      const pct = s.totalIssues ? Math.round((s.completedIssues / s.totalIssues) * 100) : 0;
      return `- ${s.name} [${s.status.toUpperCase()}] ${s.startDate ?? '?'} → ${s.endDate ?? '?'}: ${s.completedIssues}/${s.totalIssues} issues (${pct}%), ${s.completedPoints}/${s.totalPoints} pts`;
    }).join('\n');

    const completed = input.sprints.filter(s => s.status === 'completed').length;
    const active = input.sprints.filter(s => s.status === 'active').length;
    const planned = input.sprints.filter(s => s.status === 'planned' || s.status === 'upcoming').length;

    const prompt =
      `Project: ${input.projectName}\n` +
      `Sprints: ${completed} completed, ${active} active, ${planned} planned\n\n` +
      `Sprint details:\n${sprintsStr}`;

    const raw = await this.complete(system, prompt, 1536);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        overallHealth: data.overall_health ?? 'at-risk',
        summary: data.summary ?? '',
        timeline: data.timeline ?? 'achievable',
        risks: data.risks ?? [],
        recommendations: data.recommendations ?? [],
        sprintInsights: (data.sprint_insights ?? []).map((si: any) => ({
          name: si.name,
          health: si.health,
          note: si.note,
        })),
      };
    } catch {
      return null;
    }
  }

  // ── AI issue writer ─────────────────────────────────────────────────────────

  async writeIssue(input: { roughDescription: string }): Promise<{
    title: string;
    description: string;
    priority: string;
    labels: string[];
    acceptanceCriteria: string[];
  } | null> {
    const system = `You are a senior product manager writing a well-structured engineering issue from a rough description.
Return ONLY valid JSON with these keys:
- "title": concise, action-oriented issue title (max 80 chars)
- "description": 2-3 sentence clear problem/goal statement in markdown
- "priority": one of "urgent", "high", "medium", "low"
- "labels": array of 1-3 relevant label strings (e.g. "bug", "feature", "ux", "backend", "performance")
- "acceptance_criteria": array of 3-5 clear, testable acceptance criteria strings
No markdown fences, no extra text.`;

    const raw = await this.complete(system, `Rough description: ${input.roughDescription}`, 1024);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        title: data.title ?? '',
        description: data.description ?? '',
        priority: data.priority ?? 'medium',
        labels: data.labels ?? [],
        acceptanceCriteria: data.acceptance_criteria ?? [],
      };
    } catch {
      return null;
    }
  }

  // ── Standup generator ────────────────────────────────────────────────────────

  async generateStandup(input: {
    sprintName: string;
    issues: Array<{ title: string; status: string; priority: string; assignee?: string; updatedAt?: string }>;
  }): Promise<{
    yesterday: string[];
    today: string[];
    blockers: string[];
    summary: string;
  } | null> {
    const system = `You are a scrum master generating a daily standup from sprint issue data.
Return ONLY valid JSON with these keys:
- "yesterday": array of strings — what was completed or progressed yesterday
- "today": array of strings — what the team is working on today
- "blockers": array of strings — current blockers or risks (empty array if none)
- "summary": one sentence overall standup summary
No markdown fences, no extra text.`;

    const issuesStr = input.issues.map(i =>
      `- [${i.status.toUpperCase()}] ${i.title}` +
      (i.assignee ? ` (${i.assignee})` : '') +
      (i.priority === 'urgent' ? ' ⚠️ URGENT' : '')
    ).join('\n');

    const inProgress = input.issues.filter(i => i.status === 'in-progress');
    const done = input.issues.filter(i => i.status === 'done');
    const blocked = input.issues.filter(i => ['urgent'].includes(i.priority) && i.status !== 'done');

    const prompt =
      `Sprint: ${input.sprintName}\n` +
      `Done: ${done.length} · In Progress: ${inProgress.length} · Blocked/Urgent: ${blocked.length}\n\n` +
      `Issues:\n${issuesStr}`;

    const raw = await this.complete(system, prompt, 1024);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        yesterday: data.yesterday ?? [],
        today: data.today ?? [],
        blockers: data.blockers ?? [],
        summary: data.summary ?? '',
      };
    } catch {
      return null;
    }
  }

  // ── Summarize comments ──────────────────────────────────────────────────────

  async summarizeComments(input: {
    issueTitle: string;
    comments: Array<{ author: string; body: string; createdAt?: string }>;
  }): Promise<{ summary: string; keyDecisions: string[]; openQuestions: string[] } | null> {
    if (input.comments.length === 0) return null;

    const system = `You are a technical writer summarizing a discussion thread on an engineering issue.
Return ONLY valid JSON with three keys:
- "summary": 2-3 sentence plain-English summary of what was discussed
- "key_decisions": array of strings, each a decision that was reached
- "open_questions": array of strings, each an unresolved question or blocker
No markdown fences, no extra text.`;

    const thread = input.comments.map(c => `[${c.author}]: ${c.body}`).join('\n');
    const raw = await this.complete(system, `Issue: ${input.issueTitle}\n\nThread:\n${thread}`, 768);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return { summary: data.summary, keyDecisions: data.key_decisions ?? [], openQuestions: data.open_questions ?? [] };
    } catch {
      return { summary: raw, keyDecisions: [], openQuestions: [] };
    }
  }
}
