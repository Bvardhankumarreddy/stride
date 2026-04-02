import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL_DIGEST } from './jobs.constants';

export interface EmailDigestPayload {
  userId: string;
  email: string;
  name: string;
  sprintId?: string;
}

@Processor(QUEUE_EMAIL_DIGEST)
export class EmailDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailDigestProcessor.name);

  async process(job: Job<EmailDigestPayload>): Promise<void> {
    const { userId, email, name } = job.data;
    this.logger.log(`Sending morning digest to ${email} (user ${userId})`);

    // TODO: integrate with an email provider (Resend / SendGrid)
    // For now we log the digest that would be sent
    this.logger.log(`[EMAIL] Morning digest for ${name} — job ${job.id} complete`);
  }
}
