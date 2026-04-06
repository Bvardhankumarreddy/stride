import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private lambdaUrl: string | null;
  private apiKey: string | null;
  private transporter: nodemailer.Transporter | null = null;
  private smtpFrom: string;

  constructor(
    private http: HttpService,
    config: ConfigService,
  ) {
    this.lambdaUrl = config.get<string>('EMAIL_LAMBDA_URL') ?? null;
    this.apiKey    = config.get<string>('EMAIL_LAMBDA_API_KEY') ?? null;

    const smtpHost = config.get<string>('SMTP_HOST');
    const smtpPort = parseInt(config.get<string>('SMTP_PORT') ?? '587', 10);
    const smtpUser = config.get<string>('SMTP_USER');
    const smtpPass = config.get<string>('SMTP_PASS');
    this.smtpFrom  = config.get<string>('SMTP_FROM') ?? smtpUser ?? 'noreply@stride.app';

    if (this.lambdaUrl) {
      this.logger.log('Email: using Lambda');
    } else if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log(`Email: using SMTP (${smtpHost}:${smtpPort})`);
    } else {
      this.logger.warn('No email transport configured (set EMAIL_LAMBDA_URL or SMTP_HOST/USER/PASS) — emails will log only');
    }
  }

  async send(type: string, payload: Record<string, unknown>): Promise<void> {
    // ── Lambda path ───────────────────────────────────────────────────────────
    if (this.lambdaUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['x-api-key'] = this.apiKey;
      try {
        const { data } = await firstValueFrom(
          this.http.post(this.lambdaUrl, { type, ...payload }, { headers }),
        );
        if (!data?.success) throw new Error(data?.error ?? 'Lambda returned failure');
        this.logger.log(`Email sent via Lambda (type=${type})`);
      } catch (err) {
        this.logger.error(`Lambda email failed (type=${type}): ${err.message}`);
      }
      return;
    }

    // ── SMTP path ─────────────────────────────────────────────────────────────
    if (this.transporter) {
      try {
        const { subject, html, text } = this.buildMessage(type, payload);
        await this.transporter.sendMail({
          from: `"Stride" <${this.smtpFrom}>`,
          to: payload.email as string,
          subject,
          html,
          text,
        });
        this.logger.log(`Email sent via SMTP (type=${type} to=${payload.email})`);
      } catch (err) {
        this.logger.error(`SMTP email failed (type=${type}): ${err.message}`);
      }
      return;
    }

    // ── Log-only fallback ─────────────────────────────────────────────────────
    this.logger.log(`[EMAIL] type=${type} | ${JSON.stringify(payload)}`);
  }

  private buildMessage(type: string, payload: Record<string, unknown>): { subject: string; html: string; text: string } {
    const name = (payload.name as string) ?? 'there';

    if (type === 'stride_password_reset') {
      const resetUrl = payload.resetUrl as string;
      return {
        subject: 'Reset your Stride password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Reset your password</h2>
            <p style="color:#424754;margin-bottom:24px">Hi ${name}, we received a request to reset your Stride password. Click the button below to choose a new one. This link expires in <strong>15 minutes</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#0058be;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Reset password</a>
            <p style="margin-top:24px;font-size:12px;color:#727785">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
            <hr style="border:none;border-top:1px solid #e1e2e4;margin:32px 0">
            <p style="font-size:11px;color:#9aa0af">Or copy this link: ${resetUrl}</p>
          </div>`,
        text: `Reset your Stride password\n\nHi ${name},\n\nClick the link below to reset your password (expires in 15 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      };
    }

    if (type === 'stride_verify_email') {
      const verifyUrl = payload.verifyUrl as string;
      return {
        subject: 'Verify your Stride email',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Verify your email</h2>
            <p style="color:#424754;margin-bottom:24px">Hi ${name}, click below to verify your email address.</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#0058be;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Verify email</a>
          </div>`,
        text: `Verify your email\n\nHi ${name},\n\nVerify your email: ${verifyUrl}`,
      };
    }

    if (type === 'stride_due_date') {
      const issueTitle = payload.issueTitle as string;
      const isOverdue  = payload.isOverdue as boolean;
      const dueDate    = payload.dueDate as string;
      const label      = isOverdue ? 'Overdue' : 'Due today';
      return {
        subject: `${label}: "${issueTitle}"`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:800;margin-bottom:8px;color:${isOverdue ? '#dc2626' : '#d97706'}">${label}</h2>
            <p style="color:#424754;margin-bottom:8px">Hi ${name},</p>
            <p style="color:#424754;margin-bottom:24px">The following issue is ${isOverdue ? 'overdue' : 'due today'} (${dueDate}):</p>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${isOverdue ? '#dc2626' : '#d97706'};margin-bottom:24px">
              <strong>${issueTitle}</strong>
            </div>
            <p style="font-size:12px;color:#9aa0af">You are receiving this because you are assigned to this issue in Stride.</p>
          </div>`,
        text: `${label}: "${issueTitle}" (due ${dueDate})\n\nHi ${name},\n\nThis issue is ${isOverdue ? 'overdue' : 'due today'}. Please update its status in Stride.`,
      };
    }

    if (type === 'stride_contact') {
      const submitterEmail = payload.submitterEmail as string;
      return {
        subject: `New contact form submission from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">New contact form submission</h2>
            <p style="color:#727785;font-size:13px;margin-bottom:24px">Someone reached out via the Stride website.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#424754;width:120px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#424754"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${submitterEmail}" style="color:#0058be">${submitterEmail}</a></td></tr>
              ${payload.company ? `<tr><td style="padding:8px 0;color:#424754"><strong>Company</strong></td><td style="padding:8px 0">${payload.company}</td></tr>` : ''}
            </table>
            <hr style="border:none;border-top:1px solid #e1e2e4;margin:20px 0">
            <p style="font-size:13px;color:#424754;white-space:pre-wrap">${payload.message}</p>
            <hr style="border:none;border-top:1px solid #e1e2e4;margin:20px 0">
            <a href="mailto:${submitterEmail}" style="display:inline-block;background:#0058be;color:#fff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">Reply to ${name}</a>
          </div>`,
        text: `New contact form submission\n\nName: ${name}\nEmail: ${submitterEmail}${payload.company ? `\nCompany: ${payload.company}` : ''}\n\n${payload.message}`,
      };
    }

    // Generic fallback
    return {
      subject: `Stride notification`,
      html: `<pre>${JSON.stringify(payload, null, 2)}</pre>`,
      text: JSON.stringify(payload),
    };
  }
}
