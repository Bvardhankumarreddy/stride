import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // Generate a unique 3-letter key from a project name, scoped to an organization.
  // Strips non-letters, takes first 3 chars uppercased, falls back to "PRJ",
  // and appends a counter if collisions exist.
  private async generateKey(name: string, organizationId?: string): Promise<string> {
    const base = (name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) || 'PRJ';
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.project.findFirst({ where: { key: candidate, organizationId: organizationId ?? null } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }

  async create(dto: CreateProjectDto, organizationId?: string) {
    let key = dto.key?.trim().toUpperCase();
    if (key) {
      if (!/^[A-Z0-9]{2,10}$/.test(key)) {
        throw new BadRequestException('Key must be 2–10 uppercase letters or digits');
      }
      const exists = await this.prisma.project.findFirst({ where: { key, organizationId: organizationId ?? null } });
      if (exists) throw new BadRequestException(`Key "${key}" is already used in this workspace`);
    } else {
      key = await this.generateKey(dto.name, organizationId);
    }
    return this.prisma.project.create({ data: { ...dto, key, organizationId } as any });
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
