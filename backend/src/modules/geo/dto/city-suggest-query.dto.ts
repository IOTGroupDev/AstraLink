import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CitySuggestQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  q!: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
