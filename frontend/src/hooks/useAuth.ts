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

    const bootstrap = async () => {
      try {
        const token = await tokenService.getToken();
        if (!mounted) return;

        if (token) {
          // Пытаемся получить профиль пользователя для заполнения user
          try {
            const profile = await userAPI.getProfile();
            if (!mounted) return;
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
            });
          } catch {
            // Если профиль недоступен — считаем, что пользователь неавторизован
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
