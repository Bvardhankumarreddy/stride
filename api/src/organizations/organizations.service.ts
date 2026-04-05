import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async create(dto: CreateOrgDto, userId: string) {
    const exists = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already taken');

    const org = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: dto.name, slug: dto.slug } });
      await tx.organizationMember.create({ data: { userId, organizationId: org.id, role: 'owner' } });
      await tx.user.update({ where: { id: userId }, data: { organizationId: org.id } });
      await tx.project.create({ data: { name: dto.name, organizationId: org.id } });
      return org;
    });

    return org;
  }

  async listMemberships(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async switchWorkspace(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this workspace');
    await this.prisma.user.update({ where: { id: userId }, data: { organizationId: orgId } });
    const token = this.jwt.sign({
      sub: userId,
      email: user!.email,
      role: user!.role,
      organizationId: orgId,
      mustChangePassword: user!.mustChangePassword,
    });
    return { accessToken: token, organizationId: orgId };
  }

  async findMine(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user?.organization) throw new NotFoundException('No organization found');
    return user.organization;
  }

  async findMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, initials: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberRole(orgId: string, targetUserId: string, dto: UpdateMemberRoleDto, requesterId: string) {
    const requester = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: requesterId, organizationId: orgId } },
    });
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, name: true, email: true, initials: true } } },
    });
  }

  async update(orgId: string, data: { name?: string; aiSettings?: Record<string, boolean> }, requesterId: string) {
    const requester = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: requesterId, organizationId: orgId } },
    });
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.prisma.organization.update({ where: { id: orgId }, data });
  }

  async delete(orgId: string, requesterId: string) {
    const requester = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: requesterId, organizationId: orgId } },
    });
    if (!requester || requester.role !== 'owner') {
      throw new ForbiddenException('Only the owner can delete the workspace');
    }
    await this.prisma.$transaction(async (tx) => {
      // Clear org association from users before deleting
      await tx.user.updateMany({ where: { organizationId: orgId }, data: { organizationId: null } });
      await tx.organization.delete({ where: { id: orgId } });
    });
  }

  async removeMember(orgId: string, targetUserId: string, requesterId: string) {
    const requester = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: requesterId, organizationId: orgId } },
    });
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    // Can't remove yourself if owner
    if (targetUserId === requesterId && requester.role === 'owner') {
      throw new ForbiddenException('Owner cannot remove themselves');
    }
    await this.prisma.organizationMember.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
  }
}
