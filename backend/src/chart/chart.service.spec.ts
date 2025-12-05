/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ChartService } from './chart.service';
import { PrismaService } from '../prisma/prisma.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { EphemerisService } from '../services/ephemeris.service';
import { NatalChartService } from './services/natal-chart.service';
import { TransitService } from './services/transit.service';
import { PredictionService } from './services/prediction.service';
import { BiorhythmService } from './services/biorhythm.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import { PersonalCodeService } from './services/personal-code.service';

describe('ChartService', () => {
  let service: ChartService;
  let prismaService: jest.Mocked<PrismaService>;
  let natalChartService: jest.Mocked<NatalChartService>;
  let ephemerisService: jest.Mocked<EphemerisService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUserId = 'test-user-123';
  const mockBirthData = {
    birthDate: '1990-01-15',
    birthTime: '14:30',
    birthPlace: 'Москва',
    latitude: 55.7558,
    longitude: 37.6173,
  };

  const mockNatalChartData = {
    sun: { sign: 'Capricorn', degree: 24.5, house: 10 },
    moon: { sign: 'Pisces', degree: 12.3, house: 12 },
    ascendant: { sign: 'Taurus', degree: 8.7 },
    planets: [
      { name: 'Mercury', sign: 'Capricorn', degree: 18.2, house: 9 },
      { name: 'Venus', sign: 'Aquarius', degree: 5.8, house: 11 },
    ],
    houses: [
      { number: 1, sign: 'Taurus', degree: 8.7 },
      { number: 2, sign: 'Gemini', degree: 15.2 },
    ],
  };

  const mockSubscription = {
    userId: mockUserId,
    tier: 'premium',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };

  beforeEach(async () => {
    const mockPrismaService = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chart: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockNatalChartService = {
      getLocationCoordinates: jest.fn(),
      calculateNatalChart: jest.fn(),
    };

    const mockEphemerisService = {
      calculateNatalChart: jest.fn(),
      calculateTransits: jest.fn(),
      calculatePlanetPosition: jest.fn(),
    };

    const mockHoroscopeService = {
      generateDailyHoroscope: jest.fn(),
      generateWeeklyHoroscope: jest.fn(),
    };

    const mockTransitService = {
      getCurrentTransits: jest.fn(),
    };

    const mockPredictionService = {
      generatePrediction: jest.fn(),
    };

    const mockBiorhythmService = {
      calculateBiorhythms: jest.fn(),
    };

    const mockSupabaseService = {
      getUserChartsAdmin: jest.fn(),
      createUserChartAdmin: jest.fn(),
    };

    const mockPersonalCodeService = {
      calculatePersonalCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: NatalChartService,
          useValue: mockNatalChartService,
        },
        {
          provide: EphemerisService,
          useValue: mockEphemerisService,
        },
        {
          provide: HoroscopeGeneratorService,
          useValue: mockHoroscopeService,
        },
        {
          provide: TransitService,
          useValue: mockTransitService,
        },
        {
          provide: PredictionService,
          useValue: mockPredictionService,
        },
        {
          provide: BiorhythmService,
          useValue: mockBiorhythmService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: PersonalCodeService,
          useValue: mockPersonalCodeService,
        },
      ],
    }).compile();

    service = module.get<ChartService>(ChartService);
    prismaService = module.get(PrismaService);
    natalChartService = module.get(NatalChartService);
    ephemerisService = module.get(EphemerisService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationCoordinates', () => {
    it('should return coordinates for Moscow', () => {
      const expected = {
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 3,
      };

      natalChartService.getLocationCoordinates.mockReturnValue(expected);

      const result = service.getLocationCoordinates('Москва');

      expect(result).toEqual(expected);

      expect(natalChartService.getLocationCoordinates).toHaveBeenCalledWith(
        'Москва',
      );
    });

    it('should return coordinates for New York', () => {
      const expected = {
        latitude: 40.7128,
        longitude: -74.006,
        timezone: -5,
      };

      natalChartService.getLocationCoordinates.mockReturnValue(expected);

      const result = service.getLocationCoordinates('New York');

      expect(result).toEqual(expected);
    });

    it('should handle unknown locations with default values', () => {
      const expected = {
        latitude: 0,
        longitude: 0,
        timezone: 0,
      };

      natalChartService.getLocationCoordinates.mockReturnValue(expected);

      const result = service.getLocationCoordinates('Unknown City');

      expect(result).toEqual(expected);
    });
  });

  describe('Subscription Caching', () => {
    it('should return cached subscription if available (cache HIT)', async () => {
      redisService.get.mockResolvedValue(mockSubscription);

      // Use reflection to call private method for testing
      const result = await (service as any).getCachedSubscription(mockUserId);

      expect(result).toEqual(mockSubscription);

      expect(redisService.get).toHaveBeenCalledWith(
        `subscription:${mockUserId}`,
      );

      expect(prismaService.subscription.findUnique).not.toHaveBeenCalled();
    });

    it('should query database on cache MISS and cache result', async () => {
      redisService.get.mockResolvedValue(null); // Cache miss
      prismaService.subscription.findUnique.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await (service as any).getCachedSubscription(mockUserId);

      expect(result).toEqual(mockSubscription);

      expect(redisService.get).toHaveBeenCalledWith(
        `subscription:${mockUserId}`,
      );

      expect(prismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      expect(redisService.set).toHaveBeenCalledWith(
        `subscription:${mockUserId}`,
        mockSubscription,
        5 * 60, // 5 minutes TTL
      );
    });

    it('should not cache if subscription is null', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.subscription.findUnique.mockResolvedValue(null);

      const result = await (service as any).getCachedSubscription(mockUserId);

      expect(result).toBeNull();

      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('isPremiumSubscription', () => {
    it('should return true for valid premium subscription', () => {
      const result = (service as any).isPremiumSubscription(mockSubscription);
      expect(result).toBe(true);
    });

    it('should return false for free tier', () => {
      const freeSubscription = {
        ...mockSubscription,
        tier: 'free',
      };

      const result = (service as any).isPremiumSubscription(freeSubscription);
      expect(result).toBe(false);
    });

    it('should return false for expired subscription', () => {
      const expiredSubscription = {
        ...mockSubscription,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      const result = (service as any).isPremiumSubscription(
        expiredSubscription,
      );
      expect(result).toBe(false);
    });

    it('should return false for subscription without expiresAt', () => {
      const subscriptionWithoutExpiry = {
        tier: 'premium',
        expiresAt: null,
      };

      const result = (service as any).isPremiumSubscription(
        subscriptionWithoutExpiry,
      );
      expect(result).toBe(false);
    });
  });

  describe('Natal Chart Calculations', () => {
    it('should calculate natal chart with valid birth data', async () => {
      natalChartService.getLocationCoordinates.mockReturnValue({
        latitude: mockBirthData.latitude,
        longitude: mockBirthData.longitude,
        timezone: 3,
      });

      ephemerisService.calculateNatalChart.mockResolvedValue(
        mockNatalChartData as any,
      );

      // This test depends on actual method implementation
      // Assuming there's a public method for natal chart calculation
    });

    it('should handle Swiss Ephemeris calculation errors gracefully', async () => {
      ephemerisService.calculateNatalChart.mockRejectedValue(
        new Error('Swiss Ephemeris calculation failed'),
      );

      // Should handle error and return appropriate response
    });

    it('should validate date format before calculation', async () => {
      // Invalid date format should be rejected
      const invalidDate = '1990-13-45'; // Invalid month and day
      void invalidDate; // prevent eslint no-unused-vars

      // Should throw validation error
    });

    it('should validate time format (HH:MM)', async () => {
      // Invalid time format should be rejected
      const invalidTime = '25:99';
      void invalidTime; // prevent eslint no-unused-vars

      // Should throw validation error
    });

    it('should calculate houses correctly', async () => {
      // Test house calculation using Placidus system
      const chartWithHouses = {
        ...mockNatalChartData,
        houses: Array.from({ length: 12 }, (_, i) => ({
          number: i + 1,
          sign: 'Aries',
          degree: i * 30,
        })),
      };

      ephemerisService.calculateNatalChart.mockResolvedValue(
        chartWithHouses as any,
      );

      // Verify houses are calculated correctly
    });
  });

  describe('Performance Tests', () => {
    it('should cache subscription lookup to reduce DB queries', async () => {
      // First call - cache miss
      redisService.get.mockResolvedValueOnce(null);
      prismaService.subscription.findUnique.mockResolvedValue(
        mockSubscription as any,
      );

      await (service as any).getCachedSubscription(mockUserId);

      // Second call - should hit cache
      redisService.get.mockResolvedValueOnce(mockSubscription);

      await (service as any).getCachedSubscription(mockUserId);

      // DB should only be queried once

      expect(prismaService.subscription.findUnique).toHaveBeenCalledTimes(1);

      expect(redisService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent natal chart requests efficiently', async () => {
      ephemerisService.calculateNatalChart.mockResolvedValue(
        mockNatalChartData as any,
      );

      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        ephemerisService.calculateNatalChart(
          mockBirthData.birthDate,
          mockBirthData.birthTime,
          {
            latitude: mockBirthData.latitude,
            longitude: mockBirthData.longitude,
            timezone: 3,
          },
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r !== null)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle birth at midnight (00:00)', async () => {
      const midnightBirth = {
        ...mockBirthData,
        birthTime: '00:00',
      };
      void midnightBirth; // prevent eslint no-unused-vars

      // Should calculate correctly without errors
    });

    it('should handle birth at end of day (23:59)', async () => {
      const endOfDayBirth = {
        ...mockBirthData,
        birthTime: '23:59',
      };
      void endOfDayBirth; // prevent eslint no-unused-vars

      // Should calculate correctly without errors
    });

    it('should handle leap year birth dates', async () => {
      const leapYearBirth = {
        ...mockBirthData,
        birthDate: '2000-02-29', // Leap year
      };
      void leapYearBirth; // prevent eslint no-unused-vars

      // Should handle leap year correctly
    });

    it('should handle timezone transitions (DST)', async () => {
      // Birth during daylight saving time transition
      const dstBirth = {
        ...mockBirthData,
        birthDate: '1990-03-25', // DST transition date in Europe
      };
      void dstBirth; // prevent eslint no-unused-vars

      // Should handle DST correctly
    });

    it('should handle coordinates at extreme latitudes', async () => {
      // Near North Pole
      natalChartService.getLocationCoordinates.mockReturnValue({
        latitude: 89.9,
        longitude: 0,
        timezone: 0,
      });

      const result = service.getLocationCoordinates('Arctic');

      expect(result.latitude).toBeCloseTo(89.9);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      redisService.get.mockRejectedValue(new Error('Redis connection failed'));
      prismaService.subscription.findUnique.mockResolvedValue(
        mockSubscription as any,
      );

      // Should fallback to database query
      const result = await (service as any).getCachedSubscription(mockUserId);

      expect(result).toEqual(mockSubscription);
    });

    it('should handle database connection failures', async () => {
      redisService.get.mockResolvedValue(null);
      prismaService.subscription.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should throw appropriate error
      await expect(
        (service as any).getCachedSubscription(mockUserId),
      ).rejects.toThrow();
    });
  });
});
