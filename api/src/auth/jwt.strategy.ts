import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET ?? 'd9f2e8e1fb9b246acb0962cfef26e3978275aad357925bea10f4c557548e6f25',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; organizationId?: string; mustChangePassword?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: payload.organizationId ?? user.organizationId,
      mustChangePassword: payload.mustChangePassword ?? false,
    };
  }
}
