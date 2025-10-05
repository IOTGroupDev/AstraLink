import { ApiProperty } from '@nestjs/swagger';

export class PlanetPositionDto {
  @ApiProperty({
    description: 'Долгота планеты в градусах',
    example: 75.2,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Знак зодиака',
    example: 'Gemini',
  })
  sign!: string;

  @ApiProperty({
    description: 'Градус в знаке',
    example: 15.2,
  })
  degree!: number;

  @ApiProperty({
    description: 'Скорость планеты',
    example: 1.2,
    required: false,
  })
  speed?: number;
}

export class HousePositionDto {
  @ApiProperty({
    description: 'Долгота куспида дома в градусах',
    example: 45.0,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Знак зодиака',
    example: 'Taurus',
  })
  sign!: string;

  @ApiProperty({
    description: 'Градус в знаке',
    example: 15.0,
  })
  degree!: number;
}

export class AspectDto {
  @ApiProperty({
    description: 'Первая планета',
    example: 'sun',
  })
  planet1!: string;

  @ApiProperty({
    description: 'Вторая планета',
    example: 'moon',
  })
  planet2!: string;

  @ApiProperty({
    description: 'Тип аспекта',
    example: 'trine',
  })
  aspect!: string;

  @ApiProperty({
    description: 'Орбис аспекта в градусах',
    example: 2.1,
  })
  orb!: number;

  @ApiProperty({
    description: 'Сила аспекта (0-100)',
    example: 85,
  })
  strength!: number;
}

export class SwissResultDto {
  @ApiProperty({
    description: 'Дата и время расчета',
    example: '2025-01-15T14:30:00.000Z',
  })
  date!: string;

  @ApiProperty({
    description: 'Позиции планет',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/PlanetPositionDto' },
  })
  planets!: Record<string, PlanetPositionDto>;

  @ApiProperty({
    description: 'Позиции домов',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/HousePositionDto' },
  })
  houses!: Record<string, HousePositionDto>;

  @ApiProperty({
    description: 'Аспекты между планетами',
    type: [AspectDto],
  })
  aspects!: AspectDto[];

  @ApiProperty({
    description: 'Юлианский день',
    example: 2460321.5,
  })
  julianDay!: number;

  @ApiProperty({
    description: 'Координаты места расчета',
    example: { latitude: 55.7558, longitude: 37.6176 },
  })
  location!: {
    latitude: number;
    longitude: number;
  };
}
