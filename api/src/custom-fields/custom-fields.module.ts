import { Module, forwardRef } from '@nestjs/common';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [PrismaModule, forwardRef(() => IssuesModule)],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
