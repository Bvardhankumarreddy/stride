import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { IssuesService } from '../issues/issues.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:issueId/comments')
export class CommentsController {
  constructor(private comments: CommentsService, private issues: IssuesService) {}

  // :issueId may be a cuid or a "KEY-NUM" slug — resolve via IssuesService
  // (which also enforces the user's org context).
  private async resolveIssueId(idOrSlug: string, organizationId: string, userId: string): Promise<string> {
    const issue = await this.issues.findOne(idOrSlug, organizationId, userId);
    return issue.id;
  }

  @Post()
  async create(@Param('issueId') issueId: string, @Body() dto: CreateCommentDto, @Req() req: any) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.comments.create(id, dto, req.user.sub);
  }

  @Get()
  async findAll(@Param('issueId') issueId: string, @Req() req: any) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.comments.findAll(id);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @Req() req: any) { return this.comments.update(id, dto, req.user.sub); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string, @Req() req: any) { return this.comments.remove(id, req.user.sub, req.user.role); }
}
