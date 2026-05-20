import { applyOAuthSessionToAuthStore } from '../oauthSessionRouting';
import { supabase } from '../supabase';
import { useAuthStore } from '../../stores/auth.store';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockedSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;

describe('applyOAuthSessionToAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().resetAuth();
  });

  it('routes to authorized when OAuth returns an onboarded user', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'user-1',
            email: 'person@example.com',
            user_metadata: {},
          },
        },
      },
      error: null,
    } as any);

    const applied = await applyOAuthSessionToAuthStore({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      onboardingCompleted: true,
    });

    const state = useAuthStore.getState();
    expect(applied).toBe(true);
    expect(state.authState).toBe('AUTHORIZED');
    expect(state.isAuthenticated).toBe(true);
    expect(state.session?.user.id).toBe('user-1');
  });

  it('routes to onboarding when Google created a Supabase session but user normalization failed', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'google-user-1',
            email: 'google@example.com',
            user_metadata: {
              name: 'Google User',
            },
          },
        },
      },
      error: null,
    } as any);

    const applied = await applyOAuthSessionToAuthStore();

    const state = useAuthStore.getState();
    expect(applied).toBe(true);
    expect(state.authState).toBe('ONBOARDING');
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile?.id).toBe('google-user-1');
    expect(state.profile?.email).toBe('google@example.com');
  });

  it('routes to onboarding when OAuth user exists but onboarding state is unknown', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'google-user-1',
            email: 'google@example.com',
            user_metadata: {
              name: 'Google User',
            },
          },
        },
      },
      error: null,
    } as any);

    const applied = await applyOAuthSessionToAuthStore({
      id: 'google-user-1',
      email: 'google@example.com',
      name: 'Google User',
    });

    const state = useAuthStore.getState();
    expect(applied).toBe(true);
    expect(state.authState).toBe('ONBOARDING');
    expect(state.isAuthenticated).toBe(true);
  });

  it('routes to onboarding when OAuth user explicitly has incomplete onboarding', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'google-user-1',
            email: 'google@example.com',
            user_metadata: {},
          },
        },
      },
      error: null,
    } as any);

    const applied = await applyOAuthSessionToAuthStore({
      id: 'google-user-1',
      email: 'google@example.com',
      onboardingCompleted: false,
    });

    const state = useAuthStore.getState();
    expect(applied).toBe(true);
    expect(state.authState).toBe('ONBOARDING');
    expect(state.isAuthenticated).toBe(true);
  });

  it('does not route when no OAuth user or Supabase session exists', async () => {
    mockedSupabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
      error: null,
    } as any);

    const applied = await applyOAuthSessionToAuthStore();

    const state = useAuthStore.getState();
    expect(applied).toBe(false);
    expect(state.authState).toBe('UNAUTHORIZED');
    expect(state.isAuthenticated).toBe(false);
  });
});
