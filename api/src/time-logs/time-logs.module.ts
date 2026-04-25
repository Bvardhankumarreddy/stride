import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeLogsController } from './time-logs.controller';
import { TimeLogsService } from './time-logs.service';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({ secret: config.get('JWT_SECRET') }),
      inject: [ConfigService],
    }),
    forwardRef(() => IssuesModule),
  ],
  controllers: [TimeLogsController],
  providers: [TimeLogsService],
})
export class TimeLogsModule {}
