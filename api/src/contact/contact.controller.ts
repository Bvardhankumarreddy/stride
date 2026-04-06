import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

@Controller('contact')
export class ContactController {
  private contactEmail: string;

  constructor(
    private email: EmailService,
    config: ConfigService,
  ) {
    this.contactEmail = config.get<string>('CONTACT_EMAIL') ?? 'hello@stride.app';
  }

  @Post()
  async submit(@Body() body: { name: string; email: string; company?: string; message: string }) {
    const { name, email, company, message } = body;
    if (!name || !email || !message) throw new BadRequestException('Missing required fields');

    await this.email.send('stride_contact', {
      name,
      email: this.contactEmail,   // recipient — the Stride team inbox
      submitterEmail: email,
      company,
      message,
    });

    return { ok: true };
  }
}
