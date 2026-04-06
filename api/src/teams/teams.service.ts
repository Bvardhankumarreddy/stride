import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateTeamDto) {
    const exists = await this.prisma.team.findUnique({
      where: { organizationId_identifier: { organizationId, identifier: dto.identifier } },
    });
    if (exists) throw new ConflictException('Team identifier already in use');
    return this.prisma.team.create({
      data: { ...dto, organizationId },
      include: { members: { include: { user: { select: { id: true, name: true, initials: true, image: true } } } }, _count: { select: { projects: true, members: true } } },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.team.findMany({
      where: { organizationId },
      include: {
        members: { include: { user: { select: { id: true, name: true, initials: true, image: true, email: true } } } },
        _count: { select: { projects: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId },
      include: {
        members: { include: { user: { select: { id: true, name: true, initials: true, image: true, email: true } } } },
        projects: { select: { id: true, name: true, _count: { select: { issues: true, sprints: true } } } },
        _count: { select: { projects: true, members: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, organizationId: string, dto: Partial<CreateTeamDto>) {
    await this.findOne(id, organizationId);
    return this.prisma.team.update({
      where: { id },
      data: dto,
      include: { _count: { select: { projects: true, members: true } } },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, organizationId: string, userId: string, role = 'member') {
    await this.findOne(teamId, organizationId);
    const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (existing) throw new ConflictException('User is already a team member');
    return this.prisma.teamMember.create({
      data: { teamId, userId, role },
      include: { user: { select: { id: true, name: true, initials: true, image: true, email: true } } },
    });
  }

  async updateMemberRole(teamId: string, organizationId: string, userId: string, role: string) {
    await this.findOne(teamId, organizationId);
    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, initials: true, image: true } } },
    });
  }

  async removeMember(teamId: string, organizationId: string, userId: string) {
    await this.findOne(teamId, organizationId);
    await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  }
}
