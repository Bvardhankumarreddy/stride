import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocsService } from './docs.service';
import { CreateDocDto } from './dto/create-doc.dto';
import { UpdateDocDto } from './dto/update-doc.dto';
import { QueryDocDto } from './dto/query-doc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('docs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('docs')
export class DocsController {
  constructor(private docs: DocsService) {}

  @Post() create(@Body() dto: CreateDocDto, @Req() req: any) { return this.docs.create(dto, req.user.sub, req.user.organizationId); }
  @Get() findAll(@Query() query: QueryDocDto, @Req() req: any) { return this.docs.findAll(query, req.user.organizationId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.docs.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDocDto, @Req() req: any) { return this.docs.update(id, dto, req.user.sub); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string, @Req() req: any) { return this.docs.remove(id, req.user.sub, req.user.role); }
}
