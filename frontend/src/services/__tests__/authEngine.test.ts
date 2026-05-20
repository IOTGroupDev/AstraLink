import type { Session } from '@supabase/supabase-js';
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
    | ((event: string, session: Session | null) => Promise<void>)
    | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
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
    await authEventHandler?.('SIGNED_OUT', null);

    const state = useAuthStore.getState();
    expect(state.authState).toBe('AUTHORIZED');
    expect(state.session?.access_token).toBe('access-token');
    expect(mockedSupabaseAuth.signOut).not.toHaveBeenCalled();
  });

  it('does not keep global loading forever when profile load hangs during boot', async () => {
    jest.useFakeTimers();
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    } as any);
    mockedUserAPI.getProfile.mockReturnValue(new Promise(() => undefined));

    const initPromise = AuthEngine.init();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10_000);
    await initPromise;

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.authState).toBe('ONBOARDING');
    expect(state.profile?.id).toBe('user-1');
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
});
