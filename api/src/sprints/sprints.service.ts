import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
    private webhooks: WebhooksService,
  ) {}

  create(projectId: string, dto: CreateSprintDto) {
    return this.prisma.sprint.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        projectId,
      },
    });
  }

  findAll(projectId: string) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      include: { _count: { select: { issues: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(projectId: string, id: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, projectId },
      include: { issues: { include: { assignee: { select: { id: true, name: true, initials: true } } } } },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  async update(projectId: string, id: string, dto: UpdateSprintDto) {
    const existing = await this.findOne(projectId, id);
    const updated = await this.prisma.sprint.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    // Trigger AI release-notes generation when a sprint is closed
    if (dto.status === 'completed' && existing.status !== 'completed') {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const sprintWithIssues = await this.findOne(projectId, id);

      await this.jobs.triggerAiSummary({
        sprintId: id,
        sprintName: updated.name,
        projectName: project?.name ?? 'Unknown Project',
        startDate: updated.startDate?.toISOString().split('T')[0] ?? '',
        endDate: updated.endDate?.toISOString().split('T')[0] ?? '',
        issues: sprintWithIssues.issues.map((issue: any) => ({
          id: issue.id,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          labels: issue.labels ?? [],
          assignee: issue.assignee?.name,
        })),
      });
    }

    // Fire webhook on sprint status transitions
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
    if (project?.organizationId) {
      if (dto.status === 'active' && existing.status !== 'active') {
        this.webhooks.dispatch(project.organizationId, 'sprint.started', { id: updated.id, name: updated.name }).catch(() => {});
      } else if (dto.status === 'completed' && existing.status !== 'completed') {
        this.webhooks.dispatch(project.organizationId, 'sprint.completed', { id: updated.id, name: updated.name }).catch(() => {});
      }
    }

    return updated;
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);
    await this.prisma.sprint.delete({ where: { id } });
  }

  async velocity(projectId: string) {
    const completed = await this.prisma.sprint.findMany({
      where: { projectId, status: 'completed' },
      include: { issues: { select: { estimate: true, status: true } } },
      orderBy: { endDate: 'asc' },
      take: 10,
    });
    return completed.map(s => ({
      sprint: s.name,
      committed: s.issues.reduce((sum, i) => sum + (i.estimate ?? 0), 0),
      completed: s.issues.filter(i => i.status === 'done').reduce((sum, i) => sum + (i.estimate ?? 0), 0),
    }));
  }
}
