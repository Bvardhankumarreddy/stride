import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get() findAll(@Req() req: any, @Query('read') read?: string) { return this.notifications.findAll(req.user.sub, read); }
  @Post() create(@Body() dto: CreateNotificationDto) { return this.notifications.create(dto); }
  @Patch('read-all') markAllRead(@Req() req: any) { return this.notifications.markAllRead(req.user.sub); }
  @Patch(':id/read') markRead(@Param('id') id: string, @Req() req: any) { return this.notifications.markRead(id, req.user.sub); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string, @Req() req: any) { return this.notifications.remove(id, req.user.sub); }
}
