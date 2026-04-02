import { IsString, IsOptional, IsDateString, IsArray, IsInt, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateIssueDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['todo','in-progress','in-review','done']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['urgent','high','medium','low']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() estimate?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() sprintId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
}
