import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_EMAIL_DIGEST,
  QUEUE_AI_SUMMARY,
  QUEUE_NOTIFICATION_FANOUT,
  QUEUE_WEBHOOK,
} from './jobs.constants';
import { EmailDigestPayload } from './email-digest.processor';
import { AiSummaryPayload } from './ai-summary.processor';
import { NotificationFanoutPayload } from './notification-fanout.processor';
import { WebhookPayload } from './webhook.processor';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(QUEUE_EMAIL_DIGEST) private emailQueue: Queue,
    @InjectQueue(QUEUE_AI_SUMMARY) private aiQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION_FANOUT) private fanoutQueue: Queue,
    @InjectQueue(QUEUE_WEBHOOK) private webhookQueue: Queue,
  ) {}

  /** Schedule morning digest for a single user (or use cron to enqueue all) */
  async scheduleEmailDigest(payload: EmailDigestPayload, delayMs = 0) {
    return this.emailQueue.add('send-digest', payload, {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /** Triggered when a sprint is closed — calls AI service for release notes */
  async triggerAiSummary(payload: AiSummaryPayload) {
    return this.aiQueue.add('sprint-summary', payload, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
    });
  }

  /** Fan out a notification to multiple users */
  async fanoutNotification(payload: NotificationFanoutPayload) {
    return this.fanoutQueue.add('fanout', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  /** Enqueue an inbound GitHub webhook event */
  async enqueueWebhook(payload: WebhookPayload) {
    return this.webhookQueue.add('github-event', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }
}
