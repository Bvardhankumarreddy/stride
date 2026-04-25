import { Module, forwardRef } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [forwardRef(() => IssuesModule)],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
