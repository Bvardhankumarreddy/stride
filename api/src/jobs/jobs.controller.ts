import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { WebhookPayload } from './webhook.processor';

class GithubWebhookDto {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    merged: boolean;
    user: { login: string };
    body: string;
  };
  repository: { full_name: string };
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Post('github')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive GitHub pull_request webhook events' })
  async githubWebhook(@Body() body: GithubWebhookDto) {
    const validActions = ['opened', 'closed', 'merged'];
    if (!validActions.includes(body.action)) return { queued: false };

    // Extract Stride issue ID from PR body if present (e.g. "Closes STR-123")
    const match = body.pull_request?.body?.match(/(?:closes|fixes|resolves)\s+(STR-\d+)/i);
    const issueId = match?.[1];

    const event =
      body.action === 'closed' && body.pull_request.merged
        ? 'pull_request.merged'
        : body.action === 'closed'
          ? 'pull_request.closed'
          : 'pull_request.opened';

    const payload: WebhookPayload = {
      source: 'github',
      event,
      issueId,
      prNumber: body.pull_request.number,
      prTitle: body.pull_request.title,
      prUrl: body.pull_request.html_url,
      repoName: body.repository.full_name,
      author: body.pull_request.user.login,
      merged: body.pull_request.merged,
    };

    const job = await this.jobs.enqueueWebhook(payload);
    return { queued: true, jobId: job.id };
  }
}
