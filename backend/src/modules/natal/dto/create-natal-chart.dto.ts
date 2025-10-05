import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateNatalChartDto {
  @ApiProperty({
    description: 'Дата рождения в формате YYYY-MM-DD',
    example: '1990-05-15',
  })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({
    description: 'Время рождения в формате HH:mm',
    example: '14:30',
  })
  @IsString()
  birthTime!: string;

  @ApiProperty({
    description: 'Место рождения',
    example: 'Moscow, Russia',
  })
  @IsString()
  birthPlace!: string;

  @ApiProperty({
    description: 'Широта места рождения (опционально)',
    example: 55.7558,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Долгота места рождения (опционально)',
    example: 37.6176,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Часовой пояс места рождения (опционально)',
    example: 'Europe/Moscow',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
