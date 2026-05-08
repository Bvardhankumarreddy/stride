import { Module, forwardRef } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { IssuesModule } from '../issues/issues.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, EmailModule, UsersModule, forwardRef(() => IssuesModule)],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
