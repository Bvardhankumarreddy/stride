import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Req() req: any, @Query('limit') limit?: string) {
    return this.audit.findAll(req.user.organizationId, limit ? parseInt(limit, 10) : 100);
  }
}
