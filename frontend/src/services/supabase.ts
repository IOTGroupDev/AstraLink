// frontend/src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://ayoucajwdyinyhamousz.supabase.co'; // Замените на ваш URL
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3VjYWp3ZHlpbnloYW1vdXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDcyMDcsImV4cCI6MjA3NDI4MzIwN30.S-JOt3sVAEzbZTIEJrHDsKthp3pA5wGsyNEfHfeOrHo'; // Замените на ваш ключ

// Проверяем наличие необходимых переменных окружения
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('❌ SUPABASE_URL не настроен!');
  console.error('Добавьте EXPO_PUBLIC_SUPABASE_URL в .env файл');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('❌ SUPABASE_ANON_KEY не настроен!');
  console.error('Добавьте EXPO_PUBLIC_SUPABASE_ANON_KEY в .env файл');
}

console.log('🔐 Инициализация Supabase клиента');
console.log('📍 URL:', SUPABASE_URL);
console.log(
  '🔑 API Key:',
  SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'НЕ НАЙДЕН'
);

// Создаем redirect URI для OAuth
export const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'myapp', // Замените на схему вашего приложения
  path: 'auth/callback',
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: undefined, // Отключаем - используем tokenService
    autoRefreshToken: false, // Отключаем - управляем вручную
    persistSession: false, // Отключаем - используем tokenService
    detectSessionInUrl: false, // Отключаем для mobile
  },
});
