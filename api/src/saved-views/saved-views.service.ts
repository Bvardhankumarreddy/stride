import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedViewsService {
  constructor(private prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.savedView.findMany({
      where: { organizationId },
      include: { createdBy: { select: { id: true, name: true, initials: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(organizationId: string, createdById: string, data: { name: string; filters: Record<string, unknown> }) {
    return this.prisma.savedView.create({
      data: { name: data.name, filters: data.filters as any, organizationId, createdById },
      include: { createdBy: { select: { id: true, name: true, initials: true } } },
    });
  }

  async remove(id: string, organizationId: string, userId: string) {
    const view = await this.prisma.savedView.findFirst({ where: { id, organizationId } });
    if (!view) throw new NotFoundException('View not found');
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (view.createdById !== userId && !['owner', 'admin'].includes(member?.role ?? '')) {
      throw new ForbiddenException('Cannot delete this view');
    }
    await this.prisma.savedView.delete({ where: { id } });
  }
}
