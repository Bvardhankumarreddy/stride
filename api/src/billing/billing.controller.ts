import {
  Controller, Post, Get, Body, Req, Res, UseGuards, HttpCode, HttpStatus, Headers, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { Request, Response } from 'express';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService, private config: ConfigService) {}

  /** Create a Stripe Checkout session → returns { url } */
  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @Req() req: any,
    @Body() body: { plan: 'pro' | 'business' },
  ) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3001');
    return this.billing.createCheckoutSession(req.user.organizationId, body.plan, appUrl);
  }

  /** Create a Stripe Customer Portal session → redirects */
  @Get('portal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createPortal(@Req() req: any, @Res() res: Response) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3001');
    const { url } = await this.billing.createPortalSession(req.user.organizationId, appUrl);
    return res.redirect(url);
  }

  /** Stripe webhook — no JWT, raw body required */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billing.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
