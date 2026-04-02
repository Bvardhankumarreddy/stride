import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';

const INCLUDE = {
  assignee: { select: { id: true, name: true, initials: true, image: true } },
  creator: { select: { id: true, name: true, initials: true } },
  sprint: { select: { id: true, name: true, status: true } },
  project: { select: { id: true, name: true } },
  customFieldValues: { include: { customField: true } },
};

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private search: SearchService,
  ) {}

  async create(dto: CreateIssueDto, creatorId: string, organizationId?: string) {
    const { labels, dueDate, ...rest } = dto;
    const issue = await this.prisma.issue.create({
      data: { ...rest, creatorId, organizationId, dueDate: dueDate ? new Date(dueDate) : undefined, labels: labels ?? [] } as any,
      include: INCLUDE,
    });
    await this.search.indexIssue(issue);
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
    await this.findOne(id);
    const { labels, dueDate, ...rest } = dto;
    const issue = await this.prisma.issue.update({
      where: { id },
      data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined, ...(labels !== undefined && { labels }) },
      include: INCLUDE,
    });
    await this.search.indexIssue(issue);
    return issue;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.issue.delete({ where: { id } });
    await this.search.removeIssue(id);
  }
}
