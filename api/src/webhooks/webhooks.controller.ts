import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.webhooks.create(req.user.organizationId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.webhooks.findAll(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateWebhookDto>) {
    return this.webhooks.update(id, req.user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.remove(id, req.user.organizationId);
  }

  @Post(':id/test')
  test(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.test(id, req.user.organizationId);
  }
}
