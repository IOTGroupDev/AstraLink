import { useMemo } from 'react';
import { useAuthLoading, useAuthProfile } from '../stores/auth.store';

type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export function useAuth() {
  const profile = useAuthProfile();
  const isLoading = useAuthLoading();

  const user = useMemo<AuthUser | null>(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
    };
  }, [profile]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
