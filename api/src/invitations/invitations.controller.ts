import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private invitations: InvitationsService) {}

  // Create invite — must be org member
  @Post('organizations/:orgId/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Param('orgId') orgId: string, @Body() dto: CreateInvitationDto, @Req() req: any) {
    return this.invitations.create(orgId, req.user.sub, dto);
  }

  // List pending invites for an org
  @Get('organizations/:orgId/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@Param('orgId') orgId: string) {
    return this.invitations.listForOrg(orgId);
  }

  // Preview invite — public (no auth)
  @Get('invitations/:token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  // Accept invite — must be authenticated
  @Post('invitations/:token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  accept(@Param('token') token: string, @Req() req: any) {
    return this.invitations.accept(token, req.user.sub);
  }

  // Revoke/delete a pending invite
  @Delete('organizations/:orgId/invitations/:invitationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  revoke(@Param('orgId') orgId: string, @Param('invitationId') invitationId: string, @Req() req: any) {
    return this.invitations.revoke(orgId, invitationId, req.user.sub);
  }
}
