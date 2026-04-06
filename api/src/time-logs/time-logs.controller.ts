import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeLogsService } from './time-logs.service';

@ApiTags('time-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:issueId/time')
export class TimeLogsController {
  constructor(private readonly service: TimeLogsService) {}

  @Get()
  list(@Param('issueId') issueId: string) {
    return this.service.list(issueId);
  }

  @Post()
  create(
    @Param('issueId') issueId: string,
    @Body() body: { minutes: number; note?: string; loggedAt?: string },
    @Req() req: any,
  ) {
    return this.service.create(issueId, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
