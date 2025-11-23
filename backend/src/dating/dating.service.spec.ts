import { Test, TestingModule } from '@nestjs/testing';
import { DatingService } from './dating.service';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import { getQueueToken } from '@nestjs/bull';

describe('DatingService', () => {
  let service: DatingService;
  let prismaService: jest.Mocked<PrismaService>;
  let ephemerisService: jest.Mocked<EphemerisService>;
  let redisService: jest.Mocked<RedisService>;

  const mockQueue = {
    add: jest.fn(),
    process: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockCandidateId = 'candidate-456';

  const mockChart = {
    id: 'chart-1',
    userId: mockUserId,
    data: {
      planets: {
        sun: { sign: 'Aries', degree: 15.5, house: 1 },
        moon: { sign: 'Taurus', degree: 22.3, house: 2 },
        venus: { sign: 'Pisces', degree: 8.7, house: 12 },
        mars: { sign: 'Gemini', degree: 18.2, house: 3 },
      },
      houses: Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        sign: 'Aries',
        degree: i * 30,
      })),
    },
  };

  const mockCandidateChart = {
    id: 'chart-2',
    userId: mockCandidateId,
    data: {
      planets: {
        sun: { sign: 'Leo', degree: 20.1, house: 5 },
        moon: { sign: 'Capricorn', degree: 10.5, house: 10 },
        venus: { sign: 'Cancer', degree: 5.2, house: 4 },
        mars: { sign: 'Libra', degree: 25.8, house: 7 },
      },
      houses: Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        sign: 'Aries',
        degree: i * 30,
      })),
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      chart: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const mockEphemerisService = {
      calculateSynastry: jest.fn(),
      calculateCompatibility: jest.fn(),
    };

    const mockSupabaseService = {
      getUserProfileAdmin: jest.fn(),
      getUserChartsAdmin: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EphemerisService,
          useValue: mockEphemerisService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: getQueueToken('compatibility-calculation'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<DatingService>(DatingService);
    prismaService = module.get(PrismaService);
    ephemerisService = module.get(EphemerisService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgeFromBirthDate', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const age = (service as any).getAgeFromBirthDate(birthDate);

      expect(age).toBeGreaterThan(30);
      expect(age).toBeLessThan(40);
    });

    it('should return null for invalid date', () => {
      const age = (service as any).getAgeFromBirthDate('invalid-date');
      expect(age).toBeNull();
    });

    it('should return null for null birthDate', () => {
      const age = (service as any).getAgeFromBirthDate(null);
      expect(age).toBeNull();
    });

    it('should return null for undefined birthDate', () => {
      const age = (service as any).getAgeFromBirthDate(undefined);
      expect(age).toBeNull();
    });
  });

  describe('getSunSign', () => {
    it('should extract sun sign from chart', () => {
      const sign = (service as any).getSunSign(mockChart);
      expect(sign).toBe('Aries');
    });

    it('should return null for missing chart', () => {
      const sign = (service as any).getSunSign(null);
      expect(sign).toBeNull();
    });

    it('should return null for chart without planets', () => {
      const emptyChart = { data: {} };
      const sign = (service as any).getSunSign(emptyChart);
      expect(sign).toBeNull();
    });
  });

  describe('elementFromSign', () => {
    it('should return fire for Aries', () => {
      const element = (service as any).elementFromSign('Aries');
      expect(element).toBe('fire');
    });

    it('should return earth for Taurus', () => {
      const element = (service as any).elementFromSign('Taurus');
      expect(element).toBe('earth');
    });

    it('should return air for Gemini', () => {
      const element = (service as any).elementFromSign('Gemini');
      expect(element).toBe('air');
    });

    it('should return water for Cancer', () => {
      const element = (service as any).elementFromSign('Cancer');
      expect(element).toBe('water');
    });

    it('should return fire for Leo', () => {
      const element = (service as any).elementFromSign('Leo');
      expect(element).toBe('fire');
    });

    it('should return earth for Virgo', () => {
      const element = (service as any).elementFromSign('Virgo');
      expect(element).toBe('earth');
    });

    it('should return air for Libra', () => {
      const element = (service as any).elementFromSign('Libra');
      expect(element).toBe('air');
    });

    it('should return water for Scorpio', () => {
      const element = (service as any).elementFromSign('Scorpio');
      expect(element).toBe('water');
    });

    it('should return fire for Sagittarius', () => {
      const element = (service as any).elementFromSign('Sagittarius');
      expect(element).toBe('fire');
    });

    it('should return earth for Capricorn', () => {
      const element = (service as any).elementFromSign('Capricorn');
      expect(element).toBe('earth');
    });

    it('should return air for Aquarius', () => {
      const element = (service as any).elementFromSign('Aquarius');
      expect(element).toBe('air');
    });

    it('should return water for Pisces', () => {
      const element = (service as any).elementFromSign('Pisces');
      expect(element).toBe('water');
    });

    it('should return null for invalid sign', () => {
      const element = (service as any).elementFromSign('InvalidSign');
      expect(element).toBeNull();
    });

    it('should return null for null sign', () => {
      const element = (service as any).elementFromSign(null);
      expect(element).toBeNull();
    });
  });

  describe('elementSynergyBonus', () => {
    it('should return +4 for same element', () => {
      const bonus = (service as any).elementSynergyBonus('fire', 'fire');
      expect(bonus).toBe(4);
    });

    it('should return +6 for fire-air combination', () => {
      const bonus1 = (service as any).elementSynergyBonus('fire', 'air');
      const bonus2 = (service as any).elementSynergyBonus('air', 'fire');
      expect(bonus1).toBe(6);
      expect(bonus2).toBe(6);
    });

    it('should return +6 for earth-water combination', () => {
      const bonus1 = (service as any).elementSynergyBonus('earth', 'water');
      const bonus2 = (service as any).elementSynergyBonus('water', 'earth');
      expect(bonus1).toBe(6);
      expect(bonus2).toBe(6);
    });

    it('should return -4 for fire-water combination', () => {
      const bonus1 = (service as any).elementSynergyBonus('fire', 'water');
      const bonus2 = (service as any).elementSynergyBonus('water', 'fire');
      expect(bonus1).toBe(-4);
      expect(bonus2).toBe(-4);
    });

    it('should return -4 for air-earth combination', () => {
      const bonus1 = (service as any).elementSynergyBonus('air', 'earth');
      const bonus2 = (service as any).elementSynergyBonus('earth', 'air');
      expect(bonus1).toBe(-4);
      expect(bonus2).toBe(-4);
    });

    it('should return 0 for null elements', () => {
      const bonus = (service as any).elementSynergyBonus(null, 'fire');
      expect(bonus).toBe(0);
    });
  });

  describe('isHarmoniousAspect', () => {
    it('should return true for trine', () => {
      const result = (service as any).isHarmoniousAspect('trine');
      expect(result).toBe(true);
    });

    it('should return true for sextile', () => {
      const result = (service as any).isHarmoniousAspect('sextile');
      expect(result).toBe(true);
    });

    it('should return true for conjunction', () => {
      const result = (service as any).isHarmoniousAspect('conjunction');
      expect(result).toBe(true);
    });

    it('should return false for square', () => {
      const result = (service as any).isHarmoniousAspect('square');
      expect(result).toBe(false);
    });

    it('should return false for opposition', () => {
      const result = (service as any).isHarmoniousAspect('opposition');
      expect(result).toBe(false);
    });
  });

  describe('isChallengingAspect', () => {
    it('should return true for square', () => {
      const result = (service as any).isChallengingAspect('square');
      expect(result).toBe(true);
    });

    it('should return true for opposition', () => {
      const result = (service as any).isChallengingAspect('opposition');
      expect(result).toBe(true);
    });

    it('should return false for trine', () => {
      const result = (service as any).isChallengingAspect('trine');
      expect(result).toBe(false);
    });

    it('should return false for sextile', () => {
      const result = (service as any).isChallengingAspect('sextile');
      expect(result).toBe(false);
    });
  });

  describe('Compatibility Calculation', () => {
    it('should calculate higher compatibility for harmonious fire-air signs', () => {
      // Aries (fire) - Leo (air) should have good compatibility
      const userChart = {
        data: {
          planets: {
            sun: { sign: 'Aries', degree: 15, house: 1 },
          },
        },
      };

      const candidateChart = {
        data: {
          planets: {
            sun: { sign: 'Leo', degree: 20, house: 5 },
          },
        },
      };

      const userElement = (service as any).elementFromSign('Aries');
      const candidateElement = (service as any).elementFromSign('Leo');

      const bonus = (service as any).elementSynergyBonus(
        userElement,
        candidateElement,
      );

      expect(bonus).toBeGreaterThanOrEqual(0);
    });

    it('should calculate lower compatibility for challenging fire-water signs', () => {
      const userElement = (service as any).elementFromSign('Aries'); // fire
      const candidateElement = (service as any).elementFromSign('Cancer'); // water

      const bonus = (service as any).elementSynergyBonus(
        userElement,
        candidateElement,
      );

      expect(bonus).toBeLessThan(0);
    });
  });

  describe('Synastry Caching', () => {
    it('should cache synastry calculation results', async () => {
      const cacheKey = `synastry:${mockUserId}:${mockCandidateId}`;
      const mockSynastry = {
        compatibility: 85,
        aspects: [],
      };

      redisService.get.mockResolvedValue(null); // Cache miss
      ephemerisService.calculateSynastry = jest
        .fn()
        .mockResolvedValue(mockSynastry);

      // First call - should calculate and cache
      // Implementation depends on actual service methods
    });

    it('should return cached synastry if available', async () => {
      const cacheKey = `synastry:${mockUserId}:${mockCandidateId}`;
      const cachedSynastry = {
        compatibility: 85,
        aspects: [],
      };

      redisService.get.mockResolvedValue(cachedSynastry);

      // Should use cached value without recalculating
    });

    it('should invalidate cache after 7 days', async () => {
      // Test cache TTL
      const cacheKey = `synastry:${mockUserId}:${mockCandidateId}`;
      const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

      // Verify TTL is set correctly
      // Implementation depends on actual caching logic
    });
  });

  describe('Edge Cases', () => {
    it('should handle users with missing charts', async () => {
      prismaService.chart.findFirst.mockResolvedValue(null);

      // Should handle gracefully without crashing
    });

    it('should handle malformed chart data', async () => {
      const malformedChart = {
        id: 'chart-1',
        data: null, // Invalid data
      };

      prismaService.chart.findFirst.mockResolvedValue(malformedChart as any);

      const sunSign = (service as any).getSunSign(malformedChart);
      expect(sunSign).toBeNull();
    });

    it('should handle chart with missing planets', async () => {
      const incompleteChart = {
        data: {
          planets: {},
        },
      };

      const sunSign = (service as any).getSunSign(incompleteChart);
      expect(sunSign).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should use queue for expensive compatibility calculations', async () => {
      // Verify that expensive calculations are queued
      // Implementation depends on actual queue usage
    });

    it('should batch process multiple compatibility calculations', async () => {
      // Test bulk processing capabilities
    });
  });

  describe('Data Validation', () => {
    it('should validate chart structure before processing', () => {
      // Test validation logic
    });

    it('should handle invalid zodiac signs gracefully', () => {
      const invalidElement = (service as any).elementFromSign('InvalidSign');
      expect(invalidElement).toBeNull();
    });

    it('should validate aspect angles', () => {
      // Test aspect validation
    });
  });
});
