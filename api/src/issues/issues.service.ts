import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SlackService } from '../integrations/slack.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';

const INCLUDE = {
  assignee: { select: { id: true, name: true, initials: true, image: true } },
  creator: { select: { id: true, name: true, initials: true } },
  sprint: { select: { id: true, name: true, status: true } },
  project: { select: { id: true, name: true } },
  customFieldValues: { include: { customField: true } },
  children: { select: { id: true, title: true, status: true, priority: true } },
  blocking: { include: { blockedIssue: { select: { id: true, title: true, status: true } } } },
  blockedBy: { include: { blockingIssue: { select: { id: true, title: true, status: true } } } },
};

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private search: SearchService,
    private notifications: NotificationsService,
    private email: EmailService,
    private webhooks: WebhooksService,
    private slack: SlackService,
  ) {}

  async create(dto: CreateIssueDto, creatorId: string, organizationId?: string) {
    const { labels, dueDate, ...rest } = dto;
    const issue = await this.prisma.issue.create({
      data: { ...rest, creatorId, organizationId, dueDate: dueDate ? new Date(dueDate) : undefined, labels: labels ?? [] } as any,
      include: INCLUDE,
    });
    await this.search.indexIssue(issue);
    await this.prisma.issueActivity.create({ data: { issueId: issue.id, userId: creatorId, type: 'created' } }).catch(() => {});
    if (organizationId) {
      this.webhooks.dispatch(organizationId, 'issue.created', { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority }).catch(() => {});
      this.slack.notify(organizationId, 'issue.created', { title: issue.title, status: issue.status, priority: issue.priority, assigneeName: (issue.assignee as any)?.name }).catch(() => {});
    }
    return issue;
  }

  async findAll(query: QueryIssueDto, organizationId?: string) {
    const { status, priority, projectId, sprintId, assigneeId, page = 1, limit = 25 } = query;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (sprintId) where.sprintId = sprintId;
    if (assigneeId) where.assigneeId = assigneeId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.issue.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { ...INCLUDE, comments: { include: { author: { select: { id: true, name: true, initials: true, image: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async update(id: string, dto: UpdateIssueDto) {
    const existing = await this.findOne(id);
    const { labels, dueDate, ...rest } = dto;
    const issue = await this.prisma.issue.update({
      where: { id },
      data: { ...rest, ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }), ...(labels !== undefined && { labels }) },
      include: INCLUDE,
    });
    await this.search.indexIssue(issue);

    // Log activity for field changes
    if (dto.status && dto.status !== existing.status) {
      await this.prisma.issueActivity.create({ data: { issueId: id, type: 'status_changed', from: existing.status, to: dto.status } }).catch(() => {});
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      const toName = (issue.assignee as any)?.name ?? dto.assigneeId ?? 'Unassigned';
      const fromName = (existing.assignee as any)?.name ?? 'Unassigned';
      await this.prisma.issueActivity.create({ data: { issueId: id, type: 'assignee_changed', from: fromName, to: toName } }).catch(() => {});
    }
    if (dto.priority && dto.priority !== existing.priority) {
      await this.prisma.issueActivity.create({ data: { issueId: id, type: 'priority_changed', from: existing.priority, to: dto.priority } }).catch(() => {});
    }

    // Notify + email the new assignee (skip if unchanged or unassigned)
    const newAssigneeId = dto.assigneeId;
    if (newAssigneeId && newAssigneeId !== existing.assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: newAssigneeId },
        select: { email: true, name: true },
      });
      const assigner = issue.creator?.name ?? 'A teammate';
      const appUrl = process.env.APP_URL ?? 'http://localhost:3001';

      await Promise.all([
        this.notifications.create({
          type: 'assigned',
          title: 'You were assigned an issue',
          body: issue.title,
          userId: newAssigneeId,
          issueId: id,
        }).catch(() => {}),
        assignee && this.email.send('stride_assigned', {
          email: assignee.email,
          name: assignee.name ?? assignee.email,
          issueTitle: issue.title,
          issueUrl: `${appUrl}/issues/${id}`,
          assignerName: assigner,
        }).catch(() => {}),
      ]);
    }

    if (issue.organizationId) {
      this.webhooks.dispatch(issue.organizationId, 'issue.updated', { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority }).catch(() => {});
      this.slack.notify(issue.organizationId, 'issue.updated', { title: issue.title, status: issue.status, priority: issue.priority, assigneeName: (issue.assignee as any)?.name }).catch(() => {});
    }
    return issue;
  }

  async getActivity(id: string) {
    return this.prisma.issueActivity.findMany({
      where: { issueId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, initials: true } } },
    });
  }

  async bulkUpdate(ids: string[], data: { status?: string; assigneeId?: string; priority?: string }) {
    await this.prisma.issue.updateMany({ where: { id: { in: ids } }, data });
  }

  async remove(id: string) {
    const issue = await this.findOne(id);
    await this.prisma.issue.delete({ where: { id } });
    await this.search.removeIssue(id);
    if (issue.organizationId) {
      this.webhooks.dispatch(issue.organizationId, 'issue.deleted', { id: issue.id, title: issue.title }).catch(() => {});
      this.slack.notify(issue.organizationId, 'issue.deleted', { title: issue.title }).catch(() => {});
    }
  }

  async createSubTask(parentId: string, dto: { title: string }, creatorId: string, organizationId?: string) {
    const parent = await this.findOne(parentId);
    return this.prisma.issue.create({
      data: {
        title: dto.title,
        status: 'todo',
        priority: 'medium',
        parentId,
        creatorId,
        organizationId: organizationId ?? parent.organizationId ?? undefined,
        projectId: parent.projectId ?? undefined,
        labels: [],
      } as any,
      include: { assignee: { select: { id: true, name: true, initials: true, image: true } } },
    });
  }

  async addDependency(blockingIssueId: string, blockedIssueId: string) {
    return this.prisma.issueDependency.upsert({
      where: { blockingIssueId_blockedIssueId: { blockingIssueId, blockedIssueId } },
      create: { blockingIssueId, blockedIssueId },
      update: {},
    });
  }

  async removeDependency(blockingIssueId: string, blockedIssueId: string) {
    await this.prisma.issueDependency.deleteMany({ where: { blockingIssueId, blockedIssueId } });
  }
}
