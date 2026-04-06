import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DueDateScheduler {
  private readonly logger = new Logger(DueDateScheduler.name);

  constructor(private prisma: PrismaService) {}

  /** Runs daily at 8 AM — creates in-app notifications for overdue + due-today issues */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDueDateReminders() {
    this.logger.log('Running due-date reminder job');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const issues = await this.prisma.issue.findMany({
      where: {
        dueDate: { lte: tomorrow },
        status: { not: 'done' },
        assigneeId: { not: null },
      },
      select: { id: true, title: true, dueDate: true, assigneeId: true },
    });

    if (issues.length === 0) return;

    const notifications = issues.map((issue) => {
      const isOverdue = issue.dueDate! < now;
      return {
        userId: issue.assigneeId!,
        type: 'due_date',
        title: isOverdue ? 'Overdue issue' : 'Due today',
        body: `"${issue.title}" is ${isOverdue ? 'overdue' : 'due today'}`,
        issueId: issue.id,
        read: false,
      };
    });

    await this.prisma.notification.createMany({ data: notifications });
    this.logger.log(`Created ${notifications.length} due-date notifications`);
  }
}
