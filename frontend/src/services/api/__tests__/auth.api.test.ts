import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { authAPI } from '../auth.api';
import { api } from '../client';
import { supabase } from '../../supabase';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'astralink://auth/callback'),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        SUPABASE_YANDEX_PROVIDER: 'custom:yandex',
      },
    },
  },
}));

jest.mock('../../logger', () => ({
  authLogger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../client', () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
      setSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockedOpenAuthSessionAsync =
  WebBrowser.openAuthSessionAsync as jest.MockedFunction<
    typeof WebBrowser.openAuthSessionAsync
  >;

const mockUser = {
  id: 'user-1',
  email: 'person@example.com',
  user_metadata: {
    name: 'Person',
  },
};

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => 'android',
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedSupabaseAuth.setSession.mockResolvedValue({
    data: {
      user: null,
      session: null,
    },
    error: null,
  });
  mockedSupabaseAuth.getUser.mockResolvedValue({
    data: {
      user: mockUser as any,
    },
    error: null,
  });
});

describe('authAPI authorization methods', () => {
  it('sends email OTP through the backend auth endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.sendVerificationCode(' PERSON@Example.COM ');

    expect(result).toEqual({
      success: true,
      message: 'Код отправлен на email',
      flow: 'signup',
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/send-magic-link', {
      email: 'person@example.com',
    });
  });

  it('verifies email OTP through Supabase and ensures backend profile', async () => {
    mockedSupabaseAuth.verifyOtp.mockResolvedValueOnce({
      data: {
        user: mockUser as any,
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.verifyCode('person@example.com', '123456');

    expect(mockedSupabaseAuth.verifyOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      token: '123456',
      type: 'email',
    });
    expect(mockedSupabaseAuth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
      userId: 'user-1',
      email: 'person@example.com',
    });
    expect(result).toEqual({
      access_token: 'access-token',
      user: {
        id: 'user-1',
        email: 'person@example.com',
        name: 'Person',
      },
    });
  });

  it.each([
    ['Google', () => authAPI.googleSignIn(), 'google'],
    ['Apple', () => authAPI.appleSignIn(), 'apple'],
    ['Yandex', () => authAPI.yandexSignIn(), 'custom:yandex'],
  ])(
    'completes %s OAuth through Supabase redirect flow',
    async (_name, signIn, provider) => {
      mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: `https://auth.example.com/${provider}` },
        error: null,
      });
      mockedOpenAuthSessionAsync.mockResolvedValueOnce({
        type: 'success',
        url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
      } as any);
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await signIn();

      expect(mockedSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          options: expect.objectContaining({
            redirectTo: 'astralink://auth/callback',
            skipBrowserRedirect: true,
          }),
        })
      );
      expect(mockedSupabaseAuth.setSession).toHaveBeenCalledWith({
        access_token: 'oauth-access',
        refresh_token: 'oauth-refresh',
      });
      expect(mockedSupabaseAuth.getUser).toHaveBeenCalled();
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
        userId: 'user-1',
        email: 'person@example.com',
      });
      expect(result).toEqual({
        access_token: 'oauth-access',
        user: {
          id: 'user-1',
          email: 'person@example.com',
          name: 'Person',
        },
      });
    }
  );
});
