import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/sprints')
export class SprintsController {
  constructor(private sprints: SprintsService) {}

  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateSprintDto) { return this.sprints.create(projectId, dto); }
  @Get() findAll(@Param('projectId') projectId: string) { return this.sprints.findAll(projectId); }
  @Get(':id') findOne(@Param('projectId') projectId: string, @Param('id') id: string) { return this.sprints.findOne(projectId, id); }
  @Patch(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateSprintDto) { return this.sprints.update(projectId, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.sprints.remove(projectId, id); }
}
