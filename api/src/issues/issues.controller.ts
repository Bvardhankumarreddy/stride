import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
  @Get(':id') findOne(@Param('id') id: string) { return this.issues.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateIssueDto) { return this.issues.update(id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.issues.remove(id); }
}
