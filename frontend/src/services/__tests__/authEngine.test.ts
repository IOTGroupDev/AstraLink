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
  beforeEach(() => {
    jest.clearAllMocks();
    AuthEngine.dispose();
    useAuthStore.getState().resetAuth();

    mockedSupabaseAuth.signOut.mockResolvedValue({ error: null } as any);
    mockedSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    } as any);
    mockedClearAllUserData.mockResolvedValue(undefined);
    mockedNotificationService.clearCachedPushToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    AuthEngine.dispose();
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
});
