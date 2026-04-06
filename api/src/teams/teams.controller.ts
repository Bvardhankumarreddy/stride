import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teams: TeamsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.teams.create(req.user.organizationId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.teams.findAll(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.teams.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateTeamDto>) {
    return this.teams.update(id, req.user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.teams.remove(id, req.user.organizationId);
  }

  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.teams.addMember(id, req.user.organizationId, body.userId, body.role);
  }

  @Patch(':id/members/:userId')
  updateMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role: string }) {
    return this.teams.updateMemberRole(id, req.user.organizationId, userId, body.role);
  }

  @Delete(':id/members/:userId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.removeMember(id, req.user.organizationId, userId);
  }
}
