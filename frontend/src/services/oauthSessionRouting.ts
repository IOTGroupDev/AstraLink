import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth.store';
import { AuthEngine } from './authEngine';

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

  if (!session) return false;

  if (user?.id === session.user.id && user.onboardingCompleted === true) {
    authStore.setProfile({
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: true,
    });
  }

  // A missing flag in an OAuth/OTP response says nothing about an existing
  // profile. Resolve it through the same server lookup used at app startup.
  try {
    await AuthEngine.refreshProfile();
  } catch {
    // AuthEngine preserves a live session on transient profile errors, and
    // clears invalid sessions. Neither case is evidence for onboarding.
  }

  const current = useAuthStore.getState();
  return (
    Boolean(current.session?.access_token) &&
    (current.authState === 'AUTHORIZED' || current.authState === 'ONBOARDING')
  );
}
