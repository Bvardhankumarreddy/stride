import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProjectDto, organizationId?: string) {
    return this.prisma.project.create({ data: { ...dto, organizationId } as any });
  }

  findAll(organizationId?: string, teamId?: string) {
    const where: any = organizationId ? { organizationId } : {};
    if (teamId) where.teamId = teamId;
    return this.prisma.project.findMany({
      where,
      include: { _count: { select: { issues: true, sprints: true, documents: true } }, team: { select: { id: true, name: true, identifier: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { issues: true, sprints: true, documents: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
  }
}
