import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeLib = require('stripe');

@Injectable()
export class BillingService {
  private stripe: any;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.stripe = new StripeLib(this.config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'), {
      apiVersion: '2025-04-30.basil',
    });
  }

  async createCheckoutSession(orgId: string, plan: 'pro' | 'business', appUrl: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('Organization not found');

    const priceId = plan === 'pro'
      ? this.config.get('STRIPE_PRO_PRICE_ID', '')
      : this.config.get('STRIPE_BUSINESS_PRICE_ID', '');

    if (!priceId) throw new BadRequestException(`No price configured for plan: ${plan}`);

    const settings = (org.aiSettings ?? {}) as Record<string, unknown>;
    let customerId = settings.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await this.stripe.customers.create({ metadata: { orgId } });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { aiSettings: { ...settings, stripeCustomerId: customer.id } },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing_success=1&tab=billing`,
      cancel_url: `${appUrl}/settings?tab=billing`,
      metadata: { orgId },
    });

    return { url: session.url as string };
  }

  async createPortalSession(orgId: string, appUrl: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('Organization not found');

    const settings = (org.aiSettings ?? {}) as Record<string, unknown>;
    const customerId = settings.stripeCustomerId as string | undefined;
    if (!customerId) throw new BadRequestException('No billing account found — subscribe first');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return { url: session.url as string };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', '');
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId: string = session.metadata?.orgId;
        if (orgId && session.subscription) {
          const sub = await this.stripe.subscriptions.retrieve(session.subscription);
          const plan = this.resolvePlan(sub);
          await this.prisma.organization.update({ where: { id: orgId }, data: { plan } });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const org = await this.findOrgByCustomer(sub.customer);
        if (org) {
          const plan = sub.status === 'active' ? this.resolvePlan(sub) : 'free';
          await this.prisma.organization.update({ where: { id: org.id }, data: { plan } });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const org = await this.findOrgByCustomer(sub.customer);
        if (org) {
          await this.prisma.organization.update({ where: { id: org.id }, data: { plan: 'free' } });
        }
        break;
      }
    }
  }

  private async findOrgByCustomer(customerId: string) {
    return this.prisma.organization.findFirst({
      where: { aiSettings: { path: ['stripeCustomerId'], equals: customerId } },
    });
  }

  private resolvePlan(sub: any): string {
    const priceId: string = sub.items?.data?.[0]?.price?.id ?? '';
    if (priceId === this.config.get('STRIPE_PRO_PRICE_ID')) return 'pro';
    if (priceId === this.config.get('STRIPE_BUSINESS_PRICE_ID')) return 'business';
    return 'pro';
  }
}
