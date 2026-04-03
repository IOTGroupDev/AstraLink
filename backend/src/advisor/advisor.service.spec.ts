import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorService } from './advisor.service';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { AIService } from '@/services/ai.service';
import { ChartService } from '@/chart/chart.service';
import { InterpretationService } from '@/services/interpretation.service';

describe('AdvisorService', () => {
  let service: AdvisorService;
  let redis: jest.Mocked<RedisService>;
  let aiService: jest.Mocked<AIService>;

  const mockPlanets = {
    sun: { longitude: 0 },
    moon: { longitude: 30 },
    mercury: { longitude: 60, isRetrograde: false },
    venus: { longitude: 90 },
    mars: { longitude: 120 },
    jupiter: { longitude: 150 },
    saturn: { longitude: 180 },
  };

  const mockChart = {
    data: {
      planets: mockPlanets,
      houses: {
        '1': { sign: 'Aries', cusp: 0 },
        '3': { sign: 'Gemini', cusp: 60 },
        '7': { sign: 'Libra', cusp: 180 },
        '10': { sign: 'Capricorn', cusp: 270 },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisorService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EphemerisService,
          useValue: {
            dateToJulianDay: jest.fn().mockReturnValue(2460000),
            calculatePlanets: jest.fn().mockResolvedValue(mockPlanets),
          },
        },
        {
          provide: AIService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(false),
            generateText: jest.fn(),
          },
        },
        {
          provide: ChartService,
          useValue: {
            getNatalChart: jest.fn().mockResolvedValue(mockChart),
          },
        },
        {
          provide: InterpretationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(AdvisorService);
    redis = module.get(RedisService);
    aiService = module.get(AIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds a concrete fallback answer with time window and custom note', async () => {
    const result = await service.evaluate(
      'user-1',
      {
        topic: 'contract',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote: 'подписать договор аренды',
      },
      'ru',
    );

    expect(result.verdict).toBe('good');
    expect(result.generatedBy).toBe('enhanced-rules');
    expect(result.directAnswer).toContain('Поверх натала');
    expect(result.directAnswer).toContain('подписать договор аренды');
    expect(result.explanation).toContain('Поверх натала');
    expect(result.explanation).toContain('подписать договор аренды');
    expect(result.explanation).toContain('00:00-00:59');
    expect(result.recommendations?.[0]?.text).toContain('00:00-00:59');
    expect(result.risks).toEqual([]);
    expect(result.clarifyingQuestion).toBeUndefined();
  });

  it('uses AI synthesis when available and returns the hybrid response', async () => {
    aiService.isAvailable.mockReturnValue(true);
    aiService.generateText.mockResolvedValue(
      JSON.stringify({
        directAnswer:
          'Да, для договора день рабочий: ставьте ключевой шаг на 00:00-00:59.',
        explanation:
          'Для договора это сильный день: лучшее окно 00:00-00:59, а главные драйверы сейчас Меркурий, Юпитер и Сатурн.',
        risks: ['Проверьте формулировки спорных пунктов ещё раз.'],
        clarifyingQuestion: null,
        alternativeDate: null,
        recommendations: [
          {
            text: 'Ставьте подписание на 00:00-00:59.',
            priority: 'high',
            category: 'action',
          },
          {
            text: 'Перечитайте спорные пункты перед подписью.',
            priority: 'high',
            category: 'caution',
          },
        ],
      }),
    );

    const result = await service.evaluate(
      'user-2',
      {
        topic: 'contract',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote: 'подписать договор поставки',
      },
      'ru',
    );

    expect(aiService.generateText.mock.calls.length).toBe(1);
    expect(result.generatedBy).toBe('hybrid');
    expect(result.directAnswer).toContain('ставьте ключевой шаг');
    expect(result.explanation).toContain('лучшее окно 00:00-00:59');
    expect(result.risks).toEqual([
      'Проверьте формулировки спорных пунктов ещё раз.',
    ]);
    expect(result.recommendations).toHaveLength(2);
  });

  it('returns a clarifying question for generic prompts', async () => {
    const result = await service.evaluate(
      'user-4',
      {
        topic: 'travel',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote: 'поездка',
      },
      'ru',
    );

    expect(result.clarifyingQuestion).toContain('Какой отдых');
    expect(result.explanation).toContain('Поверх натала');
    expect(result.directAnswer).toContain('поездка');
  });

  it('suggests a concrete course of action when the user shares thoughts and doubts', async () => {
    const result = await service.evaluate(
      'user-5',
      {
        topic: 'travel',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote:
          'Не знаю, ехать ли вообще на выходные. Сомневаюсь между активной поездкой и спокойным отдыхом, боюсь перегрузиться.',
      },
      'ru',
    );

    expect(result.directAnswer).toContain('Лучшее решение');
    expect(result.directAnswer).toContain('Поверх натала');
    expect(result.directAnswer).toContain('активной поездкой');
    expect(result.clarifyingQuestion).toBeUndefined();
  });

  it('includes custom note and locale in the cache key', async () => {
    await service.evaluate(
      'user-3',
      {
        topic: 'contract',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote: 'первый вариант',
      },
      'ru',
    );

    await service.evaluate(
      'user-3',
      {
        topic: 'contract',
        date: '2026-04-02',
        timezone: 'UTC',
        customNote: 'второй вариант',
      },
      'en',
    );

    expect(redis.get.mock.calls).toHaveLength(2);
    expect(redis.get.mock.calls[0]?.[0]).not.toBe(redis.get.mock.calls[1]?.[0]);
    expect(String(redis.get.mock.calls[1]?.[0])).toContain(':en:');
  });
});
