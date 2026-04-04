import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Resend } from 'resend';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  constructor(private prisma: PrismaService) {}

  private async sendInviteEmail(params: {
    to: string;
    orgName: string;
    inviterName: string | null;
    token: string;
  }) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const inviteUrl = `${appUrl}/invite/${params.token}`;

    if (!this.resend) {
      this.logger.warn(`[INVITE] RESEND_API_KEY not set — invite link: ${inviteUrl}`);
      return;
    }

    await this.resend.emails.send({
      from: 'Stride <onboarding@resend.dev>',
      to: params.to,
      subject: `You've been invited to join ${params.orgName} on Stride`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">You're invited to Stride</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px">
            ${params.inviterName ?? 'Someone'} has invited you to join <strong>${params.orgName}</strong>.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;padding:12px 24px;background:#6d28d9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Accept invitation
          </a>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:13px">
            This invite expires in 48 hours. If you didn't expect this, you can ignore it.
          </p>
        </div>
      `,
    });

    this.logger.log(`[INVITE] Email sent to ${params.to} for org ${params.orgName}`);
  }

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

    await this.sendInviteEmail({
      to: dto.email,
      orgName: invitation.organization.name,
      inviterName: invitation.invitedBy?.name ?? null,
      token: invitation.token,
    });

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
