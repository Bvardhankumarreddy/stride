import { Controller, Get, Query, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private search: SearchService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search issues and docs' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'filter', required: false, enum: ['issues', 'docs'] })
  async query(
    @Query('q') q: string,
    @Query('filter') filter?: 'issues' | 'docs',
  ) {
    if (!q?.trim()) return { results: [] };
    const results = await this.search.search(q, filter);
    return { results, total: results.length };
  }

  @Post('reindex')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reindex all issues and docs into Typesense' })
  async reindex() {
    const [issues, docs] = await Promise.all([
      this.prisma.issue.findMany({
        include: { assignee: { select: { name: true } } },
      }),
      this.prisma.document.findMany({
        include: { author: { select: { name: true } } },
      }),
    ]);

    return this.search.reindex(issues, docs);
  }
}
