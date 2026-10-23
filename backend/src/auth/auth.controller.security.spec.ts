import 'reflect-metadata';
import { INestApplication, Logger, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SignupRateLimitGuard } from './guards/signup-rate-limit.guard';
import { MagicLinkRateLimitGuard } from './guards/magic-link-rate-limit.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

jest.mock('../chart/chart.service', () => ({ ChartService: class {} }));
jest.mock('../services/ephemeris.service', () => ({
  EphemerisService: class {},
}));

describe('Auth HTTP protection and legacy routes', () => {
  const ownUserId = 'f8aa6ea0-6384-43e6-b40b-6fc9587e549d';
  const otherUserId = '58b8e8b1-7fd8-4a60-bf31-008be321d157';
  const payload = { userId: ownUserId, birthDate: '1990-01-01' };
  const service = {
    completeSignup: jest.fn(),
    ensureAuthenticatedUserProfile: jest.fn(),
  };
  const getUser = jest.fn();
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        Reflector,
        SupabaseAuthGuard,
        { provide: SupabaseAuthService, useValue: service },
        { provide: SupabaseService, useValue: { getUser } },
      ],
    })
      .overrideGuard(SignupRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MagicLinkRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalGuards(module.get(SupabaseAuthGuard));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: ownUserId, email: 'owner@example.com' } },
      error: null,
    });
    service.completeSignup.mockResolvedValue({
      user: { id: ownUserId, email: 'owner@example.com' },
    });
    service.ensureAuthenticatedUserProfile.mockResolvedValue({
      success: true,
      existing: true,
    });
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  it.each([
    'complete-signup',
    'complete-signup-OAuth',
    'ensure-profile',
    'logout',
  ])(
    'rejects %s without Authorization before reaching a service',
    async (route) => {
      await request(app.getHttpServer())
        .post(`/auth/${route}`)
        .send(payload)
        .expect(401);
      expect(getUser).not.toHaveBeenCalled();
      expect(service.completeSignup).not.toHaveBeenCalled();
      expect(service.ensureAuthenticatedUserProfile).not.toHaveBeenCalled();
    },
  );

  it.each(['complete-signup', 'complete-signup-OAuth', 'ensure-profile'])(
    'rejects a foreign user ID on %s',
    async (route) => {
      await request(app.getHttpServer())
        .post(`/auth/${route}`)
        .set('Authorization', 'Bearer token')
        .send({ ...payload, userId: otherUserId, email: 'victim@example.com' })
        .expect(403);
      expect(service.completeSignup).not.toHaveBeenCalled();
      expect(service.ensureAuthenticatedUserProfile).not.toHaveBeenCalled();
    },
  );

  it.each(['complete-signup', 'complete-signup-OAuth'])(
    'rejects an expired Supabase token on %s',
    async (route) => {
      getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Expired' },
      });
      await request(app.getHttpServer())
        .post(`/auth/${route}`)
        .set('Authorization', 'Bearer expired')
        .send(payload)
        .expect(401);
      expect(service.completeSignup).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['complete-signup', 'Bearer token'],
    ['complete-signup-OAuth', 'bearer%20token'],
    ['complete-signup', 'Bearer    token'],
  ])(
    'completes the own profile on %s with supported header %s',
    async (route, authorization) => {
      await request(app.getHttpServer())
        .post(`/auth/${route}`)
        .set('Authorization', authorization)
        .send(payload)
        .expect(200, {
          success: true,
          user: { id: ownUserId, email: 'owner@example.com' },
        });
      expect(service.completeSignup).toHaveBeenCalledWith(
        ownUserId,
        payload,
        'token',
      );
    },
  );

  it('supports complete-signup without the optional body userId', async () => {
    await request(app.getHttpServer())
      .post('/auth/complete-signup')
      .set('Authorization', 'Bearer token')
      .send({ birthDate: payload.birthDate })
      .expect(200);
    expect(service.completeSignup).toHaveBeenCalledWith(
      ownUserId,
      { birthDate: payload.birthDate },
      'token',
    );
  });

  it('does not pass body email into profile recovery', async () => {
    await request(app.getHttpServer())
      .post('/auth/ensure-profile')
      .set('Authorization', 'Bearer token')
      .send({ userId: ownUserId, email: 'victim@example.com' })
      .expect(200);
    expect(service.ensureAuthenticatedUserProfile).toHaveBeenCalledWith(
      ownUserId,
      'token',
    );
  });

  it('registers logout separately and preserves its response', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer token')
      .expect(200, { success: true });
    expect(service.completeSignup).not.toHaveBeenCalled();
  });

  it.each([
    ['completeSignup', 'complete-signup'],
    ['completeSignupOAuth', 'complete-signup-OAuth'],
    ['ensureUserProfile', 'ensure-profile'],
    ['logout', 'logout'],
  ] as const)(
    'keeps %s registered as an authenticated POST %s',
    (handler, path) => {
      const method = AuthController.prototype[handler];
      expect(Reflect.getMetadata(PATH_METADATA, method)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(
        RequestMethod.POST,
      );
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, method)).not.toBe(true);
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toContain(
        SupabaseAuthGuard,
      );
    },
  );
});
