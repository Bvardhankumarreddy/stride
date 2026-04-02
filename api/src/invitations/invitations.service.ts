import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, invitedById: string, dto: CreateInvitationDto) {
    // Check requester has permission
    const requester = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: invitedById, organizationId: orgId } },
    });
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions to invite');
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId: orgId } },
      });
      if (existingMember) throw new BadRequestException('User is already a member');
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role ?? 'member',
        organizationId: orgId,
        invitedById,
        expiresAt,
      },
      include: { organization: true, invitedBy: { select: { name: true, email: true } } },
    });

    // In production: send email via Resend/nodemailer
    console.log(`[INVITE] ${dto.email} → ${invitation.token} (org: ${orgId})`);

    return invitation;
  }

  async preview(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true, slug: true } }, invitedBy: { select: { name: true } } },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');
    if (invitation.acceptedAt) throw new BadRequestException('Invitation already accepted');
    return invitation;
  }

  async accept(token: string, userId: string) {
    const invitation = await this.preview(token);

    const org = invitation.organization;

    await this.prisma.$transaction(async (tx) => {
      // Add to org
      await tx.organizationMember.upsert({
        where: { userId_organizationId: { userId, organizationId: org.id } },
        create: { userId, organizationId: org.id, role: invitation.role },
        update: { role: invitation.role },
      });

      // Set as user's current org if they don't have one
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user?.organizationId) {
        await tx.user.update({ where: { id: userId }, data: { organizationId: org.id } });
      }

      // Mark accepted
      await tx.invitation.update({ where: { token }, data: { acceptedAt: new Date() } });
    });

    return { organizationId: org.id, organizationSlug: org.slug };
  }

  async listForOrg(orgId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId, acceptedAt: null },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
