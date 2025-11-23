// src/providers/QueryProvider.tsx
import React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// ✅ Настройка focusManager для React Native
focusManager.setEventListener((handleFocus) => {
  if (Platform.OS !== 'web') {
    const subscription = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });

    return () => {
      subscription.remove();
    };
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnReconnect: true,
      // ✅ Теперь можно включить - будет использовать AppState
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
