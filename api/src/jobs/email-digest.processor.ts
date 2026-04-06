import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_EMAIL_DIGEST } from './jobs.constants';
import { EmailService } from '../email/email.service';

export interface EmailDigestPayload {
  userId: string;
  email: string;
  name: string;
  digest: {
    totalIssues: number;
    doneThisWeek: number;
    inProgress: number;
    overdue: number;
    sprintName?: string;
    sprintDaysLeft?: number;
    // AI-generated fields (optional — present when ANTHROPIC_API_KEY is set)
    health?: string;
    healthReason?: string;
    summary?: string;
    blockers?: string[];
    highlights?: string[];
    recommendations?: string[];
  };
}

@Processor(QUEUE_EMAIL_DIGEST)
export class EmailDigestProcessor extends WorkerHost {
  constructor(private emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailDigestPayload>): Promise<void> {
    const { email, name, digest } = job.data;
    await this.emailService.send('stride_digest', { email, name, digest });
  }
}
