import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [SearchModule, NotificationsModule, EmailModule],
  providers: [IssuesService],
  controllers: [IssuesController],
})
export class IssuesModule {}
