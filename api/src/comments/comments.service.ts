import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const AUTHOR_SELECT = { select: { id: true, name: true, initials: true, image: true } };

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private email: EmailService,
    private users: UsersService,
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
      const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
      const issueUrl = `${appUrl}/issues/${issueId}`;

      const notifyIds = [...new Set([issue.assigneeId, issue.creatorId])]
        .filter((uid): uid is string => !!uid && uid !== authorId);

      // Fetch emails for notified users in one query
      const users = notifyIds.length
        ? await this.prisma.user.findMany({ where: { id: { in: notifyIds } }, select: { id: true, email: true, name: true } })
        : [];

      await Promise.all(notifyIds.map(async (userId) => {
        const user = users.find((u) => u.id === userId);
        const [wantsInApp, wantsEmail] = await Promise.all([
          this.users.shouldNotify(userId, 'issue_comment', 'inApp'),
          this.users.shouldNotify(userId, 'issue_comment', 'email'),
        ]);
        await Promise.all([
          wantsInApp && this.notifications.create({
            type: 'comment',
            title: `New comment on "${issue.title}"`,
            body: `${authorName}: ${dto.body.slice(0, 120)}`,
            userId,
            issueId,
          }).catch(() => {}),
          wantsEmail && user && this.email.send('stride_comment', {
            email: user.email,
            name: user.name ?? user.email,
            issueTitle: issue.title,
            issueUrl,
            authorName,
            commentBody: dto.body,
          }).catch(() => {}),
        ]);
      }));

      // Parse @mentions
      const mentionRegex = /@(\w[\w\s]*?\w|\w)/g;
      const mentionedNames = [...dto.body.matchAll(mentionRegex)].map(m => m[1].trim());
      if (mentionedNames.length > 0) {
        const mentionedUsers = await this.prisma.user.findMany({
          where: { name: { in: mentionedNames }, memberships: { some: { organizationId: { not: undefined } } } },
          select: { id: true, email: true, name: true },
        });
        const alreadyNotified = new Set(notifyIds);
        await Promise.all(mentionedUsers
          .filter(u => u.id !== authorId && !alreadyNotified.has(u.id))
          .map(async (u) => {
            const [wantsInApp, wantsEmail] = await Promise.all([
              this.users.shouldNotify(u.id, 'mention', 'inApp'),
              this.users.shouldNotify(u.id, 'mention', 'email'),
            ]);
            await Promise.all([
              wantsInApp && this.notifications.create({ type: 'mention', title: `${authorName} mentioned you`, body: dto.body.slice(0, 120), userId: u.id, issueId }).catch(() => {}),
              wantsEmail && this.email.send('stride_comment', { email: u.email, name: u.name ?? u.email, issueTitle: issue?.title ?? '', issueUrl, authorName, commentBody: dto.body }).catch(() => {}),
            ]);
          })
        );
      }
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
