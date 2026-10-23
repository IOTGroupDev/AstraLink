import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';

jest.mock('../chart/chart.service', () => ({ ChartService: class {} }));
jest.mock('../services/ephemeris.service', () => ({
  EphemerisService: class {},
}));

function createSupabaseMock() {
  return {
    signInWithOTP: jest.fn().mockResolvedValue({ error: null }),
    verifyOTP: jest.fn(),
    getUserProfileAdmin: jest
      .fn()
      .mockResolvedValue({ data: null, error: null }),
    getUserChartsAdmin: jest.fn().mockResolvedValue({ data: [], error: null }),
    getOAuthSignInUrl: jest.fn(),
  };
}

describe('SupabaseAuthService sign-in flows', () => {
  let service: SupabaseAuthService;
  let supabase: ReturnType<typeof createSupabaseMock>;
  let createChart: jest.Mock;
  const user = {
    id: 'f8aa6ea0-6384-43e6-b40b-6fc9587e549d',
    email: 'owner@example.com',
    user_metadata: { name: 'Owner' },
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  beforeEach(async () => {
    supabase = createSupabaseMock();
    createChart = jest.fn().mockResolvedValue({ id: 'new-chart' });
    const module = await Test.createTestingModule({
      providers: [
        SupabaseAuthService,
        { provide: SupabaseService, useValue: supabase },
        {
          provide: ChartService,
          useValue: { createNatalChartWithInterpretation: createChart },
        },
        { provide: EphemerisService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(SupabaseAuthService);
  });

  describe('sendMagicLink', () => {
    it('delegates OTP delivery to Supabase', async () => {
      await expect(service.sendMagicLink(user.email)).resolves.toEqual({
        success: true,
      });
      expect(supabase.signInWithOTP).toHaveBeenCalledWith(user.email);
    });

    it('rejects a provider error without returning success', async () => {
      supabase.signInWithOTP.mockResolvedValue({
        error: { message: 'Email rate limit exceeded' },
      });

      await expect(service.sendMagicLink(user.email)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('handles a transport failure as a failed sign-in request', async () => {
      supabase.signInWithOTP.mockRejectedValue(
        new Error('Supabase unavailable'),
      );

      await expect(service.sendMagicLink(user.email)).rejects.toThrow(
        'Ошибка отправки магической ссылки',
      );
    });
  });

  describe('verifyMagicLink', () => {
    it('returns the verified identity and session without creating an incomplete chart', async () => {
      supabase.verifyOTP.mockResolvedValue({
        data: { user, session: { access_token: 'verified-session-token' } },
        error: null,
      });

      const result = await service.verifyMagicLink('otp-token');

      expect(supabase.verifyOTP).toHaveBeenCalledWith('otp-token');
      expect(supabase.getUserProfileAdmin).toHaveBeenCalledWith(user.id);
      expect(supabase.getUserChartsAdmin).toHaveBeenCalledWith(user.id);
      expect(result.user).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          name: 'Owner',
        }),
      );
      expect(result.access_token).toBe('verified-session-token');
      expect(createChart).not.toHaveBeenCalled();
    });

    it('uses the saved profile while preserving the verified Auth identity', async () => {
      supabase.verifyOTP.mockResolvedValue({
        data: { user, session: { access_token: 'verified-session-token' } },
        error: null,
      });
      supabase.getUserProfileAdmin.mockResolvedValue({
        data: {
          name: 'Saved name',
          birth_date: '1990-01-15T00:00:00Z',
          birth_time: '14:30',
          birth_place: 'Москва',
        },
        error: null,
      });
      supabase.getUserChartsAdmin.mockResolvedValue({
        data: [{ id: 'existing-chart' }],
        error: null,
      });

      const result = await service.verifyMagicLink('otp-token');

      expect(result.user).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          name: 'Saved name',
          birthDate: '1990-01-15',
          birthTime: '14:30',
          birthPlace: 'Москва',
        }),
      );
      expect(createChart).not.toHaveBeenCalled();
    });

    it('creates a missing chart only from complete saved birth data', async () => {
      supabase.verifyOTP.mockResolvedValue({
        data: { user, session: null },
        error: null,
      });
      supabase.getUserProfileAdmin.mockResolvedValue({
        data: {
          birth_date: '1990-01-15T00:00:00Z',
          birth_time: '14:30',
          birth_place: 'Москва',
        },
        error: null,
      });

      await service.verifyMagicLink('otp-token');

      expect(createChart).toHaveBeenCalledWith(
        user.id,
        '1990-01-15',
        '14:30',
        'Москва',
      );
    });

    it('allows a verified login if chart creation fails', async () => {
      supabase.verifyOTP.mockResolvedValue({
        data: { user, session: { access_token: 'verified-session-token' } },
        error: null,
      });
      supabase.getUserProfileAdmin.mockResolvedValue({
        data: {
          birth_date: '1990-01-15',
          birth_time: '14:30',
          birth_place: 'Москва',
        },
        error: null,
      });
      createChart.mockRejectedValue(new Error('Ephemeris unavailable'));

      await expect(service.verifyMagicLink('otp-token')).resolves.toEqual(
        expect.objectContaining({ access_token: 'verified-session-token' }),
      );
    });

    it.each([
      { data: { user: null }, error: null },
      { data: { user }, error: { message: 'Token expired' } },
    ])(
      'rejects missing or invalid identities before profile access (%#)',
      async (response) => {
        supabase.verifyOTP.mockResolvedValue(response);

        await expect(service.verifyMagicLink('invalid-token')).rejects.toThrow(
          UnauthorizedException,
        );
        expect(supabase.getUserProfileAdmin).not.toHaveBeenCalled();
        expect(supabase.getUserChartsAdmin).not.toHaveBeenCalled();
      },
    );

    it('rejects an OTP transport failure', async () => {
      supabase.verifyOTP.mockRejectedValue(new Error('Network unavailable'));

      await expect(service.verifyMagicLink('otp-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(supabase.getUserProfileAdmin).not.toHaveBeenCalled();
    });
  });

  describe('getOAuthUrl', () => {
    it('passes the explicit redirect URI to Supabase', async () => {
      supabase.getOAuthSignInUrl.mockResolvedValue({
        url: 'https://auth.example.com/authorize',
        error: null,
      });

      await expect(
        service.getOAuthUrl('google', 'astralink://auth/callback'),
      ).resolves.toEqual({ url: 'https://auth.example.com/authorize' });
      expect(supabase.getOAuthSignInUrl).toHaveBeenCalledWith(
        'google',
        'astralink://auth/callback',
      );
    });

    it.each([
      { url: null, error: null },
      {
        url: 'https://auth.example.com/authorize',
        error: { message: 'Provider disabled' },
      },
    ])('rejects missing URLs or provider errors (%#)', async (response) => {
      supabase.getOAuthSignInUrl.mockResolvedValue(response);

      await expect(
        service.getOAuthUrl('apple', 'astralink://auth/callback'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
