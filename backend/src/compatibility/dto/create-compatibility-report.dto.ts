import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Sanitize } from '@/common/decorators/sanitize.decorator';

export class CreateCompatibilityReportDto {
  @ApiProperty({
    description: 'Дата рождения партнера в формате YYYY-MM-DD',
    example: '1992-08-24',
  })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({
    description: 'Время рождения партнера в формате HH:mm',
    example: '18:45',
  })
  @IsString()
  birthTime!: string;

  @ApiProperty({
    description: 'Место рождения партнера. Имя партнера не передается.',
    example: 'Paris, France',
  })
  @Sanitize('strict')
  @IsString()
  birthPlace!: string;

  @ApiProperty({
    description: 'Широта места рождения партнера',
    example: 48.8566,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Долгота места рождения партнера',
    example: 2.3522,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Часовой пояс партнера: IANA, UTC+03:00 или числовой offset',
    example: 'Europe/Paris',
    required: false,
  })
  @Sanitize('strict')
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Запросить AI-текст поверх алгоритмического расчета',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useAi?: boolean;
}
