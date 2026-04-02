import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const AUTHOR_SELECT = { select: { id: true, name: true, initials: true, image: true } };

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  create(issueId: string, dto: CreateCommentDto, authorId: string) {
    return this.prisma.comment.create({
      data: { body: dto.body, issueId, authorId },
      include: { author: AUTHOR_SELECT },
    });
  }

  findAll(issueId: string) {
    return this.prisma.comment.findMany({
      where: { issueId },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Cannot edit another user\'s comment');
    return this.prisma.comment.update({ where: { id }, data: { body: dto.body }, include: { author: AUTHOR_SELECT } });
  }

  async remove(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && userRole !== 'admin') throw new ForbiddenException('Cannot delete another user\'s comment');
    await this.prisma.comment.delete({ where: { id } });
  }
}
