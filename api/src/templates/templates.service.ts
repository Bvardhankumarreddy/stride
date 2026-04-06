import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  private async requireAdmin(userId: string, organizationId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new ForbiddenException('Only owners and admins can manage templates');
    }
  }

  list(organizationId: string) {
    return this.prisma.issueTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: { createdBy: { select: { id: true, name: true, initials: true } } },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateTemplateDto) {
    await this.requireAdmin(userId, organizationId);
    return this.prisma.issueTemplate.create({
      data: { ...dto, organizationId, createdById: userId },
    });
  }

  async update(id: string, organizationId: string, userId: string, dto: Partial<CreateTemplateDto>) {
    await this.requireAdmin(userId, organizationId);
    const tmpl = await this.prisma.issueTemplate.findFirst({ where: { id, organizationId } });
    if (!tmpl) throw new NotFoundException('Template not found');
    return this.prisma.issueTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string, userId: string) {
    await this.requireAdmin(userId, organizationId);
    const tmpl = await this.prisma.issueTemplate.findFirst({ where: { id, organizationId } });
    if (!tmpl) throw new NotFoundException('Template not found');
    await this.prisma.issueTemplate.delete({ where: { id } });
  }
}
