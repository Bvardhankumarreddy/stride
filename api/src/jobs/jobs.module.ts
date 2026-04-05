import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import {
  QUEUE_EMAIL_DIGEST,
  QUEUE_AI_SUMMARY,
  QUEUE_NOTIFICATION_FANOUT,
  QUEUE_WEBHOOK,
} from './jobs.constants';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { EmailDigestProcessor } from './email-digest.processor';
import { AiSummaryProcessor } from './ai-summary.processor';
import { NotificationFanoutProcessor } from './notification-fanout.processor';
import { WebhookProcessor } from './webhook.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL_DIGEST },
      { name: QUEUE_AI_SUMMARY },
      { name: QUEUE_NOTIFICATION_FANOUT },
      { name: QUEUE_WEBHOOK },
    ),
    ConfigModule,
    HttpModule,
    PrismaModule,
    EmailModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    EmailDigestProcessor,
    AiSummaryProcessor,
    NotificationFanoutProcessor,
    WebhookProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
