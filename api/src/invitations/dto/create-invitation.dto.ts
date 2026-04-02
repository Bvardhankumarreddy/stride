import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional({ enum: ['admin', 'member'] }) @IsOptional() @IsIn(['admin', 'member']) role?: string;
}
