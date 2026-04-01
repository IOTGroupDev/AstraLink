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

    it('should handle JSON parsing errors gracefully', () => {
      const invalidJSON = 'This is not JSON';

      const result = service['parseAIResponse'](invalidJSON);

      // Should fallback to text parsing
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
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
