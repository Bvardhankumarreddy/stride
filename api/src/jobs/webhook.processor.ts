import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_WEBHOOK } from './jobs.constants';

export interface WebhookPayload {
  source: 'github';
  event: 'pull_request.opened' | 'pull_request.merged' | 'pull_request.closed';
  issueId?: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  repoName: string;
  author: string;
  merged?: boolean;
}

@Processor(QUEUE_WEBHOOK)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookPayload>): Promise<void> {
    const { event, issueId, prNumber, prTitle, prUrl, repoName, author } = job.data;
    this.logger.log(`Processing GitHub webhook: ${event} — PR #${prNumber}`);

    if (!issueId) {
      this.logger.warn('No issueId linked to this PR — skipping notification');
      return;
    }

    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { assignee: true, creator: true },
    });

    if (!issue) {
      this.logger.warn(`Issue ${issueId} not found`);
      return;
    }

    const recipientIds = [issue.assigneeId, issue.creatorId].filter(Boolean) as string[];
    if (recipientIds.length === 0) return;

    const eventLabels: Record<string, string> = {
      'pull_request.opened': 'PR opened',
      'pull_request.merged': 'PR merged',
      'pull_request.closed': 'PR closed',
    };

    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        type: 'github',
        title: `${eventLabels[event] ?? event} on ${issue.title}`,
        body: `${author} ${eventLabels[event]?.toLowerCase() ?? event} PR #${prNumber}: "${prTitle}" in ${repoName}. ${prUrl}`,
        issueId,
        userId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`GitHub webhook notification sent for issue ${issueId}`);
  }
}
