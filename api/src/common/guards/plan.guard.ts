import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_KEY } from '../decorators/require-plan.decorator';

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const orgId = req.user?.organizationId;
    if (!orgId) throw new HttpException('Upgrade required', HttpStatus.PAYMENT_REQUIRED);

    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
    const currentRank = PLAN_RANK[org?.plan ?? 'free'] ?? 0;
    const requiredRank = PLAN_RANK[required] ?? 1;

    if (currentRank < requiredRank) {
      throw new HttpException(
        { message: 'Upgrade required', requiredPlan: required, currentPlan: org?.plan ?? 'free' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
