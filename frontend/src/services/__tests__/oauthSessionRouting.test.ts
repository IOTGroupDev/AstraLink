import type { Session } from '@supabase/supabase-js';
import { applyOAuthSessionToAuthStore } from '../oauthSessionRouting';
import { supabase } from '../supabase';
import { userAPI } from '../api/user.api';
import { useAuthStore } from '../../stores/auth.store';

jest.mock('../supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), signOut: jest.fn() } },
}));
jest.mock('../api/user.api', () => ({ userAPI: { getProfile: jest.fn() } }));
jest.mock('../cleanupService', () => ({ clearAllUserData: jest.fn() }));
jest.mock('../notifications', () => ({
  notificationService: { clearCachedPushToken: jest.fn() },
}));

const auth = jest.mocked(supabase.auth);
const getProfile = jest.mocked(userAPI.getProfile);
const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: { id: 'user-1', email: 'person@example.com', user_metadata: {} },
} as Session;
const completeProfile = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Person',
  birthDate: '1990-01-01',
  birthTime: '12:00',
  birthPlace: 'Moscow',
};

describe('post-login profile routing for OAuth and OTP', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useAuthStore.getState().resetAuth();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    getProfile.mockResolvedValue(completeProfile as never);
  });

  it('restores an existing completed account when the login response has no profile', async () => {
    expect(await applyOAuthSessionToAuthStore()).toBe(true);
    expect(getProfile).toHaveBeenCalled();
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
    expect(useAuthStore.getState().profile?.birthPlace).toBe('Moscow');
  });

  it('checks the server when completion is absent from the login response', async () => {
    await applyOAuthSessionToAuthStore({
      id: 'user-1',
      email: 'person@example.com',
    });
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
  });

  it('does not trust a fallback incomplete flag over the saved server profile', async () => {
    await applyOAuthSessionToAuthStore({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: false,
    });
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
  });

  it('starts onboarding for a confirmed incomplete server profile', async () => {
    getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: false,
    } as never);
    expect(await applyOAuthSessionToAuthStore()).toBe(true);
    expect(useAuthStore.getState().authState).toBe('ONBOARDING');
  });

  it('keeps completion if profile loading fails after an onboarded login response', async () => {
    getProfile.mockRejectedValueOnce(new Error('Network unavailable'));
    await applyOAuthSessionToAuthStore({
      id: 'user-1',
      email: 'person@example.com',
      onboardingCompleted: true,
    });
    expect(useAuthStore.getState().authState).toBe('AUTHORIZED');
    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
    expect(useAuthStore.getState().error).toBe('profile_load_failed');
  });

  it('does not treat a temporary server failure as an incomplete profile', async () => {
    getProfile.mockRejectedValueOnce(new Error('Network unavailable'));
    await applyOAuthSessionToAuthStore();
    expect(useAuthStore.getState().authState).not.toBe('ONBOARDING');
    expect(useAuthStore.getState().error).toBe('profile_load_failed');
  });

  it('returns to login if the session is rejected during profile loading', async () => {
    getProfile.mockRejectedValueOnce({ response: { status: 401 } });
    expect(await applyOAuthSessionToAuthStore()).toBe(false);
    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('does not route without an active Supabase session', async () => {
    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    expect(await applyOAuthSessionToAuthStore()).toBe(false);
    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('ignores completion from a different account', async () => {
    getProfile.mockResolvedValueOnce({
      id: 'user-1',
      email: 'person@example.com',
    } as never);
    await applyOAuthSessionToAuthStore({
      id: 'other-user',
      email: 'other@example.com',
      onboardingCompleted: true,
    });
    expect(useAuthStore.getState().authState).toBe('ONBOARDING');
    expect(useAuthStore.getState().profile?.id).toBe('user-1');
  });
});
