import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const PASSWORD_EXPIRY_DAYS = 90;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private audit: AuditService,
  ) {}

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }

  private makeSlug(name: string) {
    const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  private isPasswordExpired(passwordChangedAt: Date | null): boolean {
    if (!passwordChangedAt) return false; // owners set their own password — not expired until they change it
    const expiryMs = PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - passwordChangedAt.getTime() > expiryMs;
  }

  private signToken(user: any, organizationId: string | null, mustChangePassword: boolean) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId,
      mustChangePassword,
    });
  }

  private async generateRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const raw = crypto.randomBytes(40).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.prisma.refreshToken.create({ data: { tokenHash: hash, userId, userAgent, ipAddress, expiresAt } });
    return raw;
  }

  private async sendVerificationEmail(user: { id: string; email: string; name: string | null }) {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.prisma.emailVerificationToken.create({ data: { tokenHash: hash, userId: user.id, expiresAt } });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    await this.email.send('stride_verify_email', {
      email: user.email,
      name: user.name ?? user.email,
      verifyUrl: `${appUrl}/verify-email?token=${raw}`,
    }).catch(() => {});
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const orgSlug = this.makeSlug(dto.name);

    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, password: passwordHash, initials, passwordChangedAt: new Date() },
      });
      const org = await tx.organization.create({
        data: { name: `${dto.name}'s Workspace`, slug: orgSlug },
      });
      await tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: 'owner' } });
      await tx.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
      return { user, org };
    });

    const accessToken = this.signToken(user, org.id, false);
    const refreshToken = await this.generateRefreshToken(user.id);
    this.sendVerificationEmail(user).catch(() => {});
    return { accessToken, refreshToken, user: { ...this.sanitize(user), organizationId: org.id } };
  }

  // Register as an invited member — creates user only, no org (org assigned on invite accept)
  async registerMember(dto: RegisterDto) {
    if (!dto.inviteToken) throw new BadRequestException('Invite token is required');

    const invitation = await this.prisma.invitation.findUnique({ where: { token: dto.inviteToken } });
    if (!invitation) throw new BadRequestException('Invalid invite token');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invite token has expired');
    if (invitation.acceptedAt) throw new BadRequestException('Invite already used');
    if (invitation.email !== dto.email) throw new BadRequestException('Email does not match invitation');

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // mustChangePassword = true so they are prompted to set their own password after first login
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: passwordHash, initials, mustChangePassword: true },
    });

    const accessToken = this.signToken(user, null, true);
    const refreshToken = await this.generateRefreshToken(user.id);
    return { accessToken, refreshToken, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.password) {
      await this.audit.log({ action: 'login_failed', metadata: { email: dto.email } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check lockout before validating password
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minute(s)`);
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const newCount = user.failedLoginCount + 1;
      const lockedUntil = newCount >= 10 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: newCount, ...(lockedUntil && { lockedUntil }) } });
      await this.audit.log({ action: 'login_failed', metadata: { email: dto.email } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // After successful login — reset counter
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

    let organizationId = user.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId: user.id } });
      organizationId = membership?.organizationId ?? null;
    }

    // Force change if flagged or password has expired
    const mustChange = user.mustChangePassword || this.isPasswordExpired(user.passwordChangedAt);

    const accessToken = this.signToken(user, organizationId, mustChange);
    const refreshToken = await this.generateRefreshToken(user.id);
    await this.audit.log({ action: 'login', userId: user.id });
    return { accessToken, refreshToken, user: { ...this.sanitize(user), organizationId, mustChangePassword: mustChange } };
  }

  async refresh(rawToken: string) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Invalid or expired refresh token');

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRaw = await this.generateRefreshToken(stored.userId, stored.userAgent ?? undefined, stored.ipAddress ?? undefined);

    const user = stored.user;
    let organizationId = user.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId: user.id } });
      organizationId = membership?.organizationId ?? null;
    }
    const accessToken = this.signToken(user, organizationId, user.mustChangePassword);
    return { accessToken, refreshToken: newRaw };
  }

  async logout(rawToken: string) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
    return { message: 'Logged out' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

    const hash = await bcrypt.hash(newPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false, passwordChangedAt: new Date() },
    });

    let organizationId = updated.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId } });
      organizationId = membership?.organizationId ?? null;
    }

    await this.audit.log({ action: 'password_changed', userId });

    // Issue a fresh token with mustChangePassword: false
    const token = this.signToken(updated, organizationId, false);
    return { accessToken: token };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success even if user not found (security)
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.prisma.passwordResetToken.create({ data: { tokenHash: hash, userId: user.id, expiresAt } });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    await this.email.send('stride_password_reset', {
      email: user.email,
      name: user.name ?? user.email,
      resetUrl: `${appUrl}/reset-password?token=${raw}`,
    }).catch(() => {});

    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Revoke all refresh tokens on password reset
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    await this.audit.log({ action: 'password_reset', userId: record.userId });
    return { message: 'Password reset successfully' };
  }

  async verifyEmail(rawToken: string) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!record || record.expiresAt < new Date()) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);
    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified) throw new BadRequestException('Email already verified');
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await this.sendVerificationEmail(user as any);
    return { message: 'Verification email sent' };
  }

  async oauthLogin(profile: { email: string; name: string; image: string | null; provider: string; providerId: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const orgSlug = this.makeSlug(profile.name);
      const result = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { name: profile.name, email: profile.email, image: profile.image, initials, passwordChangedAt: new Date(), emailVerified: new Date() },
        });
        const org = await tx.organization.create({
          data: { name: `${profile.name}'s Workspace`, slug: orgSlug },
        });
        await tx.organizationMember.create({ data: { userId: newUser.id, organizationId: org.id, role: 'owner' } });
        await tx.user.update({ where: { id: newUser.id }, data: { organizationId: org.id } });
        return { user: newUser, org };
      });
      user = result.user;
    } else if (!user.image && profile.image) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { image: profile.image } });
    }

    let organizationId = user.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId: user.id } });
      organizationId = membership?.organizationId ?? null;
    }

    const accessToken = this.signToken(user, organizationId, false);
    const refreshToken = await this.generateRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    return this.sanitize(user);
  }
}
