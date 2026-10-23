import {
  ConflictException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { User } from '@supabase/supabase-js';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';
import type { OAuthCallbackRequest } from '../types';

jest.mock('../chart/chart.service', () => ({ ChartService: class {} }));
jest.mock('../services/ephemeris.service', () => ({
  EphemerisService: class {},
}));

const ownUserId = 'f8aa6ea0-6384-43e6-b40b-6fc9587e549d';
const otherUserId = '58b8e8b1-7fd8-4a60-bf31-008be321d157';
const verifiedUser: User = {
  id: ownUserId,
  email: 'owner@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: { name: 'Owner' },
  created_at: '2026-01-01T00:00:00Z',
};
const ownProfile = {
  id: ownUserId,
  email: verifiedUser.email,
  name: 'Owner',
  birth_date: '1990-01-01T00:00:00.000Z',
  birth_time: '12:00',
  birth_place: 'Moscow',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const signupDto = {
  userId: ownUserId,
  name: 'Owner',
  birthDate: '1990-01-01',
  birthTime: '12:00',
  birthPlace: 'Moscow',
};

function queryReturning(data: unknown, error: unknown = null) {
  const result = { data, error };
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
}

describe('Supabase auth identity boundaries', () => {
  const supabase = {
    getUser: jest.fn(),
    getUserProfileAdmin: jest.fn(),
    getUserChartsAdmin: jest.fn(),
    updateUserProfileAdmin: jest.fn(),
    fromAdmin: jest.fn(),
    getAdminClient: jest.fn(),
    prepareUserProfileWritePayload: jest.fn(),
  };
  const chart = { createNatalChartWithInterpretation: jest.fn() };
  const events = { emit: jest.fn() };
  let service: SupabaseAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    supabase.getUser.mockResolvedValue({
      data: { user: verifiedUser },
      error: null,
    });
    supabase.getUserProfileAdmin.mockResolvedValue({
      data: ownProfile,
      error: null,
    });
    supabase.getUserChartsAdmin.mockResolvedValue({
      data: [{ id: 'chart-id' }],
      error: null,
    });
    supabase.updateUserProfileAdmin.mockResolvedValue({
      data: ownProfile,
      error: null,
    });
    supabase.fromAdmin.mockImplementation((table: string) =>
      queryReturning(
        table === 'subscriptions' ? { id: 'subscription-id' } : ownProfile,
      ),
    );
    supabase.prepareUserProfileWritePayload.mockImplementation(
      (payload: unknown) => payload,
    );
    service = new SupabaseAuthService(
      supabase as unknown as SupabaseService,
      chart as unknown as ChartService,
      {} as EphemerisService,
      events as unknown as EventEmitter2,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const expectNoAdminAccess = () => {
    expect(supabase.getUserProfileAdmin).not.toHaveBeenCalled();
    expect(supabase.getUserChartsAdmin).not.toHaveBeenCalled();
    expect(supabase.updateUserProfileAdmin).not.toHaveBeenCalled();
    expect(supabase.fromAdmin).not.toHaveBeenCalled();
    expect(supabase.getAdminClient).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  };

  describe.each([
    ['Google', 'handleGoogleCallback'],
    ['Apple', 'handleAppleCallback'],
    ['Yandex', 'handleYandexCallback'],
  ] as const)('%s callback', (_provider, method) => {
    const callback: OAuthCallbackRequest = {
      access_token: 'supabase-access-token',
      user: { id: ownUserId, email: 'untrusted@example.com', name: 'Owner' },
    };

    it('rejects an absent token before admin access with 401', async () => {
      await expect(
        service[method]({ ...callback, access_token: '' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(supabase.getUser).not.toHaveBeenCalled();
      expectNoAdminAccess();
    });

    it('rejects invalid or expired Supabase sessions before admin access with 401', async () => {
      supabase.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Expired' },
      });
      await expect(service[method](callback)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expectNoAdminAccess();
    });

    it('rejects a body belonging to another user with 403', async () => {
      await expect(
        service[method]({
          ...callback,
          user: { ...callback.user, id: otherUserId },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expectNoAdminAccess();
    });

    it('reads only the verified owner and returns the verified email', async () => {
      const result = await service[method](callback);
      expect(supabase.getUser).toHaveBeenCalledWith(callback.access_token);
      expect(supabase.getUserProfileAdmin).toHaveBeenCalledWith(ownUserId);
      expect(supabase.getUserChartsAdmin).toHaveBeenCalledWith(ownUserId);
      expect(supabase.getUser.mock.invocationCallOrder[0]).toBeLessThan(
        supabase.getUserProfileAdmin.mock.invocationCallOrder[0],
      );
      expect(result.user).toMatchObject({
        id: ownUserId,
        email: verifiedUser.email,
        birthDate: '1990-01-01',
      });
      expect(result.access_token).toBe(callback.access_token);
    });

    it('creates an incomplete own profile with verified identity for onboarding', async () => {
      supabase.getUserProfileAdmin.mockResolvedValue({
        data: null,
        error: null,
      });
      const profileQuery = queryReturning(ownProfile);
      supabase.fromAdmin.mockImplementation((table: string) =>
        table === 'users' ? profileQuery : queryReturning(null),
      );
      const result = await service[method](callback);
      expect(profileQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ownUserId,
          email: verifiedUser.email,
          birth_date: null,
        }),
      );
      expect(result.user.birthDate).toBeUndefined();
      expect(result.user.email).toBe(verifiedUser.email);
    });
  });

  it('converts token verification network failures to 401 without admin access', async () => {
    supabase.getUser.mockRejectedValue(new Error('Connection failed'));
    await expect(
      service.handleGoogleCallback({
        access_token: 'token',
        user: { id: ownUserId, email: 'owner@example.com' },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expectNoAdminAccess();
  });

  it('ignores editable email metadata when a provider omits email', async () => {
    supabase.getUser.mockResolvedValue({
      data: {
        user: {
          ...verifiedUser,
          email: undefined,
          user_metadata: { email: 'victim@example.com' },
        },
      },
      error: null,
    });
    const result = await service.handleYandexCallback({
      access_token: 'token',
      user: { id: ownUserId, email: 'victim@example.com' },
    });
    expect(result.user.email).toBe(`${ownUserId}@oauth.astralink.local`);
  });

  it('rejects completing signup without a token before admin access', async () => {
    await expect(
      service.completeSignup(ownUserId, signupDto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expectNoAdminAccess();
  });

  it('rejects completing signup with an invalid token before admin access', async () => {
    supabase.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      service.completeSignup(ownUserId, signupDto, 'invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expectNoAdminAccess();
  });

  it.each([
    [otherUserId, signupDto],
    [ownUserId, { ...signupDto, userId: otherUserId }],
  ])(
    'rejects a foreign signup ID even if a caller bypasses the controller',
    async (userId, dto) => {
      await expect(
        service.completeSignup(userId, dto, 'token'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expectNoAdminAccess();
    },
  );

  it('completes own signup, preserves birth data and schedules the real chart flow', async () => {
    const result = await service.completeSignup(
      ownUserId,
      {
        ...signupDto,
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 'Europe/Moscow',
        birthTimeKnown: true,
      },
      'token',
    );
    expect(supabase.updateUserProfileAdmin).toHaveBeenCalledWith(
      ownUserId,
      expect.objectContaining({
        birth_date: '1990-01-01T00:00:00.000Z',
        birth_time: '12:00',
        birth_place: 'Moscow',
      }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      'user.signup.completed',
      expect.objectContaining({
        userId: ownUserId,
        birthData: expect.objectContaining({
          latitude: 55.7558,
          longitude: 37.6173,
          birthTimeKnown: true,
        }),
      }),
    );
    expect(result.user.id).toBe(ownUserId);
  });

  it('recovers a missing own profile using the verified email before completing signup', async () => {
    supabase.getUserProfileAdmin
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValue({ data: ownProfile, error: null });
    const usersQuery = queryReturning(null);
    supabase.fromAdmin.mockImplementation((table: string) =>
      table === 'users'
        ? usersQuery
        : queryReturning({ id: 'subscription-id' }),
    );
    const result = await service.completeSignup(ownUserId, signupDto, 'token');
    expect(usersQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: ownUserId, email: verifiedUser.email }),
    );
    expect(usersQuery.delete).not.toHaveBeenCalled();
    expect(supabase.getAdminClient).not.toHaveBeenCalled();
    expect(result.user.id).toBe(ownUserId);
  });

  it('persists the exact selected birthplace coordinates before scheduling the chart', async () => {
    await service.completeSignup(
      ownUserId,
      {
        ...signupDto,
        birthPlace: 'Springfield, Illinois, United States',
        latitude: 39.8,
        longitude: -89.65,
        timezone: 'America/Chicago',
      },
      'token',
    );
    expect(supabase.updateUserProfileAdmin).toHaveBeenCalledWith(
      ownUserId,
      expect.objectContaining({
        birth_location: {
          birthPlace: 'Springfield, Illinois, United States',
          location: {
            latitude: 39.8,
            longitude: -89.65,
            timezone: 'America/Chicago',
          },
        },
      }),
    );
  });

  it('refuses a foreign ID in the authenticated profile recovery entry point', async () => {
    await expect(
      service.ensureAuthenticatedUserProfile(otherUserId, 'token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expectNoAdminAccess();
  });

  it.each([
    { data: { user: verifiedUser }, error: null },
    { data: { user: null }, error: { status: 500, message: 'Unavailable' } },
    { data: { user: null }, error: null },
    { data: { user: null }, error: { status: 404, code: 'other_error' } },
  ])(
    'does not delete another profile unless stale Auth identity is confirmed: %p',
    async (lookup) => {
      supabase.getUserProfileAdmin.mockResolvedValue({
        data: null,
        error: null,
      });
      const usersQuery = queryReturning({ ...ownProfile, id: otherUserId });
      supabase.fromAdmin.mockReturnValue(usersQuery);
      supabase.getAdminClient.mockReturnValue({
        auth: { admin: { getUserById: jest.fn().mockResolvedValue(lookup) } },
      });
      await expect(
        service.ensureAuthenticatedUserProfile(ownUserId, 'token'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersQuery.delete).not.toHaveBeenCalled();
      expect(usersQuery.insert).not.toHaveBeenCalled();
    },
  );

  it('fails closed if looking up another email-matched Auth identity throws', async () => {
    supabase.getUserProfileAdmin.mockResolvedValue({ data: null, error: null });
    const usersQuery = queryReturning({ ...ownProfile, id: otherUserId });
    supabase.fromAdmin.mockReturnValue(usersQuery);
    supabase.getAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: jest.fn().mockRejectedValue(new Error('Timeout')),
        },
      },
    });
    await expect(
      service.ensureAuthenticatedUserProfile(ownUserId, 'token'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersQuery.delete).not.toHaveBeenCalled();
  });

  it('allows existing stale-profile recovery after an explicit Auth user_not_found 404', async () => {
    supabase.getUserProfileAdmin
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValue({ data: ownProfile, error: null });
    const usersQuery = queryReturning({ ...ownProfile, id: otherUserId });
    supabase.fromAdmin.mockReturnValue(usersQuery);
    supabase.getAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { status: 404, code: 'user_not_found' },
          }),
        },
      },
    });
    const result = await service.ensureAuthenticatedUserProfile(
      ownUserId,
      'token',
    );
    expect(usersQuery.delete).toHaveBeenCalledTimes(1);
    expect(usersQuery.eq).toHaveBeenCalledWith('id', otherUserId);
    expect(usersQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: ownUserId, email: verifiedUser.email }),
    );
    expect(result).toMatchObject({ success: true, created: true });
  });
});
