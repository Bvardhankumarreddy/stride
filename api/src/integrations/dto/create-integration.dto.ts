import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() token: string;
  @ApiPropertyOptional() @IsOptional() config?: Record<string, string>;
}
