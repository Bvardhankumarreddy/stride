import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class DueDateScheduler {
  private readonly logger = new Logger(DueDateScheduler.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /** Runs daily at 8 AM — creates in-app notifications and sends emails for overdue + due-today issues */
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
      select: {
        id: true, title: true, dueDate: true, assigneeId: true,
        assignee: { select: { email: true, name: true } },
      },
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

    // Send emails
    for (const issue of issues) {
      if (!issue.assignee?.email) continue;
      const isOverdue = issue.dueDate! < now;
      await this.email.send('stride_due_date', {
        email: issue.assignee.email,
        name: issue.assignee.name ?? issue.assignee.email,
        issueTitle: issue.title,
        issueId: issue.id,
        isOverdue,
        dueDate: issue.dueDate!.toISOString().split('T')[0],
      });
    }

    this.logger.log(`Created ${notifications.length} due-date notifications and sent emails`);
  }
}
