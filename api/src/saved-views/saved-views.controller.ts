import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SavedViewsService } from './saved-views.service';

@ApiTags('saved-views')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-views')
export class SavedViewsController {
  constructor(private views: SavedViewsService) {}

  @Get()
  list(@Req() req: any) {
    return this.views.list(req.user.organizationId);
  }

  @Post()
  create(@Body() body: { name: string; filters: Record<string, unknown> }, @Req() req: any) {
    return this.views.create(req.user.organizationId, req.user.sub, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.views.remove(id, req.user.organizationId, req.user.sub);
  }
}
