import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [HttpModule, forwardRef(() => IssuesModule)],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
