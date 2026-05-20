import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth.store';

export type OAuthRoutingUser = {
  id: string;
  email: string;
  name?: string;
  onboardingCompleted?: boolean;
};

function applySession(session: Session | null): Session | null {
  if (session) {
    useAuthStore.getState().setSession(session);
  }

  return session;
}

export async function applyOAuthSessionToAuthStore(
  user?: OAuthRoutingUser
): Promise<boolean> {
  const authStore = useAuthStore.getState();
  let session: Session | null = null;

  try {
    const { data } = await supabase.auth.getSession();
    session = applySession(data.session ?? null);
  } catch {
    session = null;
  }

  if (user) {
    const onboardingCompleted = !!user.onboardingCompleted;

    authStore.setProfile({
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted,
    });
    authStore.setAuthState(onboardingCompleted ? 'AUTHORIZED' : 'ONBOARDING');
    authStore.setLoading(false);
    authStore.setError(null);
    return true;
  }

  if (session?.user) {
    authStore.setProfile({
      id: session.user.id,
      email: session.user.email || '',
      name: (session.user.user_metadata as any)?.name || '',
      onboardingCompleted: false,
    });
    authStore.setAuthState('ONBOARDING');
    authStore.setLoading(false);
    authStore.setError(null);
    return true;
  }

  return false;
}
