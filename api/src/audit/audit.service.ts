import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(data: { action: string; userId?: string; targetId?: string; metadata?: Record<string, any>; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data: { ...data, metadata: data.metadata ?? {} } }).catch(() => {});
  }

  findAll(organizationId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { user: { memberships: { some: { organizationId } } } },
      include: { user: { select: { id: true, name: true, email: true, initials: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
