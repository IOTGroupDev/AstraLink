import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Stripe from 'stripe';
import type { Subscription as StripeSubscription } from 'stripe/cjs/resources/Subscriptions';
import { SubscriptionService } from './subscription.service';
import {
  SubscriptionController,
  UpgradeSubscriptionDto,
} from './subscription.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NatalChartService } from '../chart/services';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { RedisService } from '../redis/redis.service';
import { SubscriptionTier } from '../types';

jest.mock('stripe', () => jest.fn());
jest.mock('../chart/services', () => ({ NatalChartService: class {} }));
jest.mock('../services/horoscope-generator.service', () => ({
  HoroscopeGeneratorService: class {},
}));
jest.mock('../auth/guards/supabase-auth.guard', () => ({
  SupabaseAuthGuard: class {},
}));

describe('Subscription billing boundaries', () => {
  const userId = 'user-a';
  const authenticatedRequest = {
    user: { id: userId, email: 'test@example.invalid' },
    headers: {},
  } as Parameters<SubscriptionController['upgrade']>[0];

  let service: SubscriptionService;
  let controller: SubscriptionController;
  let environment: string | undefined;
  let prisma: {
    public_users: { findUnique: jest.Mock };
    subscription: {
      findUnique: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    payment: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let redis: { del: jest.Mock; set: jest.Mock; deleteByPattern: jest.Mock };
  let stripe: {
    subscriptions: { retrieve: jest.Mock; update: jest.Mock };
    customers: { retrieve: jest.Mock };
    webhooks: { constructEvent: jest.Mock };
  };

  function providerSubscription(
    id: string,
    owner: string | undefined = userId,
    status: StripeSubscription['status'] = 'active',
    cancelAtPeriodEnd = false,
  ): StripeSubscription {
    return {
      id,
      customer: 'cus_test_unit',
      metadata: owner ? { userId: owner } : {},
      status,
      cancel_at_period_end: cancelAtPeriodEnd,
      currency: 'usd',
      items: { data: [] },
    } as unknown as StripeSubscription;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    environment = 'production';
    prisma = {
      public_users: { findUnique: jest.fn().mockResolvedValue({ id: userId }) },
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          userId,
          tier: 'premium',
          isCancelled: false,
        }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ stripeSessionId: 'sub_test_a' }]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    redis = {
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };
    stripe = {
      subscriptions: {
        retrieve: jest.fn().mockImplementation(async (id: string) => {
          return providerSubscription(id);
        }),
        update: jest.fn().mockImplementation(async (id: string) => {
          return providerSubscription(id, userId, 'active', true);
        }),
      },
      customers: { retrieve: jest.fn() },
      webhooks: { constructEvent: jest.fn() },
    };
    jest
      .mocked(Stripe)
      .mockImplementation(() => stripe as unknown as Stripe.Stripe);

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return environment;
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_unit_tests_only';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_unit_tests_only';
        return undefined;
      }),
    };
    service = new SubscriptionService(
      prisma as unknown as PrismaService,
      {} as NatalChartService,
      {} as HoroscopeGeneratorService,
      redis as unknown as RedisService,
      config as unknown as ConfigService,
    );
    controller = new SubscriptionController(service);
  });

  describe('Mock upgrades', () => {
    it.each(['production', 'staging', 'dev', '', undefined])(
      'blocks mock without an explicit development/test environment (%s)',
      async (value) => {
        environment = value;
        await expect(
          service.upgrade(userId, SubscriptionTier.PREMIUM, 'mock'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.subscription.upsert).not.toHaveBeenCalled();
        expect(prisma.payment.create).not.toHaveBeenCalled();
        expect(redis.set).not.toHaveBeenCalled();
      },
    );

    it.each(['development', 'test'])('allows mock in %s', async (value) => {
      environment = value;
      await expect(
        service.upgrade(userId, SubscriptionTier.PREMIUM, 'mock'),
      ).resolves.toMatchObject({ success: true });
      expect(prisma.subscription.upsert).toHaveBeenCalledTimes(1);
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it.each(['unknown', '', null])(
      'does not convert an unknown payment method (%s) into mock',
      async (paymentMethod) => {
        environment = 'development';
        const upgrade = jest.spyOn(service, 'upgrade');
        await expect(
          controller.upgrade(authenticatedRequest, {
            tier: 'premium',
            paymentMethod,
          } as unknown as UpgradeSubscriptionDto),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(upgrade).not.toHaveBeenCalled();
        expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      },
    );

    it('also blocks omitted payment methods in production', async () => {
      await expect(
        controller.upgrade(authenticatedRequest, { tier: 'premium' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it.each(['apple', 'google'])(
      'does not grant access for unsupported %s',
      async (method) => {
        await expect(
          service.upgrade(
            userId,
            SubscriptionTier.PREMIUM,
            method as 'apple' | 'google',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      },
    );

    it('requires the verified guard identity instead of decoding a Bearer token', async () => {
      const payload = Buffer.from(JSON.stringify({ sub: userId })).toString(
        'base64url',
      );
      const request = {
        headers: { authorization: `Bearer e30.${payload}.invalid` },
      } as Parameters<SubscriptionController['cancel']>[0];
      await expect(controller.cancel(request)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.payment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Stripe cancellation', () => {
    it('cancels every distinct provider subscription and preserves paid access', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { stripeSessionId: 'sub_test_a' },
        { stripeSessionId: 'sub_test_a' },
        { stripeSessionId: 'sub_test_b' },
      ]);
      await expect(service.cancel(userId)).resolves.toMatchObject({
        success: true,
      });
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId, stripeSessionId: { startsWith: 'sub_' } },
        select: { stripeSessionId: true },
      });
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledTimes(2);
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(2);
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_test_a', {
        cancel_at_period_end: true,
      });
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_test_b', {
        cancel_at_period_end: true,
      });
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId },
        data: { isCancelled: true },
      });
      expect(redis.del).toHaveBeenCalledTimes(3);
    });

    it('cancels a paid provider trial', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        providerSubscription('sub_test_a', userId, 'trialing'),
      );
      await service.cancel(userId);
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
    });

    it.each(['canceled', 'incomplete_expired'] as const)(
      'does not update an already ended %s subscription',
      async (status) => {
        stripe.subscriptions.retrieve.mockResolvedValue(
          providerSubscription('sub_test_a', userId, status),
        );
        await expect(service.cancel(userId)).resolves.toMatchObject({
          success: true,
        });
        expect(stripe.subscriptions.update).not.toHaveBeenCalled();
      },
    );

    it('makes repeating a confirmed cancellation safe', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        providerSubscription('sub_test_a', userId, 'active', true),
      );
      await service.cancel(userId);
      await service.cancel(userId);
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('still checks the provider when the local tier has expired to free', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        userId,
        tier: 'free',
        isCancelled: false,
      });
      await service.cancel(userId);
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
    });

    it('still cancels when the local entitlement record is missing', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await service.cancel(userId);
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('rejects all changes if any provider subscription belongs to another user', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { stripeSessionId: 'sub_test_a' },
        { stripeSessionId: 'sub_foreign' },
      ]);
      stripe.subscriptions.retrieve.mockImplementation(async (id: string) => {
        return providerSubscription(
          id,
          id === 'sub_foreign' ? 'user-b' : userId,
        );
      });
      await expect(service.cancel(userId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('allows legacy subscriptions bound to the owned customer', async () => {
      const subscription = providerSubscription('sub_test_a');
      subscription.metadata = {};
      stripe.subscriptions.retrieve.mockResolvedValue(subscription);
      stripe.customers.retrieve.mockResolvedValue({
        id: 'cus_test_unit',
        metadata: { userId },
      });
      await service.cancel(userId);
      expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_test_unit');
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
    });

    it.each([
      { id: 'cus_test_unit', metadata: { userId: 'user-b' } },
      { id: 'cus_test_unit', metadata: {} },
      { id: 'cus_test_unit', deleted: true },
    ])(
      'rejects unbound, foreign or deleted legacy customers (%j)',
      async (customer) => {
        const subscription = providerSubscription('sub_test_a');
        subscription.metadata = {};
        stripe.subscriptions.retrieve.mockResolvedValue(subscription);
        stripe.customers.retrieve.mockResolvedValue(customer);
        await expect(service.cancel(userId)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(stripe.subscriptions.update).not.toHaveBeenCalled();
        expect(prisma.subscription.update).not.toHaveBeenCalled();
      },
    );

    it('does not acknowledge success or set local cancellation if Stripe rejects the request', async () => {
      stripe.subscriptions.update.mockRejectedValue(
        new Error('provider unavailable'),
      );
      await expect(service.cancel(userId)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('requires an explicit provider acknowledgement of cancellation', async () => {
      stripe.subscriptions.update.mockResolvedValue(
        providerSubscription('sub_test_a'),
      );
      await expect(service.cancel(userId)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('does not set local cancellation after a partial provider failure', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { stripeSessionId: 'sub_test_a' },
        { stripeSessionId: 'sub_test_b' },
      ]);
      stripe.subscriptions.update
        .mockResolvedValueOnce(
          providerSubscription('sub_test_a', userId, 'active', true),
        )
        .mockRejectedValueOnce(new Error('provider unavailable'));
      await expect(service.cancel(userId)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(prisma.subscription.update).not.toHaveBeenCalled();

      stripe.subscriptions.retrieve.mockImplementation(async (id: string) => {
        return providerSubscription(id, userId, 'active', id === 'sub_test_a');
      });
      await expect(service.cancel(userId)).resolves.toMatchObject({
        success: true,
      });
      expect(stripe.subscriptions.update).toHaveBeenCalledTimes(3);
      expect(prisma.subscription.update).toHaveBeenCalledTimes(1);
    });

    it.each(['free', null])(
      'safely handles no recurring subscription (%s)',
      async (tier) => {
        prisma.payment.findMany.mockResolvedValue([]);
        prisma.subscription.findUnique.mockResolvedValue(
          tier ? { tier } : null,
        );
        await expect(service.cancel(userId)).resolves.toEqual({
          success: true,
          message: 'Нет активной подписки для отмены.',
        });
        expect(Stripe).not.toHaveBeenCalled();
        expect(prisma.subscription.update).not.toHaveBeenCalled();
      },
    );

    it('does not label a local trial as a cancelled provider subscription', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      await expect(service.cancel(userId)).resolves.toEqual({
        success: true,
        message:
          'Подписка не продлевается автоматически. Доступ сохранится до конца периода.',
      });
      expect(Stripe).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('preserves scheduled trial cancellation when its webhook arrives', async () => {
      stripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: providerSubscription('sub_test_a', userId, 'trialing', true),
        },
      });
      await service.handleStripeWebhook(
        Buffer.from('{}'),
        'unit-test-signature',
      );
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isCancelled: true }),
          update: expect.objectContaining({ isCancelled: true }),
        }),
      );
    });
  });
});
