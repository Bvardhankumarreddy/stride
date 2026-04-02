import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { CreateDocDto } from './dto/create-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';
import { QueryDocDto } from './dto/query-doc.dto';

const INCLUDE = { author: { select: { id: true, name: true, initials: true } }, project: { select: { id: true, name: true } } };

@Injectable()
export class DocsService {
  constructor(
    private prisma: PrismaService,
    private search: SearchService,
  ) {}

  async create(dto: CreateDocDto, authorId: string, organizationId?: string) {
    const doc = await this.prisma.document.create({
      data: { ...dto, authorId, organizationId, content: dto.content ?? {} } as any,
      include: INCLUDE,
    });
    await this.search.indexDoc(doc);
    return doc;
  }

  async findAll(query: QueryDocDto, organizationId?: string) {
    const { projectId, status, page = 1, limit = 25 } = query;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, include: { author: { select: { id: true, name: true, initials: true } }, project: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, initials: true, image: true } }, project: { select: { id: true, name: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: string, dto: UpdateDocDto, userId: string) {
    const doc = await this.findOne(id);
    if (doc.authorId && doc.authorId !== userId) throw new ForbiddenException('Cannot edit another user\'s document');
    const updated = await this.prisma.document.update({ where: { id }, data: dto, include: INCLUDE });
    await this.search.indexDoc(updated);
    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    const doc = await this.findOne(id);
    if (doc.authorId && doc.authorId !== userId && userRole !== 'admin') throw new ForbiddenException();
    await this.prisma.document.delete({ where: { id } });
    await this.search.removeDoc(id);
  }
}
