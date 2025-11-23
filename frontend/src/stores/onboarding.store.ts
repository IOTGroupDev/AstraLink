// frontend/src/stores/onboarding.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingData {
  name?: string;
  birthDate?: {
    day: number;
    month: number;
    year: number;
  };
  birthTime?: {
    hour: number;
    minute: number;
  };
  birthPlace?: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  isCompleted: boolean;
}

interface OnboardingStore {
  data: OnboardingData;
  setName: (name: string) => void;
  setBirthDate: (date: { day: number; month: number; year: number }) => void;
  setBirthTime: (time: { hour: number; minute: number }) => void;
  setBirthPlace: (place: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
  setCompleted: (completed: boolean) => void;
  reset: () => void;
}

const initialState: OnboardingData = {
  isCompleted: false,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: initialState,
      setName: (name) =>
        set((state) => ({
          data: { ...state.data, name },
        })),
      setBirthDate: (date) =>
        set((state) => ({
          data: { ...state.data, birthDate: date },
        })),
      setBirthTime: (time) =>
        set((state) => ({
          data: { ...state.data, birthTime: time },
        })),
      setBirthPlace: (place) =>
        set((state) => ({
          data: { ...state.data, birthPlace: place },
        })),
      setCompleted: (completed) =>
        set((state) => ({
          data: { ...state.data, isCompleted: completed },
        })),
      reset: () => set({ data: initialState }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selectors
export const useOnboardingData = () =>
  useOnboardingStore((state) => state.data);
export const useName = () => useOnboardingStore((state) => state.data.name);
export const useBirthDate = () =>
  useOnboardingStore((state) => state.data.birthDate);
export const useBirthTime = () =>
  useOnboardingStore((state) => state.data.birthTime);
export const useBirthPlace = () =>
  useOnboardingStore((state) => state.data.birthPlace);
export const useIsOnboardingCompleted = () =>
  useOnboardingStore((state) => state.data.isCompleted);
