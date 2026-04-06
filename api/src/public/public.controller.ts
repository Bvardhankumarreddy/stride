import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  /** Public roadmap — no auth required. Returns sprint progress data. */
  @Get('roadmap')
  async roadmap(@Query('org') orgSlug?: string) {
    // Find org by slug if provided, otherwise return the first org's data
    const org = orgSlug
      ? await this.prisma.organization.findFirst({ where: { slug: orgSlug } })
      : await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!org) return { org: null, projects: [] };

    const projects = await this.prisma.project.findMany({
      where: { organizationId: org.id },
      include: {
        sprints: {
          include: {
            _count: { select: { issues: true } },
            issues: { select: { status: true, estimate: true } },
          },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      org: { name: org.name, slug: org.slug },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        sprints: p.sprints.map((s) => {
          const total = s.issues.length;
          const done = s.issues.filter((i) => i.status === 'done').length;
          const inProgress = s.issues.filter((i) => i.status === 'in-progress').length;
          const totalPts = s.issues.reduce((acc, i) => acc + (i.estimate ?? 0), 0);
          const donePts = s.issues.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.estimate ?? 0), 0);
          return {
            id: s.id,
            name: s.name,
            goal: s.goal,
            status: s.status,
            startDate: s.startDate,
            endDate: s.endDate,
            total,
            done,
            inProgress,
            totalPts,
            donePts,
          };
        }),
      })),
    };
  }
}
