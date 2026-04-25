import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeLogsService } from './time-logs.service';
import { IssuesService } from '../issues/issues.service';

@ApiTags('time-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:issueId/time')
export class TimeLogsController {
  constructor(private readonly service: TimeLogsService, private readonly issues: IssuesService) {}

  private async resolveIssueId(idOrSlug: string, organizationId: string, userId: string): Promise<string> {
    const issue = await this.issues.findOne(idOrSlug, organizationId, userId);
    return issue.id;
  }

  @Get()
  async list(@Param('issueId') issueId: string, @Req() req: any) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.service.list(id);
  }

  @Post()
  async create(
    @Param('issueId') issueId: string,
    @Body() body: { minutes: number; note?: string; loggedAt?: string },
    @Req() req: any,
  ) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.service.create(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
