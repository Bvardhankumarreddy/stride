import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { JobsService } from './jobs.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
    private ai: AiService,
    private users: UsersService,
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
        include: {
          issues: {
            select: { id: true, title: true, status: true, priority: true, assignee: { select: { name: true } } },
          },
        },
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

      // Generate AI health analysis if there's an active sprint with issues
      let aiDigest: Awaited<ReturnType<AiService['generateDigest']>> = null;
      if (activeSprint?.issues?.length) {
        aiDigest = await this.ai.generateDigest({
          sprintName: activeSprint.name,
          startDate: activeSprint.startDate?.toISOString().split('T')[0] ?? '',
          endDate: activeSprint.endDate?.toISOString().split('T')[0] ?? '',
          teamSize: members.length,
          issues: activeSprint.issues.map((i: any) => ({
            id: i.id,
            title: i.title,
            status: i.status,
            priority: i.priority,
            assignee: i.assignee?.name,
          })),
        });
      }

      for (const member of members) {
        // Respect the user's notification preference for daily digest
        const wantsEmail = await this.users.shouldNotify(member.user.id, 'daily_digest', 'email');
        if (!wantsEmail) continue;

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
            ...(aiDigest && {
              health: aiDigest.health,
              healthReason: aiDigest.healthReason,
              summary: aiDigest.summary,
              blockers: aiDigest.blockers,
              highlights: aiDigest.highlights,
              recommendations: aiDigest.recommendations,
            }),
          },
        });
        totalQueued++;
      }
    }

    this.logger.log(`Daily digest: queued ${totalQueued} emails`);
  }
}
