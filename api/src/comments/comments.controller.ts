import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:issueId/comments')
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Post() create(@Param('issueId') issueId: string, @Body() dto: CreateCommentDto, @Req() req: any) { return this.comments.create(issueId, dto, req.user.sub); }
  @Get() findAll(@Param('issueId') issueId: string) { return this.comments.findAll(issueId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @Req() req: any) { return this.comments.update(id, dto, req.user.sub); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string, @Req() req: any) { return this.comments.remove(id, req.user.sub, req.user.role); }
}
