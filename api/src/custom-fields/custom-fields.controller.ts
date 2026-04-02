import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@ApiTags('custom-fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private service: CustomFieldsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateCustomFieldDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub, req.user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCustomFieldDto>, @Req() req: any) {
    return this.service.update(id, dto, req.user.sub, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.sub, req.user.organizationId);
  }

  @Patch('issues/:issueId/values')
  upsertValues(
    @Param('issueId') issueId: string,
    @Body() body: { values: { fieldId: string; value: string }[] },
  ) {
    return this.service.upsertValues(issueId, body.values);
  }
}
