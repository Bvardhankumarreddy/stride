import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

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
