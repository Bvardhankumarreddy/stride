import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private prisma: PrismaService) {}

  async notify(organizationId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: 'slack' } },
    });
    if (!integration?.token) return;

    const text = this.buildText(event, payload);
    try {
      await axios.post(integration.token, { text }, { timeout: 8_000 });
      this.logger.log(`Slack notification sent (event=${event})`);
    } catch (err: any) {
      this.logger.error(`Slack notification failed (event=${event}): ${err.message}`);
    }
  }

  private buildText(event: string, payload: Record<string, unknown>): string {
    const title = payload.title as string ?? 'Untitled';
    const status = payload.status as string ?? '';
    const priority = payload.priority as string ?? '';
    const assignee = payload.assigneeName as string | undefined;

    switch (event) {
      case 'issue.created':
        return `*New issue created:* ${title}\nStatus: ${status} | Priority: ${priority}${assignee ? ` | Assignee: ${assignee}` : ''}`;
      case 'issue.updated':
        return `*Issue updated:* ${title}\nStatus: ${status} | Priority: ${priority}${assignee ? ` | Assignee: ${assignee}` : ''}`;
      case 'issue.deleted':
        return `*Issue deleted:* ${title}`;
      default:
        return `*Stride event (${event}):* ${title}`;
    }
  }
}
