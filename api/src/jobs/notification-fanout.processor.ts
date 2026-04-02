import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NOTIFICATION_FANOUT } from './jobs.constants';

export interface NotificationFanoutPayload {
  type: string;
  title: string;
  body: string;
  issueId?: string;
  /** List of user IDs to notify. If empty, notifies all project members. */
  userIds: string[];
}

@Processor(QUEUE_NOTIFICATION_FANOUT)
export class NotificationFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanoutProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<NotificationFanoutPayload>): Promise<void> {
    const { type, title, body, issueId, userIds } = job.data;
    this.logger.log(`Fanning out "${type}" notification to ${userIds.length} users`);

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ type, title, body, issueId, userId })),
      skipDuplicates: true,
    });

    this.logger.log(`Notification fanout complete — ${userIds.length} records created`);
  }
}
