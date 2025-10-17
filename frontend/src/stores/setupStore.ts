// frontend/src/stores/setupStore.ts
import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PersistOptions<T extends object> = {
  name: string;
  version?: number;
  partialize?: (state: T) => unknown;
};

export const defaultStorage = createJSONStorage(() => AsyncStorage);

export function withPersist<T extends object>(
  config: StateCreator<T, [], []>,
  options: PersistOptions<T>
): StateCreator<T, [['zustand/persist', unknown]], []> {
  const { name, version, partialize } = options;
  return persist(config, {
    name,
    version,
    partialize,
    storage: defaultStorage,
  });
}

export function createStoreWithMiddleware<T extends object>(
  config: StateCreator<T, [], []>,
  options: PersistOptions<T>
): UseBoundStore<StoreApi<T>> {
  return create(withPersist<T>(config, options));
}
