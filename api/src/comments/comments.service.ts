import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const AUTHOR_SELECT = { select: { id: true, name: true, initials: true, image: true } };

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(issueId: string, dto: CreateCommentDto, authorId: string) {
    const comment = await this.prisma.comment.create({
      data: { body: dto.body, issueId, authorId },
      include: { author: AUTHOR_SELECT },
    });

    // Notify issue assignee and creator (skip the commenter)
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { title: true, assigneeId: true, creatorId: true },
    });
    if (issue) {
      const authorName = (comment.author as any)?.name ?? 'Someone';
      const notifyIds = [...new Set([issue.assigneeId, issue.creatorId])]
        .filter((uid): uid is string => !!uid && uid !== authorId);
      await Promise.all(notifyIds.map((userId) =>
        this.notifications.create({
          type: 'comment',
          title: `New comment on "${issue.title}"`,
          body: `${authorName}: ${dto.body.slice(0, 120)}`,
          userId,
          issueId,
        }).catch(() => {}),
      ));
    }

    return comment;
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
