import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { ClaudeProvider } from './ai/providers/claude.provider';
import { OpenAIProvider } from './ai/providers/openai.provider';
import { DeepSeekProvider } from './ai/providers/deepseek.provider';

const createProviderMock = (isAvailable: boolean) => ({
  isAvailable: jest.fn(() => isAvailable),
  generateHoroscope: jest.fn(),
  generateInterpretation: jest.fn(),
  getProviderInfo: jest.fn(() => ({ provider: 'mock', model: 'mock-model' })),
});

const createModule = async ({
  claude = false,
  openai = true,
  deepseek = false,
  preference = 'auto',
}: {
  claude?: boolean;
  openai?: boolean;
  deepseek?: boolean;
  preference?: string;
}) =>
  Test.createTestingModule({
    providers: [
      AIService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            if (key === 'AI_PROVIDER_PREFERENCE') return preference;
            return undefined;
          }),
        },
      },
      {
        provide: ClaudeProvider,
        useValue: createProviderMock(claude),
      },
      {
        provide: OpenAIProvider,
        useValue: createProviderMock(openai),
      },
      {
        provide: DeepSeekProvider,
        useValue: createProviderMock(deepseek),
      },
    ],
  }).compile();

describe('AIService', () => {
  let service: AIService;

  beforeEach(async () => {
    const module: TestingModule = await createModule({});

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize OpenAI when key is provided', () => {
      expect(service.isAvailable()).toBe(true);
      expect(service.getProvider()).toBe('openai');
    });

    it('should set provider to "none" when no keys provided', async () => {
      const moduleNoKeys = await createModule({
        claude: false,
        openai: false,
        deepseek: false,
      });

      const serviceNoKeys = moduleNoKeys.get<AIService>(AIService);
      expect(serviceNoKeys.isAvailable()).toBe(false);
      expect(serviceNoKeys.getProvider()).toBe('none');
    });
  });

  describe('provider priority', () => {
    it('should prefer Claude over OpenAI when both keys exist', async () => {
      const moduleBothKeys = await createModule({
        claude: true,
        openai: true,
      });

      const serviceBothKeys = moduleBothKeys.get<AIService>(AIService);
      expect(serviceBothKeys.getProvider()).toBe('claude');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', () => {
      const validJSON = JSON.stringify({
        general: 'Test general',
        love: 'Test love',
        career: 'Test career',
        health: 'Test health',
        finance: 'Test finance',
        advice: 'Test advice',
        challenges: ['challenge1', 'challenge2', 'challenge3'],
        opportunities: ['opportunity1', 'opportunity2', 'opportunity3'],
      });

      const result = service['parseAIResponse'](validJSON);

      expect(result).toHaveProperty('general', 'Test general');
      expect(result).toHaveProperty('love', 'Test love');
      expect(result.challenges).toHaveLength(3);
      expect(result.opportunities).toHaveLength(3);
    });

    it('should normalize nested objects and strip field labels', () => {
      const structuredJSON = JSON.stringify({
        general: {
          summary:
            'Today asks you to slow down, listen carefully, and stop reacting on autopilot.',
          focus:
            'The bigger story is emotional clarity: once you stop rushing, the whole day becomes easier to read.',
        },
        love: 'Love: Honest conversations go better when you drop the need to control the outcome.',
        career: {
          text: 'Career rewards steady follow-through more than dramatic moves.',
        },
        health: {
          description:
            'Health improves when you protect your sleep and stop carrying stress into the evening.',
        },
        finance:
          '"finance": "Money is better handled conservatively today; avoid impulsive purchases."',
        advice: {
          message:
            'Advice: Focus on one real priority and let the rest wait until your mind settles.',
        },
        challenges: [
          { text: 'Overcommitting yourself just to calm other people down.' },
          'Reacting too quickly before the situation fully unfolds.',
        ],
        opportunities: [
          { summary: 'Return to a conversation that deserves more honesty.' },
          'Finish the task that has been draining background energy all week.',
        ],
      });

      const result = service['parseAIResponse'](structuredJSON, 'en');

      expect(result.general).toContain('Today asks you to slow down');
      expect(result.general).not.toMatch(/\bsummary\b|\bfocus\b/i);
      expect(result.love).not.toMatch(/^love\s*:/i);
      expect(result.finance).toBe(
        'Money is better handled conservatively today; avoid impulsive purchases.',
      );
      expect(result.advice).not.toMatch(/^advice\s*:/i);
      expect(result.challenges).toContain(
        'Overcommitting yourself just to calm other people down.',
      );
      expect(result.opportunities).toContain(
        'Return to a conversation that deserves more honesty.',
      );
    });

    it('should handle JSON parsing errors gracefully', () => {
      const invalidJSON = 'This is not JSON';

      const result = service['parseAIResponse'](invalidJSON);

      // Should fallback to text parsing
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should recover complete fields from truncated JSON', () => {
      const truncatedJSON = `{
        "general": "This week asks for calmer pacing and better boundaries around your attention.",
        "love": "In relationships, honesty works better than trying to smooth everything over too quickly.",
        "career": "Work becomes easier when you narrow the scope and finish what is already in motion.",
        "health": "Energy improves when you reduce background stress and protect your sleep rhythm.",
        "finance": "Money is steadier when you delay impulse decisions and review the small leaks first.",
        "advice": "Pick one clear priority and let the rest wait until your head is clearer`;
      const result = service['parseAIResponse'](truncatedJSON, 'en');

      expect(result.general).toContain(
        'This week asks for calmer pacing and better boundaries around your attention.',
      );
      expect(result.love).toContain(
        'In relationships, honesty works better than trying to smooth everything over too quickly.',
      );
      expect(result.career).toContain(
        'Work becomes easier when you narrow the scope and finish what is already in motion.',
      );
      expect(result.advice).toContain(
        'Pick one clear priority and let the rest wait until your head is clearer',
      );
    });

    it('should clean labeled text fallback into readable prose', () => {
      const rawText = `General: This day is less about speed and more about emotional calibration. Once you stop pushing, you begin to notice which conversations and tasks really matter.
Love: In relationships, warmth works better than pressure today.
Career: Work improves when you finish one clear priority instead of scattering yourself.
Health: Your body needs a steadier rhythm and fewer stress spikes.
Finance: Keep spending simple and avoid emotional purchases.
Advice: Slow the pace, name what matters, and act from clarity.`;

      const result = service['parseAIResponse'](rawText, 'en');

      expect(result.general).toContain(
        'This day is less about speed and more about emotional calibration.',
      );
      expect(result.general).not.toMatch(/^general\s*:/i);
      expect(result.love).toBe(
        'In relationships, warmth works better than pressure today.',
      );
      expect(result.career).toBe(
        'Work improves when you finish one clear priority instead of scattering yourself.',
      );
      expect(result.advice).not.toMatch(/^advice\s*:/i);
    });
  });

  describe('helper methods', () => {
    it('should translate planet names correctly', () => {
      expect(service['getPlanetName']('sun')).toBe('Солнце');
      expect(service['getPlanetName']('moon')).toBe('Луна');
      expect(service['getPlanetName']('mercury')).toBe('Меркурий');
      expect(service['getPlanetName']('venus')).toBe('Венера');
      expect(service['getPlanetName']('mars')).toBe('Марс');
      expect(service['getPlanetName']('unknown')).toBe('unknown');
    });

    it('should translate aspect names correctly', () => {
      expect(service['getAspectName']('conjunction')).toBe('соединение с');
      expect(service['getAspectName']('opposition')).toBe('оппозиция к');
      expect(service['getAspectName']('trine')).toBe('трин к');
      expect(service['getAspectName']('square')).toBe('квадрат к');
      expect(service['getAspectName']('sextile')).toBe('секстиль к');
    });

    it('should format transits correctly', () => {
      const transits = [
        {
          transitPlanet: 'mars',
          aspect: 'trine',
          natalPlanet: 'venus',
          strength: 0.85,
        },
        {
          transitPlanet: 'jupiter',
          aspect: 'conjunction',
          natalPlanet: 'sun',
          strength: 0.92,
        },
      ];

      const formatted = service['formatTransits'](transits);

      expect(formatted).toContain('Марс');
      expect(formatted).toContain('трин к');
      expect(formatted).toContain('Венера');
      expect(formatted).toContain('85%');
    });

    it('should handle empty transits array', () => {
      const formatted = service['formatTransits']([]);
      expect(formatted).toBe('Нет значимых транзитов');
    });
  });

  describe('buildHoroscopePrompt', () => {
    it('should build correct prompt for day period', () => {
      const context = {
        sunSign: 'Овен',
        moonSign: 'Лев',
        ascendant: 'Стрелец',
        planets: {},
        houses: {},
        aspects: [],
        transits: [],
        period: 'day' as const,
      };

      const prompt = service['buildHoroscopePrompt'](context);

      expect(prompt).toContain('на сегодня');
      expect(prompt).toContain('Солнце: Овен');
      expect(prompt).toContain('Луна: Лев');
      expect(prompt).toContain('Асцендент: Стрелец');
      expect(prompt).toContain('КРИТИЧЕСКИ ВАЖНО');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('что стоит делать');
      expect(prompt).toContain('чего лучше избегать');
      expect(prompt).toContain('Поле "general" должно быть цельным резюме');
    });

    it('should build correct prompt for week period', () => {
      const context = {
        sunSign: 'Телец',
        moonSign: 'Рак',
        ascendant: 'Дева',
        planets: {},
        houses: {},
        aspects: [],
        transits: [],
        period: 'week' as const,
      };

      const prompt = service['buildHoroscopePrompt'](context);

      expect(prompt).toContain('на эту неделю');
    });
  });
});
