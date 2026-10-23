import { Test } from '@nestjs/testing';
import type { Prisma, Subscription } from '@prisma/client';
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

function createPrismaMock() {
  return {
    subscription: {
      findUnique: jest.fn<
        Promise<Subscription | null>,
        [Prisma.SubscriptionFindUniqueArgs]
      >(),
    },
  };
}

function createNatalMock() {
  return {
    getLocationCoordinates: jest.fn(),
    createNatalChart: jest.fn(),
    createNatalChartWithInterpretation: jest.fn(),
    getNatalChart: jest.fn(),
    getChartInterpretation: jest.fn(),
    forceRecalculateNatalChart: jest.fn(),
  };
}

function createRedisMock() {
  return { get: jest.fn(), set: jest.fn(), del: jest.fn() };
}

describe('ChartService facade', () => {
  let service: ChartService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let natal: ReturnType<typeof createNatalMock>;
  let redis: ReturnType<typeof createRedisMock>;
  const userId = 'test-user-123';
  const now = new Date('2026-10-14T00:00:00Z');
  const subscription: Subscription = {
    id: 'subscription-1',
    userId,
    tier: 'premium',
    expiresAt: new Date('2026-11-14T00:00:00Z'),
    trialEndsAt: null,
    isCancelled: false,
    createdAt: now,
    updatedAt: now,
  };
  const birthData = {
    birthDate: '1990-01-15',
    birthTime: '14:30',
    birthPlace: 'Москва',
  };
  const chart = { id: 'chart-1', userId, data: { sun: { sign: 'Capricorn' } } };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    prisma = createPrismaMock();
    natal = createNatalMock();
    redis = createRedisMock();
    const module = await Test.createTestingModule({
      providers: [
        ChartService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: NatalChartService, useValue: natal },
        { provide: EphemerisService, useValue: {} },
        { provide: HoroscopeGeneratorService, useValue: {} },
        { provide: TransitService, useValue: {} },
        { provide: PredictionService, useValue: {} },
        { provide: BiorhythmService, useValue: {} },
        { provide: SupabaseService, useValue: {} },
        { provide: PersonalCodeService, useValue: {} },
      ],
    }).compile();
    service = module.get(ChartService);
  });

  afterEach(() => jest.useRealTimers());

  describe('getLocationCoordinates', () => {
    it.each([
      ['Москва', 55.7558, 37.6173, 3],
      ['New York', 40.7128, -74.006, -5],
      ['Unknown City', 0, 0, 0],
      ['Arctic', 89.9, 0, 0],
    ])(
      'passes %s to the location service',
      (place, latitude, longitude, timezone) => {
        const coordinates = { latitude, longitude, timezone };
        natal.getLocationCoordinates.mockReturnValue(coordinates);

        expect(service.getLocationCoordinates(place)).toEqual(coordinates);
        expect(natal.getLocationCoordinates).toHaveBeenCalledWith(place);
      },
    );
  });

  describe('Subscription caching', () => {
    it('returns a cached subscription without a database query', async () => {
      redis.get.mockResolvedValue(subscription);

      await expect(service['getCachedSubscription'](userId)).resolves.toEqual(
        subscription,
      );
      expect(redis.get).toHaveBeenCalledWith(`subscription:record:${userId}`);
      expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    });

    it('queries the database on a miss and caches for five minutes', async () => {
      redis.get.mockResolvedValue(null);
      prisma.subscription.findUnique.mockResolvedValue(subscription);

      await expect(service['getCachedSubscription'](userId)).resolves.toEqual(
        subscription,
      );
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(redis.set).toHaveBeenCalledWith(
        `subscription:record:${userId}`,
        subscription,
        300,
      );
    });

    it('does not cache a missing subscription', async () => {
      redis.get.mockResolvedValue(null);
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service['getCachedSubscription'](userId),
      ).resolves.toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('uses the cached record for subsequent lookups', async () => {
      redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(subscription);
      prisma.subscription.findUnique.mockResolvedValue(subscription);

      await service['getCachedSubscription'](userId);
      await service['getCachedSubscription'](userId);

      expect(prisma.subscription.findUnique).toHaveBeenCalledTimes(1);
      expect(redis.get).toHaveBeenCalledTimes(2);
    });

    it('propagates database failures without caching a result', async () => {
      redis.get.mockResolvedValue(null);
      prisma.subscription.findUnique.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(service['getCachedSubscription'](userId)).rejects.toThrow(
        'Database unavailable',
      );
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('Premium access', () => {
    it('accepts active paid access', () => {
      expect(service['isPremiumSubscription'](subscription)).toBe(true);
    });

    it('accepts an active trial without a paid expiry', () => {
      expect(
        service['isPremiumSubscription']({
          ...subscription,
          expiresAt: null,
          trialEndsAt: new Date('2026-10-21T00:00:00Z'),
        }),
      ).toBe(true);
    });

    it.each([
      null,
      { ...subscription, tier: 'free' },
      { ...subscription, expiresAt: new Date('2026-10-13T00:00:00Z') },
      { ...subscription, expiresAt: now },
      { ...subscription, expiresAt: null },
    ])('rejects missing, free, or expired access (%#)', (record) => {
      expect(service['isPremiumSubscription'](record)).toBe(false);
    });
  });

  describe('Natal service delegation', () => {
    it('creates a chart with the original birth data and locale', async () => {
      natal.createNatalChart.mockResolvedValue(chart);

      await expect(
        service.createNatalChart(userId, birthData, 'es'),
      ).resolves.toEqual(chart);
      expect(natal.createNatalChart).toHaveBeenCalledWith(
        userId,
        birthData,
        'es',
      );
    });

    it('delegates chart creation with interpretation', async () => {
      natal.createNatalChartWithInterpretation.mockResolvedValue(chart);

      await expect(
        service.createNatalChartWithInterpretation(
          userId,
          birthData.birthDate,
          birthData.birthTime,
          birthData.birthPlace,
        ),
      ).resolves.toEqual(chart);
      expect(natal.createNatalChartWithInterpretation).toHaveBeenCalledWith(
        userId,
        birthData.birthDate,
        birthData.birthTime,
        birthData.birthPlace,
      );
    });

    it.each([
      ['1990-01-15', '00:00'],
      ['1990-01-15', '23:59'],
      ['2000-02-29', '12:00'],
      ['1990-03-25', '02:30'],
    ])(
      'preserves birth date %s and time %s for the calculation service',
      async (birthDate, birthTime) => {
        const data = { ...birthData, birthDate, birthTime };
        natal.createNatalChart.mockResolvedValue(chart);

        await service.createNatalChart(userId, data);

        expect(natal.createNatalChart).toHaveBeenCalledWith(userId, data, 'ru');
      },
    );

    it('propagates calculation errors rather than returning a fabricated chart', async () => {
      natal.createNatalChart.mockRejectedValue(
        new Error('Swiss Ephemeris calculation failed'),
      );

      await expect(service.createNatalChart(userId, birthData)).rejects.toThrow(
        'Swiss Ephemeris calculation failed',
      );
    });

    it('returns the stored chart through the natal service', async () => {
      natal.getNatalChart.mockResolvedValue(chart);

      await expect(service.getNatalChart(userId)).resolves.toEqual(chart);
      expect(natal.getNatalChart).toHaveBeenCalledWith(userId);
    });

    it('passes the requested interpretation locale', async () => {
      natal.getChartInterpretation.mockResolvedValue({
        interpretation: 'test',
      });

      await expect(
        service.getChartInterpretation(userId, 'en'),
      ).resolves.toEqual({ interpretation: 'test' });
      expect(natal.getChartInterpretation).toHaveBeenCalledWith(userId, 'en');
    });

    it('passes an explicit recalculation request to the natal service', async () => {
      natal.forceRecalculateNatalChart.mockResolvedValue(chart);

      await expect(
        service.forceRecalculateNatalChart(userId, 'es'),
      ).resolves.toEqual(chart);
      expect(natal.forceRecalculateNatalChart).toHaveBeenCalledWith(
        userId,
        'es',
      );
    });
  });
});
