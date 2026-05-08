import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DueDateScheduler {
  private readonly logger = new Logger(DueDateScheduler.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private users: UsersService,
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

    // Per-assignee pref check — only notify those who haven't disabled it
    const inAppAllowed: typeof issues = [];
    const emailAllowed: typeof issues = [];
    await Promise.all(issues.map(async (issue) => {
      const [wantsInApp, wantsEmail] = await Promise.all([
        this.users.shouldNotify(issue.assigneeId!, 'due_date', 'inApp'),
        this.users.shouldNotify(issue.assigneeId!, 'due_date', 'email'),
      ]);
      if (wantsInApp) inAppAllowed.push(issue);
      if (wantsEmail) emailAllowed.push(issue);
    }));

    const notifications = inAppAllowed.map((issue) => {
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

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }

    for (const issue of emailAllowed) {
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

    this.logger.log(`Due-date job: ${notifications.length} in-app, ${emailAllowed.length} emails (${issues.length} matching issues)`);
  }
}
