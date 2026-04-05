import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private lambdaUrl: string | null;
  private apiKey: string | null;

  constructor(
    private http: HttpService,
    config: ConfigService,
  ) {
    this.lambdaUrl = config.get<string>('EMAIL_LAMBDA_URL') ?? null;
    this.apiKey    = config.get<string>('EMAIL_LAMBDA_API_KEY') ?? null;
    if (this.lambdaUrl) {
      this.logger.log('Email Lambda configured');
    } else {
      this.logger.warn('EMAIL_LAMBDA_URL not set — emails will log only');
    }
  }

  async send(type: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.lambdaUrl) {
      this.logger.log(`[EMAIL] type=${type} | ${JSON.stringify(payload)}`);
      return;
    }

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
  }
}
