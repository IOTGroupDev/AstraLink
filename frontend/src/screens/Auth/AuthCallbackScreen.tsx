import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import CosmicBackground from '../../components/CosmicBackground';
import { tokenService } from '../../services/tokenService';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useOnboardingStore } from '../../stores/onboarding.store';

const AuthCallbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const { setCompleted: setOnboardingCompleted } = useOnboardingStore();
  const onboardingData = useOnboardingStore((state) => state.data);

  useEffect(() => {
    handleCallback();
  }, []);

  /**
   * Проверяет, нужен ли пользователю онбординг
   */
  const needsOnboarding = (profile: any): boolean => {
    const needs =
      !profile?.birth_date || !profile?.birth_time || !profile?.birth_place;
    console.log('🔍 needsOnboarding check:', {
      profile: profile ? 'exists' : 'null',
      birth_date: profile?.birth_date || 'missing',
      birth_time: profile?.birth_time || 'missing',
      birth_place: profile?.birth_place || 'missing',
      result: needs,
    });
    return needs;
  };

  const handleCallback = async () => {
    try {
      console.log('🔍 ========== AUTH CALLBACK START ==========');

      // Парсим токены из URL hash (только для web)
      if (Platform.OS === 'web') {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('📍 URL Parameters:', {
          type,
          hasAccessToken: !!accessToken,
          tokenPreview: accessToken?.substring(0, 30) + '...',
        });

        if (!accessToken) {
          throw new Error('Токен не найден в URL');
        }

        // Устанавливаем сессию в Supabase
        console.log('🔐 Setting session...');
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (!sessionData.session || !sessionData.user) {
          throw new Error('Не удалось создать сессию');
        }

        console.log('✅ Session established:', {
          userId: sessionData.user.id,
          email: sessionData.user.email,
        });

        // Сохраняем токен
        await tokenService.setToken(accessToken);
        console.log('💾 Token saved to TokenService');

        // КРИТИЧНО: Проверяем профиль в базе данных
        console.log('👤 Fetching user profile from database...');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Profile fetch error:', profileError);
          // Не прерываем выполнение, считаем что профиля нет
        }

        console.log('📊 Profile data:', {
          found: !!profile,
          profileData: profile
            ? {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                birth_date: profile.birth_date,
                birth_time: profile.birth_time,
                birth_place: profile.birth_place,
              }
            : 'Profile not found',
        });

        // Определяем тип пользователя
        // ИСПРАВЛЕНИЕ: type === 'magiclink' НЕ означает нового пользователя
        // Проверяем только наличие профиля в базе
        const isNewUser = !profile;
        const hasOnboardingData = !!(
          onboardingData.name && onboardingData.birthDate
        );
        const profileComplete = profile ? !needsOnboarding(profile) : false;

        console.log('🎯 Decision Matrix:', {
          type,
          isNewUser,
          hasOnboardingData,
          profileComplete,
          hasProfile: !!profile,
        });

        // СЦЕНАРИЙ 1: Новый пользователь с данными из onboarding
        if (isNewUser && hasOnboardingData) {
          console.log('📝 SCENARIO 1: New user with onboarding data');
          console.log('   → Will complete signup and go to MainTabs');

          const formatBirthDate = (): string => {
            if (!onboardingData.birthDate) {
              throw new Error('Дата рождения не указана');
            }
            const { year, month, day } = onboardingData.birthDate;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          };

          const formatBirthTime = (): string => {
            if (!onboardingData.birthTime) {
              return '12:00';
            }
            const { hour, minute } = onboardingData.birthTime;
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          };

          const signupData = {
            userId: sessionData.user.id,
            name: onboardingData.name,
            birthDate: formatBirthDate(),
            birthTime: formatBirthTime(),
            birthPlace: onboardingData.birthPlace?.city || 'Moscow',
          };

          console.log('📤 Sending signup data:', signupData);

          // Завершаем регистрацию через backend
          const authResponse = await authAPI.completeSignup(signupData);
          console.log('✅ Signup completed');

          // Обновляем состояние
          login(authResponse.user);
          setOnboardingCompleted(true);

          // Очищаем URL от токенов
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          console.log('🚀 Navigating to MainTabs');
          // Переходим на главный экран
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }, 500);
        }
        // СЦЕНАРИЙ 2: Новый пользователь БЕЗ данных из onboarding
        else if (isNewUser) {
          console.log('📝 SCENARIO 2: New user without onboarding data');
          console.log(
            '   → Will create minimal profile and go to OnboardingName'
          );

          // Создаем минимальный профиль
          const { error: insertError } = await supabase.from('users').insert({
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.user_metadata?.name || 'Пользователь',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error('❌ Error creating profile:', insertError);
          } else {
            console.log('✅ Minimal profile created');
          }

          // Сохраняем минимальные данные пользователя
          login({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            name: sessionData.user.user_metadata?.name || 'Пользователь',
            role: 'user',
          });

          // Очищаем URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          console.log('🚀 Navigating to OnboardingName');
          // Переходим на онбординг
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'OnboardingName' }],
            });
          }, 500);
        }
        // СЦЕНАРИЙ 3: Существующий пользователь с полным профилем
        else if (profileComplete) {
          console.log('✅ SCENARIO 3: Existing user with complete profile');
          console.log('   → Will go to MainTabs');

          login({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            name: profile.name || 'Пользователь',
            birthDate: profile.birth_date
              ? new Date(profile.birth_date).toISOString().split('T')[0]
              : undefined,
            birthTime: profile.birth_time,
            birthPlace: profile.birth_place,
            role: 'user',
          });

          setOnboardingCompleted(true);

          // Очищаем URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          console.log('🚀 Navigating to MainTabs');
          // Переходим на главный экран
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }, 500);
        }
        // СЦЕНАРИЙ 4: Существующий пользователь БЕЗ полного профиля
        else {
          console.log('📋 SCENARIO 4: Existing user with incomplete profile');
          console.log('   → Will go to OnboardingName to complete profile');

          login({
            id: sessionData.user.id,
            email: sessionData.user.email || '',
            name:
              profile?.name ||
              sessionData.user.user_metadata?.name ||
              'Пользователь',
            birthDate: profile?.birth_date
              ? new Date(profile.birth_date).toISOString().split('T')[0]
              : undefined,
            birthTime: profile?.birth_time,
            birthPlace: profile?.birth_place,
            role: 'user',
          });

          // Очищаем URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          console.log('🚀 Navigating to OnboardingName');
          // Переходим на онбординг
          setTimeout(() => {
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'OnboardingName' }],
            });
          }, 500);
        }

        console.log('🔍 ========== AUTH CALLBACK END ==========');
      } else {
        // На мобильных платформах получаем текущую сессию
        console.log('📱 Mobile platform - getting session');

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error('Сессия не найдена');
        }

        console.log('✅ Session obtained:', session.user.email);

        // Сохраняем токен
        await tokenService.setToken(session.access_token);

        // Проверяем профиль
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('👤 Profile:', profile ? 'found' : 'not found');

        // Применяем ту же логику что и для web
        if (profile && !needsOnboarding(profile)) {
          login({
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name || 'Пользователь',
            birthDate: profile.birth_date
              ? new Date(profile.birth_date).toISOString().split('T')[0]
              : undefined,
            birthTime: profile.birth_time,
            birthPlace: profile.birth_place,
            role: 'user',
          });

          setOnboardingCompleted(true);

          // @ts-ignore
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          login({
            id: session.user.id,
            email: session.user.email || '',
            name:
              profile?.name ||
              session.user.user_metadata?.name ||
              'Пользователь',
            role: 'user',
          });

          // @ts-ignore
          navigation.reset({
            index: 0,
            routes: [{ name: 'OnboardingName' }],
          });
        }
      }
    } catch (error: any) {
      console.error('❌ ========== AUTH CALLBACK ERROR ==========');
      console.error('Error details:', error);
      console.error('Stack:', error.stack);

      setError(error.message || 'Ошибка авторизации');

      // Через 3 секунды переходим на экран входа
      setTimeout(() => {
        // @ts-ignore
        navigation.navigate('SignUp');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Ошибка</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>
              Перенаправление на экран входа...
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.text}>Завершение авторизации...</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 24,
    color: '#FF6B6B',
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  redirectText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default AuthCallbackScreen;
