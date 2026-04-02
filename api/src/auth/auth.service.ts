import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

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

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const orgSlug = this.makeSlug(dto.name);

    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, password: hash, initials },
      });
      const org = await tx.organization.create({
        data: { name: `${dto.name}'s Workspace`, slug: orgSlug },
      });
      await tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: 'owner' } });
      await tx.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
      return { user, org };
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, organizationId: org.id });
    return { accessToken: token, user: { ...this.sanitize(user), organizationId: org.id } };
  }

  // Register as an invited member — creates user only, no org (org is assigned on invite accept)
  async registerMember(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(dto.password, 12);
    const initials = dto.initials ?? dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash, initials },
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, organizationId: null });
    return { accessToken: token, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Find org — prefer user.organizationId, fallback to first membership
    let organizationId = user.organizationId;
    if (!organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({ where: { userId: user.id } });
      organizationId = membership?.organizationId ?? null;
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, organizationId });
    return { accessToken: token, user: { ...this.sanitize(user), organizationId } };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    return this.sanitize(user);
  }
}
