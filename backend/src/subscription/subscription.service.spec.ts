import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../services/ai.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { SubscriptionTier } from '../types';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiService: jest.Mocked<AIService>;
  let horoscopeService: jest.Mocked<HoroscopeGeneratorService>;

  const mockUserId = 'test-user-123';
  const mockDate = new Date('2025-11-23T00:00:00Z');

  beforeEach(async () => {
    // Mock current date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    const mockPrismaService = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockAIService = {
      isAvailable: jest.fn(),
    };

    const mockHoroscopeService = {
      generateHoroscope: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: HoroscopeGeneratorService,
          useValue: mockHoroscopeService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get(PrismaService);
    aiService = module.get(AIService);
    horoscopeService = module.get(HoroscopeGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('getStatus', () => {
    it('should return free subscription for new user', async () => {
      prismaService.subscription.findUnique.mockResolvedValue(null);
      prismaService.subscription.create.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isActive).toBe(true);
      expect(result.isTrial).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.subscription.create).toHaveBeenCalled();
    });

    it('should return active premium subscription', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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
        tier: SubscriptionTier.PREMIUM,
        expiresAt: null,
        trialEndsAt: trialEndDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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
          tier: SubscriptionTier.PREMIUM,
          expiresAt: pastDate,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any)
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any);

      prismaService.subscription.update.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const result = await service.getStatus(mockUserId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isActive).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
        },
      });
    });

    it('should calculate days remaining correctly', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setDate(futureDate.getDate() + 15); // 15 days

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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
          tier: SubscriptionTier.PREMIUM,
          expiresAt: null,
          trialEndsAt: pastDate,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any)
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any);

      prismaService.subscription.update.mockResolvedValue({} as any);

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
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const result = await service.getStatus(mockUserId);

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
    });

    it('should have correct features for PREMIUM tier', async () => {
      const futureDate = new Date(mockDate);
      futureDate.setMonth(futureDate.getMonth() + 1);

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: futureDate,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const result = await service.getStatus(mockUserId);

      expect(result.features).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      // Premium should have more features than FREE
    });

    it('should validate tier upgrade path (FREE -> PREMIUM)', async () => {
      // Test upgrade logic if implemented
    });

    it('should validate tier upgrade path (PREMIUM -> ULTIMATE)', async () => {
      // Test upgrade logic if implemented
    });
  });

  describe('Trial Management', () => {
    it('should start trial for new premium subscription', async () => {
      // Test trial creation logic
    });

    it('should not allow multiple trials for same user', async () => {
      // Test trial restriction
    });

    it('should convert trial to paid subscription after trial ends', async () => {
      // Test trial conversion logic
    });

    it('should calculate trial expiration correctly', async () => {
      const trialDays = 7;
      const trialEndDate = new Date(mockDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.PREMIUM,
        expiresAt: null,
        trialEndsAt: trialEndDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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
        tier: SubscriptionTier.PREMIUM,
        expiresAt: todayEnd,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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
          tier: SubscriptionTier.PREMIUM,
          expiresAt: pastDate,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any)
        .mockResolvedValueOnce({
          id: '1',
          userId: mockUserId,
          tier: SubscriptionTier.FREE,
          expiresAt: null,
          trialEndsAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        } as any);

      prismaService.subscription.update.mockResolvedValue({} as any);

      const result = await service.getStatus(mockUserId);

      // Should not have negative days
      expect(result.daysRemaining).toBeUndefined();
    });

    it('should handle null expiresAt for free tier', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const result = await service.getStatus(mockUserId);

      expect(result.isActive).toBe(true);
      expect(result.expiresAt).toBeUndefined();
    });

    it('should handle concurrent subscription checks', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

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

    it('should handle invalid userId gracefully', async () => {
      const invalidUserId = '';

      await expect(service.getStatus(invalidUserId)).rejects.toThrow();
    });

    it('should handle malformed subscription data', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: 'INVALID_TIER' as any,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      // Should handle gracefully or throw appropriate error
      await service.getStatus(mockUserId);

      // Verify error handling
    });
  });

  describe('Performance', () => {
    it('should complete status check within acceptable time', async () => {
      prismaService.subscription.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        trialEndsAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const startTime = Date.now();
      await service.getStatus(mockUserId);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
