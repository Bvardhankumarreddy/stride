import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(data: { action: string; userId?: string; targetId?: string; metadata?: Record<string, any>; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data: { ...data, metadata: data.metadata ?? {} } }).catch(() => {});
  }
}
