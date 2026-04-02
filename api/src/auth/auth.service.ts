import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

const PASSWORD_EXPIRY_DAYS = 90;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

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

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const orgSlug = this.makeSlug(dto.name);

    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, password: hash, initials, passwordChangedAt: new Date() },
      });
      const org = await tx.organization.create({
        data: { name: `${dto.name}'s Workspace`, slug: orgSlug },
      });
      await tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: 'owner' } });
      await tx.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
      return { user, org };
    });

    const token = this.signToken(user, org.id, false);
    return { accessToken: token, user: { ...this.sanitize(user), organizationId: org.id } };
  }

  // Register as an invited member — creates user only, no org (org assigned on invite accept)
  async registerMember(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // mustChangePassword = true so they are prompted to set their own password after first login
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash, initials, mustChangePassword: true },
    });

    const token = this.signToken(user, null, true);
    return { accessToken: token, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    let organizationId = user.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId: user.id } });
      organizationId = membership?.organizationId ?? null;
    }

    // Force change if flagged or password has expired
    const mustChange = user.mustChangePassword || this.isPasswordExpired(user.passwordChangedAt);

    const token = this.signToken(user, organizationId, mustChange);
    return { accessToken: token, user: { ...this.sanitize(user), organizationId, mustChangePassword: mustChange } };
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

    // Issue a fresh token with mustChangePassword: false
    const token = this.signToken(updated, organizationId, false);
    return { accessToken: token };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    return this.sanitize(user);
  }
}
