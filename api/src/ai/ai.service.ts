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
      return (msg.content[0] as { text: string }).text;
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
