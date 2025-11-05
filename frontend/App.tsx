// App.tsx
// Гейт запуска UI: не рендерим навигацию, пока не загрузили токен из storage.

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { initSupabaseSync } from './src/services/supabase';

const queryClient = new QueryClient();

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log('🚀 Starting app initialization...');

        // Инициализируем Supabase (который инициализирует tokenService внутри)
        await initSupabaseSync();

        console.log('✅ App initialization complete');
      } catch (err) {
        console.error('❌ App initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  if (!booted) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Загрузка приложения...
        </Text>
        {error && (
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: '#ef4444',
              textAlign: 'center',
            }}
          >
            Ошибка: {error}
          </Text>
        )}
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <MainStackNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
