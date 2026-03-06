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

interface AuthStateStore {
  authState: AuthState;
  session: Session | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  error: string | null;

  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricType: string | null;
  rememberMe: boolean;

  setAuthState: (state: AuthState) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: AuthProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetAuth: () => void;

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
      isLoading: false,
      error: null,

      biometricEnabled: false,
      biometricAvailable: false,
      biometricType: null,
      rememberMe: true,

      setAuthState: (state) => set({ authState: state }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      resetAuth: () =>
        set({
          authState: 'UNAUTHORIZED',
          session: null,
          profile: null,
          isLoading: false,
          error: null,
        }),

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
