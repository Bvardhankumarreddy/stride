import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

const ATTACHMENT_INCLUDE = {
  createdBy: { select: { id: true, name: true, initials: true, image: true } },
};

interface CreateAttachmentDto {
  type: 'link' | 'image' | 'file';
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly lambdaUrl: string | null;
  private readonly apiKey: string | null;

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    config: ConfigService,
  ) {
    this.lambdaUrl = config.get<string>('EMAIL_LAMBDA_URL') ?? null;
    this.apiKey    = config.get<string>('EMAIL_LAMBDA_API_KEY') ?? null;
  }

  async presignUpload(input: { filename: string; contentType: string; size?: number; organizationId?: string; issueId?: string }): Promise<PresignResponse> {
    if (!this.lambdaUrl) {
      throw new InternalServerErrorException('Upload service not configured');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    try {
      const { data } = await firstValueFrom(
        this.http.post(this.lambdaUrl, { type: 'stride_upload_url', ...input }, { headers }),
      );
      if (!data?.uploadUrl || !data?.fileUrl) throw new Error(data?.error ?? 'Invalid response from upload service');
      return data;
    } catch (err: any) {
      this.logger.error(`Presign failed: ${err.message}`);
      throw new InternalServerErrorException(err.response?.data?.error ?? err.message ?? 'Failed to get upload URL');
    }
  }

  async create(issueId: string, dto: CreateAttachmentDto, userId: string) {
    if (!['link', 'image', 'file'].includes(dto.type)) {
      throw new BadRequestException('Invalid attachment type');
    }
    if (!dto.url?.trim() || !dto.name?.trim()) {
      throw new BadRequestException('url and name are required');
    }

    const issue = await this.prisma.issue.findUnique({ where: { id: issueId }, select: { id: true } });
    if (!issue) throw new NotFoundException('Issue not found');

    return this.prisma.attachment.create({
      data: {
        issueId,
        type: dto.type,
        url: dto.url.trim(),
        name: dto.name.trim(),
        mimeType: dto.mimeType,
        size: dto.size,
        createdById: userId,
      },
      include: ATTACHMENT_INCLUDE,
    });
  }

  list(issueId: string) {
    return this.prisma.attachment.findMany({
      where: { issueId },
      include: ATTACHMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(attachmentId: string) {
    const existing = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!existing) throw new NotFoundException('Attachment not found');
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
