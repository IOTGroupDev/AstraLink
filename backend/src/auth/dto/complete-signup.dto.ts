import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Sanitize } from '@/common/decorators/sanitize.decorator';

export class CompleteSignupDto {
  @Sanitize('strict') // No HTML in names
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Дата должна быть в формате YYYY-MM-DD',
  })
  birthDate!: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:mm',
  })
  birthTime?: string;

  @Sanitize('strict') // No HTML in location names
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  birthTimeKnown?: boolean;
}
