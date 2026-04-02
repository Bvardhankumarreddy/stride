import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrgDto {
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'Slug may only contain lowercase letters, numbers, and hyphens' }) slug: string;
}
