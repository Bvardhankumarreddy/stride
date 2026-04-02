import { IsString, IsIn, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomFieldDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsIn(['text', 'number', 'date', 'select', 'checkbox']) type: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() options?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean;
}
