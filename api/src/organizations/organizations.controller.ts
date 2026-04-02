import { Controller, Post, Get, Patch, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrgDto, @Req() req: any) {
    return this.orgs.create(dto, req.user.sub);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.orgs.findMine(req.user.sub);
  }

  @Patch(':orgId')
  update(@Param('orgId') orgId: string, @Body() body: { name?: string }, @Req() req: any) {
    return this.orgs.update(orgId, body, req.user.sub);
  }

  @Get(':orgId/members')
  members(@Param('orgId') orgId: string) {
    return this.orgs.findMembers(orgId);
  }

  @Patch(':orgId/members/:userId')
  updateRole(@Param('orgId') orgId: string, @Param('userId') userId: string, @Body() dto: UpdateMemberRoleDto, @Req() req: any) {
    return this.orgs.updateMemberRole(orgId, userId, dto, req.user.sub);
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('orgId') orgId: string, @Req() req: any) {
    return this.orgs.delete(orgId, req.user.sub);
  }

  @Delete(':orgId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('orgId') orgId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.orgs.removeMember(orgId, userId, req.user.sub);
  }
}
