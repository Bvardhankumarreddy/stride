import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  private async requireAdmin(userId: string, organizationId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new ForbiddenException('Only owners and admins can manage custom fields');
    }
  }

  findAll(organizationId: string) {
    return this.prisma.customField.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateCustomFieldDto, requesterId: string, organizationId: string) {
    await this.requireAdmin(requesterId, organizationId);
    return this.prisma.customField.create({
      data: {
        name: dto.name,
        type: dto.type,
        options: dto.options ?? [],
        required: dto.required ?? false,
        organizationId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateCustomFieldDto>, requesterId: string, organizationId: string) {
    const field = await this.prisma.customField.findUnique({ where: { id } });
    if (!field || field.organizationId !== organizationId) throw new NotFoundException();
    await this.requireAdmin(requesterId, organizationId);
    return this.prisma.customField.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.required !== undefined && { required: dto.required }),
      },
    });
  }

  async remove(id: string, requesterId: string, organizationId: string) {
    const field = await this.prisma.customField.findUnique({ where: { id } });
    if (!field || field.organizationId !== organizationId) throw new NotFoundException();
    await this.requireAdmin(requesterId, organizationId);
    await this.prisma.customField.delete({ where: { id } });
  }

  async upsertValues(issueId: string, values: { fieldId: string; value: string }[]) {
    await Promise.all(
      values.map(v =>
        this.prisma.customFieldValue.upsert({
          where: { issueId_customFieldId: { issueId, customFieldId: v.fieldId } },
          create: { issueId, customFieldId: v.fieldId, value: v.value },
          update: { value: v.value },
        }),
      ),
    );
  }
}
