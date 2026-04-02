import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { userAPI } from './api/user.api';
import { authLogger } from './logger';
import { notificationService } from './notifications';
import { useAuthStore, type AuthProfile } from '../stores/auth.store';

export type AuthState = 'BOOT' | 'UNAUTHORIZED' | 'ONBOARDING' | 'AUTHORIZED';

let engineInitialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;

const needsOnboarding = (profile: AuthProfile | null): boolean => {
  return !profile?.birthDate || !profile?.birthTime || !profile?.birthPlace;
};

const setState = (state: AuthState) => {
  useAuthStore.getState().setAuthState(state);
};

const setSession = (session: Session | null) => {
  useAuthStore.getState().setSession(session);
};

const setProfile = (profile: AuthProfile | null) => {
  useAuthStore.getState().setProfile(profile);
};

const setLoading = (value: boolean) => {
  useAuthStore.getState().setLoading(value);
};

const setError = (message: string | null) => {
  useAuthStore.getState().setError(message);
};

const normalizeProfile = (raw: any): AuthProfile => ({
  id: raw.id,
  email: raw.email,
  name: raw.name || undefined,
  birthDate: raw.birthDate || undefined,
  birthTime: raw.birthTime || undefined,
  birthPlace: raw.birthPlace || undefined,
  onboardingCompleted: !needsOnboarding(raw),
});

const profileFromSession = (session: Session): AuthProfile => ({
  id: session.user.id,
  email: session.user.email || '',
  name: (session.user.user_metadata as any)?.name || undefined,
  birthDate: undefined,
  birthTime: undefined,
  birthPlace: undefined,
  onboardingCompleted: false,
});

const resolveState = (profile: AuthProfile | null) => {
  if (!profile) {
    setState('UNAUTHORIZED');
    return;
  }
  setState(needsOnboarding(profile) ? 'ONBOARDING' : 'AUTHORIZED');
};

const fetchProfile = async (): Promise<AuthProfile | null> => {
  const profile = await userAPI.getProfile();
  return normalizeProfile(profile);
};

const applyFallbackProfileState = (session: Session) => {
  const fallbackProfile = profileFromSession(session);
  setProfile(fallbackProfile);
  setError('profile_load_failed');
  resolveState(fallbackProfile);
};

const bootstrap = async () => {
  setLoading(true);
  setError(null);
  setState('BOOT');

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    authLogger.error('Session restore error', error);
  }

  const session = data.session ?? null;
  setSession(session);

  if (!session) {
    setProfile(null);
    setLoading(false);
    setState('UNAUTHORIZED');
    return;
  }

  try {
    const profile = await fetchProfile();
    setProfile(profile);
    resolveState(profile);
  } catch (err) {
    authLogger.error('Profile load failed during boot', err);
    applyFallbackProfileState(session);
  } finally {
    setLoading(false);
  }
};

const handleAuthEvent = async (event: string, session: Session | null) => {
  authLogger.log('Auth event', event);

  setError(null);
  setSession(session);

  if (!session) {
    setProfile(null);
    setError(null);
    setState('UNAUTHORIZED');
    return;
  }

  try {
    const profile = await fetchProfile();
    setProfile(profile);
    resolveState(profile);
  } catch (err) {
    authLogger.error('Profile load failed after auth event', err);
    if (session) {
      applyFallbackProfileState(session);
    } else {
      setProfile(null);
      setError('profile_load_failed');
      setState('UNAUTHORIZED');
    }
  }
};

export const AuthEngine = {
  async init() {
    if (engineInitialized) return;
    engineInitialized = true;

    await useAuthStore.getState().initializeSettings();

    await bootstrap();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleAuthEvent(event, session);
    });

    authSubscription = data?.subscription ?? null;
  },

  async refreshProfile() {
    try {
      setLoading(true);
      setError(null);
      const profile = await fetchProfile();
      setProfile(profile);
      resolveState(profile);
    } finally {
      setLoading(false);
    }
  },

  async refreshProfileInBackground() {
    try {
      setError(null);
      const profile = await fetchProfile();
      setProfile(profile);
      resolveState(profile);
    } catch (err) {
      authLogger.warn('Background profile refresh failed', err);
    }
  },

  async signOut() {
    try {
      await notificationService.unregisterCurrentPushToken();
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setProfile(null);
      setState('UNAUTHORIZED');
      await notificationService.clearCachedPushToken();
    }
  },

  async deleteAccount() {
    await this.signOut();
  },

  dispose() {
    authSubscription?.unsubscribe();
    authSubscription = null;
    engineInitialized = false;
  },
};
