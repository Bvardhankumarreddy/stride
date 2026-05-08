import { Controller, Get, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get() findAll(@Request() req: any) { return this.users.findAll(req.user.organizationId); }

  // Notification prefs (must come before :id to avoid shadowing)
  @Get('me/notification-prefs') getNotifPrefs(@Request() req: any) { return this.users.getNotifPrefs(req.user.sub); }
  @Patch('me/notification-prefs') updateNotifPrefs(@Body() body: Record<string, { email?: boolean; inApp?: boolean }>, @Request() req: any) {
    return this.users.updateNotifPrefs(req.user.sub, body as any);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.users.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.users.remove(id); }
}
