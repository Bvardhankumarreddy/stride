import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['owner', 'admin', 'member'] })
  @IsIn(['owner', 'admin', 'member'])
  role: string;
}
