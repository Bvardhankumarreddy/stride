import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }

  findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { memberships: { some: { organizationId } } },
      select: { id: true, name: true, email: true, initials: true, image: true, role: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.sanitize(user);
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
