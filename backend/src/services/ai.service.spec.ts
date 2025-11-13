import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Mock environment variables
              const config = {
                OPENAI_API_KEY: 'test-openai-key',
                ANTHROPIC_API_KEY: undefined, // Test OpenAI as primary
              };
              return config[key as keyof typeof config];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get<ConfigService>(ConfigService);
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
      const moduleNoKeys = await Test.createTestingModule({
        providers: [
          AIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const serviceNoKeys = moduleNoKeys.get<AIService>(AIService);
      expect(serviceNoKeys.isAvailable()).toBe(false);
      expect(serviceNoKeys.getProvider()).toBe('none');
    });
  });

  describe('provider priority', () => {
    it('should prefer Claude over OpenAI when both keys exist', async () => {
      const moduleBothKeys = await Test.createTestingModule({
        providers: [
          AIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config = {
                  OPENAI_API_KEY: 'test-openai-key',
                  ANTHROPIC_API_KEY: 'test-anthropic-key',
                };
                return config[key as keyof typeof config];
              }),
            },
          },
        ],
      }).compile();

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
      expect(service['getAspectName']('conjunction')).toBe('в соединении с');
      expect(service['getAspectName']('opposition')).toBe('в оппозиции к');
      expect(service['getAspectName']('trine')).toBe('в тригоне к');
      expect(service['getAspectName']('square')).toBe('в квадрате к');
      expect(service['getAspectName']('sextile')).toBe('в секстиле к');
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
      expect(formatted).toContain('в тригоне к');
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

  describe('sleep utility', () => {
    it('should sleep for specified milliseconds', async () => {
      const startTime = Date.now();
      await service['sleep'](100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(150);
    });
  });
});
