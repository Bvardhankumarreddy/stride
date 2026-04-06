import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto, WebhookEvent } from './dto/create-webhook.dto';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  create(organizationId: string, dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        name: dto.name,
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
        active: dto.active ?? true,
        organizationId,
      },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.webhook.findMany({
      where: { organizationId },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const wh = await this.prisma.webhook.findFirst({
      where: { id, organizationId },
      include: {
        deliveries: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { deliveries: true } },
      },
    });
    if (!wh) throw new NotFoundException('Webhook not found');
    return wh;
  }

  async update(id: string, organizationId: string, dto: Partial<CreateWebhookDto>) {
    await this.findOne(id, organizationId);
    return this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.events && { events: dto.events }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.webhook.delete({ where: { id } });
  }

  // Called by other services to fire events
  async dispatch(organizationId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { organizationId, active: true },
    });

    for (const wh of webhooks) {
      const events = wh.events as string[];
      if (!events.includes(event)) continue;
      await this.deliver(wh, event, payload);
    }
  }

  private async deliver(wh: { id: string; url: string; secret: string | null }, event: string, payload: Record<string, unknown>) {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (wh.secret) {
      const sig = crypto.createHmac('sha256', wh.secret).update(body).digest('hex');
      headers['X-Stride-Signature'] = `sha256=${sig}`;
    }

    let statusCode: number | null = null;
    let success = false;
    let response: string | null = null;

    try {
      const res = await axios.post(wh.url, body, { headers, timeout: 10_000 });
      statusCode = res.status;
      success = res.status >= 200 && res.status < 300;
      response = String(res.data ?? '').slice(0, 500);
    } catch (err: any) {
      statusCode = err.response?.status ?? null;
      response = (err.message ?? 'Request failed').slice(0, 500);
    }

    await this.prisma.webhookDelivery.create({
      data: { webhookId: wh.id, event, payload, statusCode, success, response },
    });
  }

  async test(id: string, organizationId: string) {
    const wh = await this.findOne(id, organizationId);
    await this.deliver(wh, 'test', { message: 'This is a test webhook from Stride' });
    return { message: 'Test delivery sent' };
  }
}
