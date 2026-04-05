import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL_DIGEST) private emailQueue: Queue,
    @InjectQueue(QUEUE_AI_SUMMARY) private aiQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION_FANOUT) private fanoutQueue: Queue,
    @InjectQueue(QUEUE_WEBHOOK) private webhookQueue: Queue,
  ) {}

  /** Enqueue a morning digest email for one user */
  async scheduleEmailDigest(payload: EmailDigestPayload, delayMs = 0) {
    try {
      return await this.emailQueue.add('send-digest', payload, {
        delay: delayMs, attempts: 3, backoff: { type: 'exponential', delay: 5000 },
      });
    } catch (err) { this.logger.warn(`Email digest queue unavailable: ${err.message}`); }
  }

  /** Triggered when a sprint is closed — calls AI service for release notes */
  async triggerAiSummary(payload: AiSummaryPayload) {
    try {
      return await this.aiQueue.add('sprint-summary', payload, {
        attempts: 2, backoff: { type: 'fixed', delay: 10000 },
      });
    } catch (err) { this.logger.warn(`AI summary queue unavailable: ${err.message}`); }
  }

  /** Fan out a notification to multiple users */
  async fanoutNotification(payload: NotificationFanoutPayload) {
    try {
      return await this.fanoutQueue.add('fanout', payload, {
        attempts: 3, backoff: { type: 'exponential', delay: 2000 },
      });
    } catch (err) { this.logger.warn(`Notification fanout queue unavailable: ${err.message}`); }
  }

  /** Enqueue an inbound GitHub webhook event */
  async enqueueWebhook(payload: WebhookPayload) {
    try {
      return await this.webhookQueue.add('github-event', payload, {
        attempts: 3, backoff: { type: 'exponential', delay: 3000 },
      });
    } catch (err) { this.logger.warn(`Webhook queue unavailable: ${err.message}`); }
  }
}
