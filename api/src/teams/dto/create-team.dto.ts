import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'Identifier must be uppercase letters and numbers only' })
  identifier: string;

  @IsOptional()
  @IsString()
  description?: string;
}
