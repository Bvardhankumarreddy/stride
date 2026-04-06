import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() titlePrefix?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() labels?: string[];
}
