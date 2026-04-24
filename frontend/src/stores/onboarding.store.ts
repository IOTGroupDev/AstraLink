// frontend/src/stores/onboarding.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

const onboardingStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(name);
    }

    const secureValue = await SecureStore.getItemAsync(name);
    if (secureValue != null) {
      return secureValue;
    }

    const legacyValue = await AsyncStorage.getItem(name);
    if (legacyValue != null) {
      await SecureStore.setItemAsync(name, legacyValue);
      await AsyncStorage.removeItem(name);
      return legacyValue;
    }

    return null;
  },
  setItem: async (name: string, value: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(name, value);
      return;
    }

    await SecureStore.setItemAsync(name, value);
    await AsyncStorage.removeItem(name);
  },
  removeItem: async (name: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(name);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(name),
      AsyncStorage.removeItem(name),
    ]);
  },
}));

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
      storage: onboardingStorage,
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
