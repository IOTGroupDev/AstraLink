import { ApiProperty } from '@nestjs/swagger';

export class NatalChartResponseDto {
  @ApiProperty({
    description: 'ID натальной карты',
    example: 'chart-123',
  })
  id!: string;

  @ApiProperty({
    description: 'ID пользователя',
    example: 'user-456',
  })
  userId!: string;

  @ApiProperty({
    description: 'Данные натальной карты',
    example: {
      birthDate: '1990-05-15T14:30:00.000Z',
      planets: {
        sun: { longitude: 75.2, sign: 'Gemini', degree: 15.2 },
        moon: { longitude: 120.5, sign: 'Leo', degree: 0.5 },
        // ... other planets
      },
      houses: {
        1: { longitude: 45.0, sign: 'Taurus', degree: 15.0 },
        // ... other houses
      },
      aspects: [
        {
          planet1: 'sun',
          planet2: 'moon',
          aspect: 'trine',
          orb: 2.1,
          strength: 85,
        },
        // ... other aspects
      ],
    },
  })
  data!: Record<string, any>;

  @ApiProperty({
    description: 'Дата создания карты',
    example: '2025-01-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Дата последнего обновления',
    example: '2025-01-15T10:30:00.000Z',
  })
  updatedAt!: string;
}
