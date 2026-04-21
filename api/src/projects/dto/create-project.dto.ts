import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
  @ApiPropertyOptional({ description: 'Short key like "STR" used in issue slugs (STR-123). Auto-generated if omitted.' })
  @IsOptional() @IsString() @MaxLength(10) @Matches(/^[A-Za-z0-9]{2,10}$/, { message: 'Key must be 2–10 letters or digits' })
  key?: string;
}
