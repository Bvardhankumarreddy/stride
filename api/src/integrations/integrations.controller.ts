import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.integrations.findAll(req.user.organizationId);
  }

  @Post()
  upsert(@Request() req: any, @Body() dto: CreateIntegrationDto) {
    return this.integrations.upsert(req.user.organizationId, dto);
  }

  @Delete(':type')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('type') type: string) {
    return this.integrations.remove(req.user.organizationId, type);
  }
}
