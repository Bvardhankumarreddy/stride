import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = { id: true, name: true, initials: true };

@Injectable()
export class TimeLogsService {
  constructor(private prisma: PrismaService) {}

  list(issueId: string) {
    return this.prisma.timeLog.findMany({
      where: { issueId },
      include: { user: { select: USER_SELECT } },
      orderBy: { loggedAt: 'desc' },
    });
  }

  create(issueId: string, userId: string, data: { minutes: number; note?: string; loggedAt?: string }) {
    return this.prisma.timeLog.create({
      data: {
        issueId,
        userId,
        minutes: data.minutes,
        note: data.note,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async remove(id: string, userId: string) {
    const log = await this.prisma.timeLog.findUnique({ where: { id } });
    if (log && log.userId !== userId) throw new ForbiddenException('Cannot delete another user\'s time log');
    await this.prisma.timeLog.delete({ where: { id } });
  }
}
