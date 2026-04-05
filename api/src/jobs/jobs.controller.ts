import { Controller, Post, Body, HttpCode, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookPayload } from './webhook.processor';

class GithubWebhookDto {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    merged: boolean;
    user: { login: string };
    body: string;
  };
  repository: { full_name: string };
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class JobsController {
  constructor(
    private jobs: JobsService,
    private prisma: PrismaService,
  ) {}

  @Post('github')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive GitHub pull_request webhook events' })
  async githubWebhook(@Body() body: GithubWebhookDto) {
    const validActions = ['opened', 'closed', 'merged'];
    if (!validActions.includes(body.action)) return { queued: false };

    const match = body.pull_request?.body?.match(/(?:closes|fixes|resolves)\s+(STR-\d+)/i);
    const issueId = match?.[1];

    const event =
      body.action === 'closed' && body.pull_request.merged
        ? 'pull_request.merged'
        : body.action === 'closed'
          ? 'pull_request.closed'
          : 'pull_request.opened';

    const payload: WebhookPayload = {
      source: 'github',
      event,
      issueId,
      prNumber: body.pull_request.number,
      prTitle: body.pull_request.title,
      prUrl: body.pull_request.html_url,
      repoName: body.repository.full_name,
      author: body.pull_request.user.login,
      merged: body.pull_request.merged,
    };

    const job = await this.jobs.enqueueWebhook(payload);
    return { queued: true, jobId: job?.id };
  }

  /** Trigger daily digest for all org members — call this from a cron or manually */
  @Post('trigger-digests')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enqueue morning digest emails for all org members' })
  async triggerDigests(@Req() req: any) {
    const organizationId = req.user.organizationId;

    // Only send to users with aiDigest enabled (check org aiSettings)
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const aiSettings = (org?.aiSettings ?? {}) as { digest?: boolean };
    if (aiSettings.digest === false) return { queued: 0, reason: 'digest disabled' };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Get active sprint for summary
    const activeSprint = await this.prisma.sprint.findFirst({
      where: { project: { organizationId }, status: 'active' },
      orderBy: { startDate: 'desc' },
    });

    const [totalIssues, doneThisWeek, inProgress, overdue] = await Promise.all([
      this.prisma.issue.count({ where: { organizationId } }),
      this.prisma.issue.count({ where: { organizationId, status: 'done', updatedAt: { gte: weekAgo } } }),
      this.prisma.issue.count({ where: { organizationId, status: 'in-progress' } }),
      this.prisma.issue.count({ where: { organizationId, dueDate: { lt: now }, status: { not: 'done' } } }),
    ]);

    const sprintDaysLeft = activeSprint?.endDate
      ? Math.max(0, Math.ceil((activeSprint.endDate.getTime() - now.getTime()) / 86_400_000))
      : undefined;

    let queued = 0;
    for (const member of members) {
      await this.jobs.scheduleEmailDigest({
        userId: member.user.id,
        email: member.user.email,
        name: member.user.name ?? member.user.email,
        digest: {
          totalIssues,
          doneThisWeek,
          inProgress,
          overdue,
          sprintName: activeSprint?.name,
          sprintDaysLeft,
        },
      });
      queued++;
    }

    return { queued };
  }
}
