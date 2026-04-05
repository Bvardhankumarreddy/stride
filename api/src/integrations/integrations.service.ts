import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';

const SAFE_SELECT = { id: true, type: true, config: true, createdAt: true };

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.integration.findMany({
      where: { organizationId },
      select: SAFE_SELECT,
    });
  }

  upsert(organizationId: string, dto: CreateIntegrationDto) {
    return this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: dto.type } },
      create: { organizationId, type: dto.type, token: dto.token, config: dto.config ?? {} },
      update: { token: dto.token, config: dto.config ?? {} },
      select: SAFE_SELECT,
    });
  }

  async remove(organizationId: string, type: string) {
    await this.prisma.integration.deleteMany({ where: { organizationId, type } });
  }
}
