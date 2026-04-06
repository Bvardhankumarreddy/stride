import { Module } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { JobsModule } from '../jobs/jobs.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [JobsModule, WebhooksModule],
  providers: [SprintsService],
  controllers: [SprintsController],
})
export class SprintsModule {}
