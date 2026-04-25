import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { IssuesService } from '../issues/issues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:issueId/attachments')
export class AttachmentsController {
  constructor(private attachments: AttachmentsService, private issues: IssuesService) {}

  // Resolve cuid OR slug → real cuid using existing issue scoping
  private async resolveIssueId(idOrSlug: string, organizationId: string, userId: string): Promise<string> {
    const issue = await this.issues.findOne(idOrSlug, organizationId, userId);
    return issue.id;
  }

  @Get()
  async list(@Param('issueId') issueId: string, @Req() req: any) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.attachments.list(id);
  }

  @Post()
  async create(
    @Param('issueId') issueId: string,
    @Body() body: { type: 'link' | 'image' | 'file'; url: string; name: string; mimeType?: string; size?: number },
    @Req() req: any,
  ) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.attachments.create(id, body, req.user.sub);
  }

  @Post('presign')
  async presign(
    @Param('issueId') issueId: string,
    @Body() body: { filename: string; contentType: string; size?: number },
    @Req() req: any,
  ) {
    const id = await this.resolveIssueId(issueId, req.user.organizationId, req.user.sub);
    return this.attachments.presignUpload({
      filename: body.filename,
      contentType: body.contentType,
      size: body.size,
      organizationId: req.user.organizationId ?? undefined,
      issueId: id,
    });
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('attachmentId') attachmentId: string) {
    await this.attachments.remove(attachmentId);
  }
}
