import type { Session } from '@supabase/supabase-js';
import { AxiosError, type AxiosAdapter } from 'axios';
import { api } from '../client';
import { supabase } from '../../supabase';
import { tokenService } from '../../tokenService';
import { useAuthStore } from '../../../stores/auth.store';

jest.mock('../../supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), refreshSession: jest.fn() } },
}));
jest.mock('../../authInvalidation', () => ({
  invalidateLocalAuthSession: jest.fn(),
}));
jest.mock('../../logger', () => ({
  apiLogger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  authLogger: { error: jest.fn() },
}));
jest.mock('../../tokenService', () => ({
  tokenService: { setToken: jest.fn(() => Promise.resolve()) },
}));
jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: { language: 'ru' },
}));

const getSession = jest.mocked(supabase.auth.getSession);
const expiredSession = {
  access_token: 'expired-token',
  refresh_token: 'refresh-token',
  expires_at: 1,
  user: { id: 'user-1', email: 'person@example.com', user_metadata: {} },
} as Session;

describe('protected API session freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().resetAuth();
    useAuthStore.getState().setSession(expiredSession);
    useAuthStore.getState().setAuthState('AUTHORIZED');
  });

  it('uses the renewed Supabase token instead of the expired Zustand token', async () => {
    getSession.mockResolvedValueOnce({
      data: { session: { ...expiredSession, access_token: 'renewed-token' } },
      error: null,
    });
    const adapter: AxiosAdapter = async (config) => {
      expect(config.headers.Authorization).toBe('Bearer renewed-token');
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.get('/user/profile', { adapter });

    expect(tokenService.setToken).toHaveBeenCalledWith('renewed-token');
  });

  it('does not reuse an old token after Supabase loses the session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const adapter = jest.fn();

    await expect(api.get('/user/profile', { adapter })).rejects.toThrow(
      'Authentication required'
    );
    expect(adapter).not.toHaveBeenCalled();
    expect(tokenService.setToken).toHaveBeenCalledWith(null);
  });

  it('does not send a cached token or enter onboarding when refresh fails', async () => {
    getSession.mockRejectedValueOnce(new Error('Refresh unavailable'));
    const adapter = jest.fn();

    await expect(api.get('/user/profile', { adapter })).rejects.toThrow(
      'Refresh unavailable'
    );
    expect(adapter).not.toHaveBeenCalled();
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
  });
});

describe('401 refresh and account boundaries', () => {
  const old = { data: { session: expiredSession }, error: null };
  const renewed = {
    data: { session: { ...expiredSession, access_token: 'new-token' } },
    error: null,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue(old);
    jest.mocked(supabase.auth.refreshSession).mockImplementation(async () => {
      getSession.mockResolvedValue(renewed);
      return renewed;
    });
  });
  const unauthorized: AxiosAdapter = async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      data: {},
      config,
    });
  };
  it('refreshes and retries a protected request exactly once', async () => {
    let attempts = 0;
    const adapter: AxiosAdapter = async (config) => {
      attempts++;
      if (attempts === 1) return unauthorized(config);
      expect(config.headers.Authorization).toBe('Bearer new-token');
      return { status: 200, statusText: 'OK', headers: {}, data: {}, config };
    };
    await api.get('/user/profile', { adapter });
    expect(attempts).toBe(2);
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });
  it('stops after the refreshed token also receives 401', async () => {
    const adapter = jest.fn(unauthorized);
    await expect(api.get('/user/profile', { adapter })).rejects.toThrow(
      'Unauthorized'
    );
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });
  it('does not replay a failed request under a different account', async () => {
    const adapter = jest.fn(async (config) => {
      getSession.mockResolvedValue({
        data: {
          session: {
            ...expiredSession,
            user: { ...expiredSession.user, id: 'other-user' },
          },
        },
        error: null,
      });
      return unauthorized(config);
    });
    await expect(api.get('/user/profile', { adapter })).rejects.toThrow(
      'Unauthorized'
    );
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
});
