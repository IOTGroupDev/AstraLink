import { Platform } from 'react-native';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../auth.api';
import { api } from '../client';
import { supabase } from '../../supabase';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  dismissBrowser: jest.fn(),
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

jest.mock('../../tokenService', () => ({
  tokenService: {
    setToken: jest.fn(),
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
      exchangeCodeForSession: jest.fn(),
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
const mockedGetInitialURL = Linking.getInitialURL as jest.MockedFunction<
  typeof Linking.getInitialURL
>;
const mockedFetch = jest.fn();

const mockUser = {
  id: 'user-1',
  email: 'person@example.com',
  user_metadata: {
    name: 'Person',
  },
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => 'android',
  });
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  global.fetch = mockedFetch as any;
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
  mockedSupabaseAuth.getSession.mockResolvedValue({
    data: {
      session: null,
    },
    error: null,
  });
  mockedGetInitialURL.mockResolvedValue(null);
  mockedFetch.mockReset();
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

  it('normalizes backend OTP rate limits instead of surfacing a raw 403', async () => {
    const error: any = new Error('Request failed with status code 403');
    error.response = {
      status: 403,
      data: {
        message:
          'Too many magic link requests from this IP. Please try again later.',
        retryAfter: Date.now() + 90_000,
      },
      headers: {},
    };
    mockedApi.post.mockRejectedValueOnce(error);

    await expect(
      authAPI.sendVerificationCode('person@example.com')
    ).rejects.toMatchObject({
      code: 'email_rate_limit_exceeded',
      status: 429,
      retryAfterSec: expect.any(Number),
      message: expect.stringContaining('Лимит отправки писем исчерпан'),
    });
  });

  it('clears stale long OTP backoff and still calls backend', async () => {
    await AsyncStorage.setItem(
      'al_otp_rate_limit_v1',
      JSON.stringify({
        lastAtMs: Date.now(),
        backoffSec: 1200,
      })
    );
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    await expect(
      authAPI.sendVerificationCode('person@example.com')
    ).resolves.toMatchObject({
      success: true,
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

  it('completes Google OAuth from native Linking callback when browser promise stays pending', async () => {
    let linkingHandler: ((event: { url: string }) => void) | null = null;
    const remove = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_type, handler) => {
        linkingHandler = handler as (event: { url: string }) => void;
        return { remove } as any;
      });

    try {
      mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.example.com/google' },
        error: null,
      });
      mockedOpenAuthSessionAsync.mockImplementationOnce(
        () => new Promise(() => {}) as any
      );
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const resultPromise = authAPI.googleSignIn();
      await flushPromises();

      expect(linkingHandler).toBeTruthy();
      linkingHandler?.({
        url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
      });

      const result = await resultPromise;

      expect(mockedSupabaseAuth.setSession).toHaveBeenCalledWith({
        access_token: 'oauth-access',
        refresh_token: 'oauth-refresh',
      });
      expect(remove).toHaveBeenCalled();
      expect(result.access_token).toBe('oauth-access');
      expect(result.user.email).toBe('person@example.com');
    } finally {
      addEventListenerSpy.mockRestore();
    }
  });

  it('completes Google OAuth even when backend ensure-profile hangs', async () => {
    jest.useFakeTimers();

    try {
      mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.example.com/google' },
        error: null,
      });
      mockedOpenAuthSessionAsync.mockResolvedValueOnce({
        type: 'success',
        url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
      } as any);
      mockedApi.post.mockReturnValueOnce(new Promise(() => undefined));

      const resultPromise = authAPI.googleSignIn();
      await flushPromises();
      await jest.advanceTimersByTimeAsync(10_000);

      const result = await resultPromise;

      expect(result).toEqual({
        access_token: 'oauth-access',
        user: {
          id: 'user-1',
          email: 'person@example.com',
          name: 'Person',
          onboardingCompleted: false,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('completes Google OAuth when Supabase session appears without a callback URL', async () => {
    jest.useFakeTimers();

    try {
      mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.example.com/google' },
        error: null,
      });
      mockedOpenAuthSessionAsync.mockImplementationOnce(
        () => new Promise(() => {}) as any
      );
      mockedSupabaseAuth.getSession
        .mockResolvedValueOnce({
          data: {
            session: null,
          },
          error: null,
        })
        .mockResolvedValue({
          data: {
            session: {
              access_token: 'oauth-access',
              refresh_token: 'oauth-refresh',
            },
          },
          error: null,
        } as any);
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const resultPromise = authAPI.googleSignIn();
      await flushPromises();
      await jest.advanceTimersByTimeAsync(300);

      const result = await resultPromise;

      expect(mockedSupabaseAuth.setSession).not.toHaveBeenCalled();
      expect(result.access_token).toBe('oauth-access');
      expect(result.user.email).toBe('person@example.com');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not fail Google OAuth when session recovery hits a transient storage error', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/google' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'astralink://auth/callback?session_established=1',
    } as any);
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({
        data: {
          session: null,
        },
        error: null,
      })
      .mockRejectedValueOnce(new Error('SecureStore key is invalid'))
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'oauth-access',
            refresh_token: 'oauth-refresh',
          },
        },
        error: null,
      } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.googleSignIn();

    expect(result.access_token).toBe('oauth-access');
    expect(result.user.email).toBe('person@example.com');
  });

  it('uses email fallback from Yandex provider metadata when user.email is missing', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/custom:yandex' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
    } as any);
    mockedSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: null,
          user_metadata: {
            name: 'Yandex User',
            email: 'yandex@example.com',
          },
          identities: [
            {
              identity_data: {
                email: 'yandex@example.com',
              },
            },
          ],
        },
      },
      error: null,
    } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.yandexSignIn();

    expect(mockedSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'custom:yandex',
        options: expect.objectContaining({
          redirectTo: 'astralink://auth/callback',
          skipBrowserRedirect: true,
          scopes: 'login:email login:info',
          queryParams: {
            scope: 'login:email login:info',
          },
        }),
      })
    );
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
      userId: 'user-1',
      email: 'yandex@example.com',
    });
    expect(result).toEqual({
      access_token: 'oauth-access',
      user: {
        id: 'user-1',
        email: 'yandex@example.com',
        name: 'Yandex User',
      },
    });
  });

  it('completes Yandex OAuth from native Linking callback when browser promise stays pending', async () => {
    let linkingHandler: ((event: { url: string }) => void) | null = null;
    const remove = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_type, handler) => {
        linkingHandler = handler as (event: { url: string }) => void;
        return { remove } as any;
      });

    try {
      mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.example.com/custom:yandex' },
        error: null,
      });
      mockedOpenAuthSessionAsync.mockImplementationOnce(
        () => new Promise(() => {}) as any
      );
      mockedSupabaseAuth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-1',
            email: null,
            user_metadata: {
              name: 'Yandex User',
              email: 'yandex-linking@example.com',
            },
            identities: [],
          },
        },
        error: null,
      } as any);
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const resultPromise = authAPI.yandexSignIn();
      await flushPromises();

      expect(linkingHandler).toBeTruthy();
      linkingHandler?.({
        url: 'astralink://auth/callback#access_token=yandex-access&refresh_token=yandex-refresh',
      });

      const result = await resultPromise;

      expect(mockedSupabaseAuth.setSession).toHaveBeenCalledWith({
        access_token: 'yandex-access',
        refresh_token: 'yandex-refresh',
      });
      expect(remove).toHaveBeenCalled();
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
        userId: 'user-1',
        email: 'yandex-linking@example.com',
      });
      expect(result.access_token).toBe('yandex-access');
      expect(result.user.email).toBe('yandex-linking@example.com');
    } finally {
      addEventListenerSpy.mockRestore();
    }
  });

  it('uses email fallback from Yandex login metadata when user.email is missing', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/custom:yandex' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
    } as any);
    mockedSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: null,
          user_metadata: {
            name: 'Yandex User',
            login: 'yandex-login@example.com',
          },
          identities: [],
        },
      },
      error: null,
    } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.yandexSignIn();

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
      userId: 'user-1',
      email: 'yandex-login@example.com',
    });
    expect(result).toEqual({
      access_token: 'oauth-access',
      user: {
        id: 'user-1',
        email: 'yandex-login@example.com',
        name: 'Yandex User',
      },
    });
  });

  it('uses email fallback from Yandex identities when user.email is missing', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/custom:yandex' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
    } as any);
    mockedSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: null,
          user_metadata: {
            name: 'Yandex User',
          },
          identities: [
            {
              identity_data: {
                email: 'identity-yandex@example.com',
              },
            },
          ],
        },
      },
      error: null,
    } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.yandexSignIn();

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
      userId: 'user-1',
      email: 'identity-yandex@example.com',
    });
    expect(result).toEqual({
      access_token: 'oauth-access',
      user: {
        id: 'user-1',
        email: 'identity-yandex@example.com',
        name: 'Yandex User',
      },
    });
  });

  it('uses Yandex userinfo when Supabase metadata does not include email', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/custom:yandex' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'astralink://auth/callback#access_token=oauth-access&refresh_token=oauth-refresh',
    } as any);
    mockedSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: null,
          user_metadata: {
            name: 'Yandex User',
            login: 'yandex-login',
          },
          identities: [],
        },
      },
      error: null,
    } as any);
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({
        data: {
          session: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'oauth-access',
            refresh_token: 'oauth-refresh',
            provider_token: 'yandex-provider-token',
          },
        },
        error: null,
      } as any);
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ default_email: 'userinfo-yandex@example.com' }),
    });
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.yandexSignIn();

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://login.yandex.ru/info?format=json',
      {
        headers: {
          Authorization: 'OAuth yandex-provider-token',
        },
      }
    );
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/ensure-profile', {
      userId: 'user-1',
      email: 'userinfo-yandex@example.com',
    });
    expect(result.user.email).toBe('userinfo-yandex@example.com');
  });

  it('completes Yandex OAuth when the code is nested in a redirect URL param', async () => {
    mockedSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://auth.example.com/custom:yandex' },
      error: null,
    });
    mockedOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: `astralink://auth/callback?redirect_to=${encodeURIComponent(
        'astralink://auth/callback?code=oauth-code'
      )}`,
    } as any);
    mockedSupabaseAuth.exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        user: null,
        session: null,
      },
      error: null,
    } as any);
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({
        data: {
          session: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'oauth-access',
            refresh_token: 'oauth-refresh',
          },
        },
        error: null,
      } as any);
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await authAPI.yandexSignIn();

    expect(mockedSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith(
      'oauth-code'
    );
    expect(result.access_token).toBe('oauth-access');
  });
});
