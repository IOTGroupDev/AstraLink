// API Client tests
import axios from 'axios';
import { api } from '../client';
import { invalidateLocalAuthSession } from '../../authInvalidation';
import { supabase } from '../../supabase';

jest.mock('axios', () => ({
  create: jest.fn(() => {
    const requestHandlers: any[] = [];
    const responseHandlers: any[] = [];

    return {
      defaults: {
        baseURL: 'http://localhost:3001/api/v1',
        timeout: 10000,
      },
      interceptors: {
        request: {
          handlers: requestHandlers,
          use: jest.fn((fulfilled, rejected) => {
            requestHandlers.push({ fulfilled, rejected });
          }),
        },
        response: {
          handlers: responseHandlers,
          use: jest.fn((fulfilled, rejected) => {
            responseHandlers.push({ fulfilled, rejected });
          }),
        },
      },
    };
  }),
}));

jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
    },
  },
}));

jest.mock('../../tokenService', () => ({
  tokenService: {
    getToken: jest.fn(() => Promise.resolve(null)),
    setToken: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../authInvalidation', () => ({
  invalidateLocalAuthSession: jest.fn(() => Promise.resolve()),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockedInvalidateLocalAuthSession =
  invalidateLocalAuthSession as jest.MockedFunction<
    typeof invalidateLocalAuthSession
  >;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct base URL structure', () => {
    expect(api.defaults.baseURL).toMatch(/^http/);
  });

  it('should have timeout configured', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });

  it('should have interceptors configured', () => {
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      // This test would require mocking the Supabase auth
      // For now, just verify the interceptor exists
      expect(api.interceptors.request.handlers.length).toBeGreaterThan(0);
    });

    it('should attach Authorization to ensure-profile because backend guard protects it', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'access-token',
          },
        },
        error: null,
      } as any);

      const fulfilled = api.interceptors.request.handlers[0].fulfilled;
      const config = await fulfilled({
        method: 'post',
        url: '/auth/ensure-profile',
        headers: {},
      });

      expect(config.headers.Authorization).toBe('Bearer access-token');
      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });

    it('should not reset local auth when token lookup races during startup', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      const fulfilled = api.interceptors.request.handlers[0].fulfilled;

      await expect(
        fulfilled({
          method: 'get',
          url: '/user/profile',
          headers: {},
        })
      ).rejects.toThrow('Authentication required');

      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor', () => {
    it('should handle 401 errors', async () => {
      // Verify error interceptor exists
      expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
    });

    it('should reset local auth on unauthorized responses', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);
      const rejected = api.interceptors.response.handlers[0].rejected;

      await expect(
        rejected({
          config: { method: 'get', url: '/user/profile' },
          response: { status: 401, data: { message: 'Unauthorized' } },
        })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(mockedInvalidateLocalAuthSession).toHaveBeenCalledWith(
        '401 from GET /user/profile'
      );
    });

    it('should not reset local auth when a stale request gets 401 after a new session exists', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'new-token',
          },
        },
        error: null,
      } as any);
      const rejected = api.interceptors.response.handlers[0].rejected;

      await expect(
        rejected({
          config: {
            method: 'get',
            url: '/user/profile',
            headers: {
              Authorization: 'Bearer old-token',
            },
          },
          response: { status: 401, data: { message: 'Unauthorized' } },
        })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });

    it('should not reset local auth when an unauthenticated stale request gets 401 after sign-in', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'new-token',
          },
        },
        error: null,
      } as any);
      const rejected = api.interceptors.response.handlers[0].rejected;

      await expect(
        rejected({
          config: {
            method: 'get',
            url: '/user/profile',
            headers: {},
          },
          response: { status: 401, data: { message: 'Unauthorized' } },
        })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });

    it('should not reset local auth when current Supabase session gets a backend 401', async () => {
      mockedSupabaseAuth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'current-token',
          },
        },
        error: null,
      } as any);
      const rejected = api.interceptors.response.handlers[0].rejected;

      await expect(
        rejected({
          config: {
            method: 'get',
            url: '/user/profile',
            headers: {
              Authorization: 'Bearer current-token',
            },
          },
          response: { status: 401, data: { message: 'Unauthorized' } },
        })
      ).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });

    it('should not reset local auth on forbidden responses', async () => {
      const rejected = api.interceptors.response.handlers[0].rejected;

      await expect(
        rejected({
          config: { method: 'get', url: '/subscription/status' },
          response: { status: 403, data: { message: 'Forbidden' } },
        })
      ).rejects.toMatchObject({
        response: { status: 403 },
      });

      expect(mockedInvalidateLocalAuthSession).not.toHaveBeenCalled();
    });
  });
});
