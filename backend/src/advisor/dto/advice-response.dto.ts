// backend/src/advisor/dto/advice-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export type AdvisorVerdict = 'good' | 'neutral' | 'challenging';

export class AdvisorAspect {
  @ApiProperty({ description: 'Планета A' })
  planetA!: string;

  @ApiProperty({ description: 'Планета B (обычно та же для транзитов)' })
  planetB!: string;

  @ApiProperty({
    enum: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
    description: 'Тип аспекта',
  })
  type!: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

  @ApiProperty({ description: 'Орб аспекта в градусах' })
  orb!: number;

  @ApiProperty({ description: 'Влияние аспекта (-1 до 1)' })
  impact!: number;

  @ApiProperty({ required: false, description: 'Описание аспекта' })
  description?: string;
}

export class AdvisorFactor {
  @ApiProperty({ description: 'Название фактора' })
  label!: string;

  @ApiProperty({ description: 'Вес фактора' })
  weight!: number;

  @ApiProperty({ description: 'Значение фактора (0-1)' })
  value!: number;

  @ApiProperty({ description: 'Вклад в итоговый score' })
  contribution!: number;

  @ApiProperty({ required: false, description: 'Описание фактора' })
  description?: string;
}

export class TimeWindow {
  @ApiProperty({ description: 'Начало временного окна (ISO)' })
  startISO!: string;

  @ApiProperty({ description: 'Конец временного окна (ISO)' })
  endISO!: string;

  @ApiProperty({ description: 'Оценка для этого окна (0-100)' })
  score!: number;
}

export class AdvisorRecommendation {
  @ApiProperty({ description: 'Текст рекомендации' })
  text!: string;

  @ApiProperty({
    enum: ['high', 'medium', 'low'],
    description: 'Приоритет рекомендации',
  })
  priority!: 'high' | 'medium' | 'low';

  @ApiProperty({
    enum: ['action', 'caution', 'warning'],
    description: 'Категория рекомендации',
  })
  category!: 'action' | 'caution' | 'warning';
}

export class AdvisorHouse {
  @ApiProperty({ description: 'Номер дома (1-12)' })
  house!: number;

  @ApiProperty({ description: 'Знак на куспиде дома' })
  sign!: string;

  @ApiProperty({ description: 'Релевантность дома для темы' })
  relevance!: string;

  @ApiProperty({ type: [String], description: 'Планеты в доме' })
  planets!: string[];
}

export class AdviceResponseDto {
  @ApiProperty({
    enum: ['good', 'neutral', 'challenging'],
    description: 'Вердикт: хорошо/нейтрально/сложно',
  })
  verdict!: AdvisorVerdict;

  @ApiProperty({ description: 'Цвет для UI (hex)', example: '#10B981' })
  color!: string;

  @ApiProperty({ description: 'Оценка 0-100', minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ type: [AdvisorFactor], description: 'Список факторов' })
  factors!: AdvisorFactor[];

  @ApiProperty({ type: [AdvisorAspect], description: 'Аспекты транзит-натал' })
  aspects!: AdvisorAspect[];

  @ApiProperty({ type: [AdvisorHouse], description: 'Релевантные дома' })
  houses!: AdvisorHouse[];

  @ApiProperty({
    type: [TimeWindow],
    description: 'Лучшие временные окна за день',
  })
  bestWindows!: TimeWindow[];

  @ApiProperty({ description: 'Текстовое объяснение' })
  explanation!: string;

  @ApiProperty({
    type: [AdvisorRecommendation],
    description: 'Рекомендации',
    required: false,
  })
  recommendations?: AdvisorRecommendation[];

  @ApiProperty({ description: 'Источник генерации', example: 'enhanced-rules' })
  generatedBy!: string;

  @ApiProperty({ description: 'Timestamp генерации (ISO)' })
  evaluatedAt!: string;

  @ApiProperty({
    description: 'Дата анализа (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  date!: string;

  @ApiProperty({
    description: 'Тема запроса',
    example: 'contract',
    enum: [
      'contract',
      'meeting',
      'negotiation',
      'date',
      'travel',
      'purchase',
      'health',
      'custom',
    ],
  })
  topic!: string;

  @ApiProperty({
    description: 'Часовой пояс',
    required: false,
    example: 'UTC',
  })
  timezone?: string;

  @ApiProperty({
    description: 'Описание темы на русском',
    required: false,
    example: 'Подписание контрактов и юридических документов',
  })
  topicDescription?: string;
}
