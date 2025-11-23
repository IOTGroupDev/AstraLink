import { useEffect, useState } from 'react';
import { tokenService } from '../services/tokenService';
import { userAPI } from '../services/api';

type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applyProfile = async (token: string | null) => {
      if (!mounted) return;
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const profile = await userAPI.getProfile();
        if (!mounted) return;
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
        });
      } catch {
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Initial load (resolves expired token via tokenService)
    tokenService.getToken().then((t) => applyProfile(t));

    // React to token changes (login/logout/expired-cleared)
    const unsubscribe = tokenService.subscribe((t) => {
      setIsLoading(true);
      void applyProfile(t);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
