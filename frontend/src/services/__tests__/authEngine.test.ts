import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { AuthEngine } from '../authEngine';
import { supabase } from '../supabase';
import { userAPI } from '../api/user.api';
import { clearAllUserData } from '../cleanupService';
import { notificationService } from '../notifications';
import { useAuthStore } from '../../stores/auth.store';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      startAutoRefresh: jest.fn(() => Promise.resolve()),
      stopAutoRefresh: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../api/user.api', () => ({
  userAPI: {
    getProfile: jest.fn(),
  },
}));

jest.mock('../cleanupService', () => ({
  clearAllUserData: jest.fn(),
}));

jest.mock('../notifications', () => ({
  notificationService: {
    clearCachedPushToken: jest.fn(),
    unregisterCurrentPushToken: jest.fn(),
  },
}));

jest.mock('../logger', () => ({
  authLogger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockedUserAPI = userAPI as jest.Mocked<typeof userAPI>;
const mockedClearAllUserData = clearAllUserData as jest.MockedFunction<
  typeof clearAllUserData
>;
const mockedNotificationService = notificationService as jest.Mocked<
  typeof notificationService
>;

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: {
    id: 'user-1',
    email: 'person@example.com',
    user_metadata: {
      name: 'Person',
    },
  },
} as Session;

describe('AuthEngine stale session handling', () => {
  let authEventHandler:
    | ((event: AuthChangeEvent, session: Session | null) => void)
    | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    authEventHandler = null;
    AuthEngine.dispose();
    useAuthStore.getState().resetAuth();

    mockedSupabaseAuth.signOut.mockResolvedValue({ error: null } as any);
    mockedSupabaseAuth.onAuthStateChange.mockImplementation((callback: any) => {
      authEventHandler = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      } as any;
    });
    mockedClearAllUserData.mockResolvedValue(undefined);
    mockedNotificationService.clearCachedPushToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    AuthEngine.dispose();
    jest.useRealTimers();
  });

  it('clears local auth state when restoring Supabase session throws', async () => {
    mockedSupabaseAuth.getSession.mockRejectedValueOnce(
      new Error('SecureStore key is invalid')
    );

    await AuthEngine.init();

    const state = useAuthStore.getState();
    expect(mockedSupabaseAuth.signOut).toHaveBeenCalledWith({
      scope: 'local',
    });
    expect(mockedClearAllUserData).toHaveBeenCalled();
    expect(mockedNotificationService.clearCachedPushToken).toHaveBeenCalled();
    expect(state.authState).toBe('UNAUTHORIZED');
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
  });

  it('clears local auth state when restored session profile no longer exists', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    } as any);
    mockedUserAPI.getProfile.mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          message: 'Пользователь не найден',
        },
      },
    });

    await AuthEngine.init();

    const state = useAuthStore.getState();
    expect(mockedUserAPI.getProfile).toHaveBeenCalled();
    expect(mockedSupabaseAuth.signOut).toHaveBeenCalledWith({
      scope: 'local',
    });
    expect(mockedClearAllUserData).toHaveBeenCalled();
    expect(state.authState).toBe('UNAUTHORIZED');
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
  });

  it('ignores a null auth event when a current Supabase session already exists', async () => {
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({
        data: {
          session,
        },
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: {
          session,
        },
        error: null,
      } as any);
    mockedUserAPI.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Moscow',
    } as any);

    await AuthEngine.init();
    authEventHandler?.('SIGNED_OUT', null);
    await jest.advanceTimersByTimeAsync(0);

    const state = useAuthStore.getState();
    expect(state.authState).toBe('AUTHORIZED');
    expect(state.session?.access_token).toBe('access-token');
    expect(mockedSupabaseAuth.signOut).not.toHaveBeenCalled();
  });

  it('keeps boot blocked and retries when no profile is available', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    } as any);
    mockedUserAPI.getProfile.mockRejectedValueOnce(
      new Error('Network unavailable')
    );

    await AuthEngine.init();

    expect(useAuthStore.getState().authState).toBe('BOOT');
    expect(useAuthStore.getState().profile).toBeNull();
    expect(useAuthStore.getState().error).toBe('profile_load_failed');

    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    } as any);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    } as any);

    await jest.advanceTimersByTimeAsync(5_000);

    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
    expect(useAuthStore.getState().profile?.onboardingCompleted).toBe(true);
  });

  it('does not downgrade an already authorized user when background profile refresh times out', async () => {
    jest.useFakeTimers();
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().setProfile({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Moscow',
      onboardingCompleted: true,
    });
    useAuthStore.getState().setAuthState('AUTHORIZED');

    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    } as any);
    mockedUserAPI.getProfile.mockReturnValue(new Promise(() => undefined));

    const refreshPromise = AuthEngine.refreshProfileInBackground();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10_000);
    await refreshPromise;

    const state = useAuthStore.getState();
    expect(state.authState).toBe('AUTHORIZED');
    expect(state.profile?.birthDate).toBe('1990-01-01');
  });

  it('opens login when the saved session can no longer be refreshed', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Refresh token expired' },
    } as never);

    await AuthEngine.init();

    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockedUserAPI.getProfile).not.toHaveBeenCalled();
  });

  it('restores a completed profile without repeating onboarding', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    } as never);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Moscow',
    } as never);

    await AuthEngine.init();

    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
  });

  it('honors server completion when a partial profile omits birth fields', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    } as never);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    } as never);

    await AuthEngine.init();

    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it('rotates a token without reloading the profile or switching screens', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    } as never);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    } as never);
    await AuthEngine.init();
    const profile = useAuthStore.getState().profile;
    mockedUserAPI.getProfile.mockClear();

    const result = authEventHandler?.('TOKEN_REFRESHED', {
      ...session,
      access_token: 'renewed-token',
    });
    expect(result).toBeUndefined();
    await jest.advanceTimersByTimeAsync(0);

    expect(useAuthStore.getState().session?.access_token).toBe('renewed-token');
    expect(useAuthStore.getState().profile).toBe(profile);
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
    expect(mockedUserAPI.getProfile).not.toHaveBeenCalled();
  });

  it('opens login on session loss and does not start onboarding', async () => {
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({ data: { session }, error: null } as never)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    } as never);
    await AuthEngine.init();

    authEventHandler?.('SIGNED_OUT', null);
    await jest.advanceTimersByTimeAsync(0);

    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('does not restore a profile response that arrives after sign-out', async () => {
    mockedSupabaseAuth.getSession
      .mockResolvedValueOnce({ data: { session }, error: null } as never)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    mockedUserAPI.getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    } as never);
    await AuthEngine.init();

    let finishProfile!: (
      profile: Awaited<ReturnType<typeof userAPI.getProfile>>
    ) => void;
    mockedUserAPI.getProfile.mockReturnValueOnce(
      new Promise((resolve) => {
        finishProfile = resolve;
      })
    );
    authEventHandler?.('SIGNED_IN', session);
    await jest.advanceTimersByTimeAsync(0);
    authEventHandler?.('SIGNED_OUT', null);
    await jest.advanceTimersByTimeAsync(0);
    finishProfile({ id: 'user-1', email: 'person@example.com' } as never);
    await jest.advanceTimersByTimeAsync(0);

    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('resumes token auto-refresh on foreground and removes its listener on dispose', async () => {
    const remove = jest.fn();
    const listener = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove });
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);
    try {
      await AuthEngine.init();
      const onChange = listener.mock.calls[0][1];
      onChange('active');
      expect(mockedSupabaseAuth.startAutoRefresh).toHaveBeenCalled();
      onChange('background');
      expect(mockedSupabaseAuth.stopAutoRefresh).toHaveBeenCalled();
      AuthEngine.dispose();
      expect(remove).toHaveBeenCalled();
    } finally {
      listener.mockRestore();
    }
  });
});
