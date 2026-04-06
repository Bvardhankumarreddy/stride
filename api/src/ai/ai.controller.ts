import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('acceptance-criteria')
  acceptanceCriteria(@Body() body: { title: string; description?: string; priority?: string; labels?: string[] }) {
    return this.ai.generateAcceptanceCriteria(body).then(criteria => ({ criteria: criteria ?? [] }));
  }

  @Post('similar-issues')
  similarIssues(@Body() body: {
    target: { id: string; title: string; description?: string };
    candidates: Array<{ id: string; title: string; description?: string }>;
  }) {
    return this.ai.findSimilarIssues(body).then(similar => ({ similar: similar ?? [] }));
  }

  @Post('summarize-comments')
  summarizeComments(@Body() body: { issueTitle: string; comments: Array<{ author: string; body: string; createdAt?: string }> }) {
    return this.ai.summarizeComments(body);
  }
}
