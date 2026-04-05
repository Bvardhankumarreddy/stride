import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues')
export class IssuesController {
  constructor(private issues: IssuesService) {}

  @Post() create(@Body() dto: CreateIssueDto, @Req() req: any) { return this.issues.create(dto, req.user.sub, req.user.organizationId); }
  @Get() findAll(@Query() query: QueryIssueDto, @Req() req: any) { return this.issues.findAll(query, req.user.organizationId); }

  @Get('export')
  async exportCsv(@Req() req: any, @Res() res: any) {
    const issues = await this.issues.findAll({}, req.user.organizationId);
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Sprint', 'Created'];
    const rows = issues.data.map((i: any) => [
      i.id, `"${i.title.replace(/"/g, '""')}"`, i.status, i.priority,
      i.assignee?.name ?? '', i.sprint?.name ?? '',
      new Date(i.createdAt).toISOString().split('T')[0],
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="issues.csv"');
    res.send(csv);
  }

  @Patch('bulk')
  async bulkUpdate(@Body() body: { ids: string[]; status?: string; assigneeId?: string; priority?: string }) {
    const { ids, ...data } = body;
    if (!ids?.length) throw new BadRequestException('No issue IDs provided');
    await this.issues.bulkUpdate(ids, data);
    return { updated: ids.length };
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.issues.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateIssueDto) { return this.issues.update(id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.issues.remove(id); }

  @Get(':id/activity')
  getActivity(@Param('id') id: string) { return this.issues.getActivity(id); }
}
