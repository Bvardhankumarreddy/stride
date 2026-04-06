import { IsString, IsUrl, IsOptional, IsArray, IsBoolean } from 'class-validator';

export const WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'sprint.started',
  'sprint.completed',
  'comment.created',
  'member.joined',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export class CreateWebhookDto {
  @IsString()
  name: string;

  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsArray()
  events: WebhookEvent[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
