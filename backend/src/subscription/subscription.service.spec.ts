import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, Subscription } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { NatalChartService } from '../chart/services';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { RedisService } from '../redis/redis.service';
import { FEATURE_MATRIX, SubscriptionTier, TRIAL_CONFIG } from '../types';

function createPrismaMock() {
  return {
    public_users: {
      findUnique: jest
        .fn<
          Promise<{ id: string } | null>,
          [Prisma.public_usersFindUniqueArgs]
        >()
        .mockResolvedValue({ id: 'test-user-123' }),
    },
    subscription: {
      findUnique: jest.fn<
        Promise<Subscription | null>,
        [Prisma.SubscriptionFindUniqueArgs]
      >(),
      upsert: jest.fn<Promise<Subscription>, [Prisma.SubscriptionUpsertArgs]>(),
      update: jest.fn<Promise<Subscription>, [Prisma.SubscriptionUpdateArgs]>(),
    },
  };
}

function createRedisMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    deleteByPattern: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: ReturnType<typeof createPrismaMock>;
  let redis: ReturnType<typeof createRedisMock>;

  const mockUserId = 'test-user-123';
  const mockDate = new Date('2025-11-23T00:00:00Z');

  beforeEach(async () => {
    // Mock current date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    prismaService = createPrismaMock();
    redis = createRedisMock();

    const mockHoroscopeService = {
      generateHoroscope: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: NatalChartService,
          useValue: { refreshPremiumChartAssets: jest.fn() },
        },
        {
          provide: HoroscopeGeneratorService,
          useValue: mockHoroscopeService,
        },
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: new ConfigService({ NODE_ENV: 'test' }),
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('getStatus', () => {
    it('should return free subscription for new user', async () => {
      prismaService.subscription.findUnique.mockResolvedValue(null);
      prismaService.subscription.upsert.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(false);
      expect(prismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          create: expect.objectContaining({ tier: SubscriptionTier.FREE }),
        }),
      );
    });

    it('should return active premium subscription', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(false);
      expect(result.daysRemaining).toBe(30);
    });

    it('should return active trial subscription', async () => {
      const trialEndDate = new Date(mockDate);
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days trial

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: null,
        trialEndsAt: trialEndDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(true);
      expect(result.daysRemaining).toBe(7);
    });

    it('should downgrade expired premium subscription to free', async () => {
      const pastDate = new Date(mockDate);
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      prismaService.subscription.findUnique
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.PREMIUM,
          expiresAt: pastDate,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        })
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

      prismaService.subscription.update.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isActive).toBe(true);
      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          isCancelled: false,
        },
      });
    });

    it('should calculate days remaining correctly', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setDate(futureDate.getDate() + 15); // 15 days

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.daysRemaining).toBe(15);
    });

    it('should handle expired trial correctly', async () => {
      const pastDate = new Date(mockDate);
      pastDate.setDate(pastDate.getDate() - 1);

      prismaService.subscription.findUnique
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.PREMIUM,
          expiresAt: null,
          trialEndsAt: pastDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        })
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

      prismaService.subscription.update.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        isCancelled: false,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isTrial).toBe(false);
    });
  });

  describe('Subscription Tiers', () => {
    it('should have correct features for FREE tier', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.features).toEqual(
        FEATURE_MATRIX[SubscriptionTier.FREE].features,
      );
    });

    it('should have correct features for PREMIUM tier', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setMonth(futureDate.getMonth() + 1);

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.features).toEqual(
        FEATURE_MATRIX[SubscriptionTier.PREMIUM].features,
      );
    });

    it('normalizes legacy MAX subscriptions to Premium', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.MAX,
        expiresAt: new Date('2025-12-23T00:00:00Z'),
        trialEndsAt: null,
        isCancelled: false,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.features).toEqual(
        FEATURE_MATRIX[SubscriptionTier.PREMIUM].features,
      );
    });
  });

  describe('Trial Management', () => {
    const freeSubscription: Subscription = {
      id: '1',
      userId: mockUserId,
      tier: SubscriptionTier.FREE,
      expiresAt: null,
      trialEndsAt: null,
      isCancelled: false,
      createdAt: mockDate,
      updatedAt: mockDate,
    };

    it('activates a trial and invalidates all subscription caches', async () => {
      prismaService.subscription.findUnique.mockResolvedValue(freeSubscription);
      const trialEnd = new Date(mockDate);
      trialEnd.setDate(trialEnd.getDate() + TRIAL_CONFIG.duration);
      prismaService.subscription.update.mockResolvedValue({
        ...freeSubscription,
        tier: TRIAL_CONFIG.tier,
        trialEndsAt: trialEnd,
      });

      await expect(service.activateTrial(mockUserId)).resolves.toEqual({
        success: true,
        message: `Trial активирован на ${TRIAL_CONFIG.duration} дней`,
        expiresAt: trialEnd.toISOString(),
      });
      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { tier: TRIAL_CONFIG.tier, trialEndsAt: trialEnd },
      });
      for (const key of ['status:', 'record:', '']) {
        expect(redis.del).toHaveBeenCalledWith(
          `subscription:${key}${mockUserId}`,
        );
      }
      expect(redis.set).toHaveBeenCalledWith(
        `subscription:status:${mockUserId}`,
        expect.objectContaining({
          isTrial: true,
          daysRemaining: TRIAL_CONFIG.duration,
        }),
        60,
      );
    });

    it.each([
      ['2025-11-22T00:00:00Z', 'Trial период уже был использован'],
      ['2025-11-24T00:00:00Z', 'Trial период уже активен'],
    ])(
      'rejects a repeat trial with expiration %s',
      async (trialEndsAt, message) => {
        prismaService.subscription.findUnique.mockResolvedValue({
          ...freeSubscription,
          trialEndsAt: new Date(trialEndsAt),
        });

        await expect(service.activateTrial(mockUserId)).rejects.toThrow(
          message,
        );
        expect(prismaService.subscription.update).not.toHaveBeenCalled();
        expect(redis.set).not.toHaveBeenCalled();
      },
    );

    it('rejects a trial when the subscription does not exist', async () => {
      prismaService.subscription.findUnique.mockResolvedValue(null);

      await expect(service.activateTrial(mockUserId)).rejects.toThrow(
        'Подписка не найдена',
      );
      expect(prismaService.subscription.update).not.toHaveBeenCalled();
    });

    it('should calculate trial expiration correctly', async () => {
      const trialDays = 7;
      const trialEndDate = new Date(mockDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: null,
        trialEndsAt: trialEndDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.isTrial).toBe(true);
      expect(result.daysRemaining).toBe(trialDays);
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription expiring today', async () => {
      const todayEnd = new Date(mockDate);
      todayEnd.setHours(23, 59, 59, 999);

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: todayEnd,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.isActive).toBe(true);
      expect(result.daysRemaining).toBe(1);
    });

    it('should handle negative days remaining gracefully', async () => {
      const pastDate = new Date(mockDate);
      pastDate.setDate(pastDate.getDate() - 10);

      prismaService.subscription.findUnique
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.PREMIUM,
          expiresAt: pastDate,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        })
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          isCancelled: false,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        });

      prismaService.subscription.update.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        isCancelled: false,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      // Should not have negative days
      expect(result.daysRemaining).toBeUndefined();
    });

    it('should handle null expiresAt for free tier', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.isActive).toBe(true);
      expect(result.expiresAt).toBeUndefined();
    });

    it('should handle concurrent subscription checks', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const promises = Array.from({ length: 10 }, () =>
        service.getStatus(mockUserId),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.tier === SubscriptionTier.FREE)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw BadRequestException on database error', async () => {
      prismaService.subscription.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.getStatus(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects subscription creation for a missing user', async () => {
      prismaService.subscription.findUnique.mockResolvedValue(null);
      prismaService.public_users.findUnique.mockResolvedValue(null);

      await expect(service.getStatus(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.subscription.upsert).not.toHaveBeenCalled();
    });

    it('should handle malformed subscription data', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        isCancelled: false,
        tier: 'INVALID_TIER',
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.features).toEqual(
        FEATURE_MATRIX[SubscriptionTier.FREE].features,
      );
    });
  });

  describe('Status caching', () => {
    it('uses the cached status without a database lookup', async () => {
      redis.get.mockResolvedValue({
        tier: SubscriptionTier.MAX,
        isActive: true,
        isTrial: false,
        features: ['obsolete feature'],
        daysRemaining: 5,
      });

      const result = await service.getStatus(mockUserId);

      expect(redis.get).toHaveBeenCalledWith(
        `subscription:status:${mockUserId}`,
      );
      expect(prismaService.subscription.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({
        tier: SubscriptionTier.PREMIUM,
        isActive: true,
        isTrial: false,
        features: FEATURE_MATRIX[SubscriptionTier.PREMIUM].features,
        daysRemaining: 5,
      });
    });
  });
});
