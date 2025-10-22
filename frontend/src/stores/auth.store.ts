// src/stores/auth.store.ts - С биометрией и настройками
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenService } from '../services/tokenService';

interface User {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializing: boolean;
  error: string | null;

  // Настройки
  onboardingCompleted: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricType: string | null;
  rememberMe: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitializing: (init: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;

  // Settings actions
  setOnboardingCompleted: (completed: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setRememberMe: (remember: boolean) => Promise<void>;
  checkBiometricSupport: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;

  // Initialize
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      initializing: true,
      error: null,

      // Settings
      onboardingCompleted: false,
      biometricEnabled: false,
      biometricAvailable: false,
      biometricType: null,
      rememberMe: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setInitializing: (init) => set({ initializing: init }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      logout: () => {
        tokenService.clearToken();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },

      clearError: () => set({ error: null }),

      // Settings actions
      setOnboardingCompleted: async (completed) => {
        await tokenService.setOnboardingCompleted(completed);
        set({ onboardingCompleted: completed });
      },

      setBiometricEnabled: async (enabled) => {
        await tokenService.setBiometricEnabled(enabled);
        set({ biometricEnabled: enabled });
      },

      setRememberMe: async (remember) => {
        await tokenService.setRememberMe(remember);
        set({ rememberMe: remember });
      },

      checkBiometricSupport: async () => {
        const { available, type } = await tokenService.checkBiometricSupport();
        set({
          biometricAvailable: available,
          biometricType: type,
        });
      },

      authenticateWithBiometrics: async () => {
        return await tokenService.authenticateWithBiometrics();
      },

      // Initialize на старте приложения
      initialize: async () => {
        try {
          set({ initializing: true });

          // Загружаем настройки
          const [onboarding, biometric, remember] = await Promise.all([
            tokenService.getOnboardingCompleted(),
            tokenService.getBiometricEnabled(),
            tokenService.getRememberMe(),
          ]);

          // Проверяем поддержку биометрии
          const { available, type } =
            await tokenService.checkBiometricSupport();

          set({
            onboardingCompleted: onboarding,
            biometricEnabled: biometric,
            biometricAvailable: available,
            biometricType: type,
            rememberMe: remember,
          });

          // Если rememberMe включен, пробуем восстановить сессию
          if (remember) {
            const token = await tokenService.getToken();
            if (token) {
              // Токен есть, пытаемся восстановить user
              // (это будет сделано в App.tsx через API call)
              console.log('🔓 Token found, will restore session');
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ initializing: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
        biometricEnabled: state.biometricEnabled,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

// Selectors for common auth state
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthInitializing = () =>
  useAuthStore((state) => state.initializing);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useOnboardingCompleted = () =>
  useAuthStore((state) => state.onboardingCompleted);
export const useBiometricEnabled = () =>
  useAuthStore((state) => state.biometricEnabled);
export const useBiometricAvailable = () =>
  useAuthStore((state) => state.biometricAvailable);
export const useRememberMe = () => useAuthStore((state) => state.rememberMe);
