import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { tokenService } from '../services/tokenService';
import { authLogger } from '../services/logger';

export type AuthState = 'BOOT' | 'UNAUTHORIZED' | 'ONBOARDING' | 'AUTHORIZED';

export interface AuthProfile {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  onboardingCompleted?: boolean;
}

type AuthCompatUser = AuthProfile & {
  role?: string;
};

interface AuthStateStore {
  authState: AuthState;
  session: Session | null;
  profile: AuthProfile | null;
  user: AuthProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;

  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricType: string | null;
  rememberMe: boolean;

  setAuthState: (state: AuthState) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: AuthProfile | null) => void;
  setUser: (user: AuthCompatUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetAuth: () => void;
  login: (user: AuthCompatUser) => void;
  logout: () => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;

  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setRememberMe: (remember: boolean) => Promise<void>;
  checkBiometricSupport: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  initializeSettings: () => Promise<void>;
}

export const useAuthStore = create<AuthStateStore>()(
  persist(
    (set) => ({
      authState: 'BOOT',
      session: null,
      profile: null,
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      onboardingCompleted: false,

      biometricEnabled: false,
      biometricAvailable: false,
      biometricType: null,
      rememberMe: true,

      setAuthState: (state) => set({ authState: state }),
      setSession: (session) =>
        set((state) => ({
          session,
          isAuthenticated: !!session && state.authState !== 'UNAUTHORIZED',
        })),
      setProfile: (profile) =>
        set((state) => ({
          profile,
          user: profile,
          onboardingCompleted: !!profile?.onboardingCompleted,
          isAuthenticated:
            !!profile && state.authState !== 'UNAUTHORIZED'
              ? true
              : state.isAuthenticated,
        })),
      setUser: (user) =>
        set((state) => ({
          user,
          profile: user,
          onboardingCompleted: !!user?.onboardingCompleted,
          isAuthenticated: !!user,
          authState: user
            ? user.onboardingCompleted
              ? 'AUTHORIZED'
              : state.session
                ? 'ONBOARDING'
                : state.authState
            : 'UNAUTHORIZED',
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetAuth: () =>
        set({
          authState: 'UNAUTHORIZED',
          session: null,
          profile: null,
          user: null,
          isLoading: false,
          error: null,
          isAuthenticated: false,
          onboardingCompleted: false,
        }),
      login: (user) =>
        set((state) => ({
          user,
          profile: user,
          isAuthenticated: true,
          onboardingCompleted: !!user.onboardingCompleted,
          authState:
            state.session || user.onboardingCompleted
              ? 'AUTHORIZED'
              : 'ONBOARDING',
          error: null,
        })),
      logout: () =>
        set({
          authState: 'UNAUTHORIZED',
          session: null,
          profile: null,
          user: null,
          isLoading: false,
          error: null,
          isAuthenticated: false,
          onboardingCompleted: false,
        }),
      setOnboardingCompleted: async (completed) => {
        await tokenService.setOnboardingCompleted(completed);
        set((state) => ({
          onboardingCompleted: completed,
          profile: state.profile
            ? { ...state.profile, onboardingCompleted: completed }
            : state.profile,
          user: state.user
            ? { ...state.user, onboardingCompleted: completed }
            : state.user,
          authState: completed
            ? 'AUTHORIZED'
            : state.session || state.profile
              ? 'ONBOARDING'
              : state.authState,
        }));
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

      initializeSettings: async () => {
        try {
          const [biometric, remember] = await Promise.all([
            tokenService.getBiometricEnabled(),
            tokenService.getRememberMe(),
          ]);

          const { available, type } =
            await tokenService.checkBiometricSupport();

          set({
            biometricEnabled: biometric,
            biometricAvailable: available,
            biometricType: type,
            rememberMe: remember,
          });
        } catch (error) {
          authLogger.error('Auth settings initialization error', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

export const useAuthState = () => useAuthStore((state) => state.authState);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthProfile = () => useAuthStore((state) => state.profile);
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () =>
  useAuthStore(
    (state) =>
      state.authState === 'AUTHORIZED' || state.authState === 'ONBOARDING'
  );
export const useBiometricEnabled = () =>
  useAuthStore((state) => state.biometricEnabled);
export const useBiometricAvailable = () =>
  useAuthStore((state) => state.biometricAvailable);
export const useRememberMe = () => useAuthStore((state) => state.rememberMe);

export type User = AuthProfile;
