import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Создаем клиент с оптимальными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут - данные считаются свежими
      gcTime: 1000 * 60 * 30, // 30 минут - кэш хранится в памяти
      retry: 2, // Повторить запрос 2 раза при ошибке
      refetchOnWindowFocus: false, // Не обновлять при фокусе окна
      refetchOnReconnect: true, // Обновить при восстановлении сети
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
