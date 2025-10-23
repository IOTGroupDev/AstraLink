/**
 * frontend/src/services/supabase.ts
 * Конфигурация Supabase клиента для OTP-потока:
 * - PKCE включён (не мешает OTP и пригодится для OAuth)
 * - autoRefreshToken: true
 * - persistSession: true
 * - detectSessionInUrl: false (OTP не требует разбор URL)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://ayoucajwdyinyhamousz.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3VjYWp3ZHlpbnloYW1vdXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDcyMDcsImV4cCI6MjA3NDI4MzIwN30.S-JOt3sVAEzbZTIEJrHDsKthp3pA5wGsyNEfHfeOrHo';

if (!SUPABASE_URL) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL не настроен!');
}
if (!SUPABASE_ANON_KEY) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY не настроен!');
}

console.log('🔐 Инициализация Supabase клиента (OTP)');
console.log('📍 URL:', SUPABASE_URL);
console.log(
  '🔑 API Key:',
  SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'НЕ НАЙДЕН'
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
