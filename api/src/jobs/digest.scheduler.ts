import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
  ) {}

  /** Runs daily at 9 AM — sends digest emails to all org members who have digest enabled */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyDigests() {
    this.logger.log('Running daily digest scheduler');

    const organizations = await this.prisma.organization.findMany({
      select: { id: true, aiSettings: true },
    });

    let totalQueued = 0;

    for (const org of organizations) {
      const aiSettings = (org.aiSettings ?? {}) as { digest?: boolean };
      if (aiSettings.digest === false) continue;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId: org.id },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      if (members.length === 0) continue;

      const activeSprint = await this.prisma.sprint.findFirst({
        where: { project: { organizationId: org.id }, status: 'active' },
        orderBy: { startDate: 'desc' },
      });

      const [totalIssues, doneThisWeek, inProgress, overdue] = await Promise.all([
        this.prisma.issue.count({ where: { organizationId: org.id } }),
        this.prisma.issue.count({ where: { organizationId: org.id, status: 'done', updatedAt: { gte: weekAgo } } }),
        this.prisma.issue.count({ where: { organizationId: org.id, status: 'in-progress' } }),
        this.prisma.issue.count({ where: { organizationId: org.id, dueDate: { lt: now }, status: { not: 'done' } } }),
      ]);

      const sprintDaysLeft = activeSprint?.endDate
        ? Math.max(0, Math.ceil((activeSprint.endDate.getTime() - now.getTime()) / 86_400_000))
        : undefined;

      for (const member of members) {
        await this.jobs.scheduleEmailDigest({
          userId: member.user.id,
          email: member.user.email,
          name: member.user.name ?? member.user.email,
          digest: { totalIssues, doneThisWeek, inProgress, overdue, sprintName: activeSprint?.name, sprintDaysLeft },
        });
        totalQueued++;
      }
    }

    this.logger.log(`Daily digest: queued ${totalQueued} emails`);
  }
}
