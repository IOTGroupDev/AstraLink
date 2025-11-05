import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CosmicBackground from '../../components/CosmicBackground';
import { supabase } from '../../services/supabase';
import { tokenService } from '../../services/tokenService';
import {
  userAPI,
  chartAPI,
  subscriptionAPI,
  authAPI,
} from '../../services/api';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useAuthStore } from '../../stores/auth.store';

/**
 * Экран-утилита: после получения сессии подгружает данные из onboarding-storage в БД,
 * создаёт профиль/подписку/карту (если нужно), затем переводит на MainTabs.
 * Используется как цель навигации из Waiting через BroadcastChannel.
 */
const UserDataLoaderScreen: React.FC = () => {
  const navigation = useNavigation();
  const onboardingData = useOnboardingStore((s) => s.data);
  const setOnboardingCompletedFlag = useOnboardingStore((s) => s.setCompleted);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const { login, setOnboardingCompleted: setAuthOnboardingCompleted } =
    useAuthStore();

  const [status, setStatus] = useState<string>('Подготовка среды...');

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const needsOnboarding = (profile: any): boolean => {
    // Поддерживаем обе формы полей: snake_case (из БД) и camelCase (из backend API)
    const birthDate = profile?.birth_date ?? profile?.birthDate;
    const birthTime = profile?.birth_time ?? profile?.birthTime;
    const birthPlace = profile?.birth_place ?? profile?.birthPlace;
    return !birthDate || !birthTime || !birthPlace;
  };

  const verifyProvisioning = async (_userId: string) => {
    // Получаем профиль/карту/подписку ТОЛЬКО через backend API (обходит RLS)
    let dbProfile: any = null;
    try {
      dbProfile = await userAPI.getProfile();
    } catch (_e) {
      // Профиль может отсутствовать до апдейта — это не фатально
    }

    const profileOk =
      !!dbProfile?.birthDate &&
      !!dbProfile?.birthTime &&
      !!dbProfile?.birthPlace;

    let chartOk = false;
    try {
      const chart = await chartAPI.getNatalChart();
      chartOk = !!chart;
    } catch (_e) {
      chartOk = false;
    }

    let subscriptionOk = false;
    try {
      const sub = await subscriptionAPI.getStatus();
      subscriptionOk = !!sub && (sub.isActive ?? true);
    } catch (_e) {
      subscriptionOk = false;
    }

    return { profileOk, chartOk, subscriptionOk, dbProfile };
  };

  const goMainTabs = () => {
    // Даем навигатору время пересобрать дерево после login(), чтобы MainTabs гарантированно был зарегистрирован
    setTimeout(() => {
      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }, 120);
  };

  const run = async () => {
    try {
      setStatus('Получение сессии...');

      // Получаем сессию
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus('Сессия не найдена, переход к входу...');
        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignUp' }],
        });
        return;
      }

      // Сохраняем токен локально
      await tokenService.setToken(session.access_token);

      const userId = session.user.id;
      const userEmail = session.user.email || '';

      setStatus('Проверка профиля...');

      // Проверяем существующий профиль через backend API
      let profile: any = null;
      try {
        profile = await userAPI.getProfile();
      } catch (e) {
        console.warn('Profile check warning (backend):', e);
      }

      // Проверяем: есть ли данные онбординга в локальном стораже
      const hasOnboardingData =
        !!onboardingData?.name &&
        !!onboardingData?.birthDate &&
        !!onboardingData?.birthTime &&
        !!onboardingData?.birthPlace;

      // Если профиль полный - просто проверяем наличие карты и подписки
      if (profile && !needsOnboarding(profile)) {
        setStatus('Профиль полный. Проверка карты и подписки...');

        // Проверяем карту и подписку
        const verification = await verifyProvisioning(userId);

        // Если чего-то не хватает - создаём через completeSignup (идемпотентный метод)
        if (!verification.chartOk || !verification.subscriptionOk) {
          setStatus('Создание карты и подписки...');

          try {
            await authAPI.completeSignup({
              userId,
              name: profile.name || 'Пользователь',
              birthDate: profile.birthDate
                ? new Date(profile.birthDate).toISOString().split('T')[0]
                : '1990-01-01',
              birthTime: profile.birthTime || '12:00',
              birthPlace: profile.birthPlace || 'Moscow',
            });
          } catch (completeError) {
            console.error('Error completing signup:', completeError);
          }

          // Ждём пока всё создастся
          const maxAttempts = 1;
          let success = false;

          for (let i = 0; i < maxAttempts; i++) {
            setStatus(
              `Проверка подготовки (попытка ${i + 1}/${maxAttempts})...`
            );
            await new Promise((r) => setTimeout(r, 700));

            const res = await verifyProvisioning(userId);
            if (res.chartOk && res.subscriptionOk) {
              success = true;
              profile = res.dbProfile || profile;
              break;
            }
          }

          if (!success) {
            setStatus('Не удалось завершить подготовку. Попробуйте перезайти.');
            return;
          }
        }

        // Сохраняем пользователя в локальный стор
        login({
          id: userId,
          email: userEmail,
          name: profile.name || 'Пользователь',
          birthDate: profile.birthDate
            ? new Date(profile.birthDate).toISOString().split('T')[0]
            : undefined,
          birthTime: profile.birthTime || undefined,
          birthPlace: profile.birthPlace || undefined,
          role: 'user',
        });

        // Ставим флаги онбординга
        setOnboardingCompletedFlag(true);
        await setAuthOnboardingCompleted(true);

        setStatus('Переход на главный экран...');
        goMainTabs();
        return;
      }

      // Если профиля нет или он неполный, но есть данные онбординга - завершаем регистрацию
      if (hasOnboardingData) {
        setStatus('Завершение регистрации...');

        // Вызываем completeSignup на backend (создаст/обновит профиль, создаст карту и подписку)
        await authAPI.completeSignup({
          userId,
          name: onboardingData.name!,
          birthDate: formatBirthDate(),
          birthTime: formatBirthTime(),
          birthPlace: onboardingData.birthPlace?.city || 'Moscow',
        });

        // Верифицируем, что всё создалось
        setStatus('Проверка данных...');
        const maxAttempts = 1;
        let provisionOk = false;
        let dbProfile: any = null;

        for (let i = 0; i < maxAttempts; i++) {
          setStatus(`Проверка подготовки (попытка ${i + 1}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, 700));

          const res = await verifyProvisioning(userId);
          dbProfile = res.dbProfile || dbProfile;

          if (res.profileOk && res.chartOk && res.subscriptionOk) {
            provisionOk = true;
            break;
          }
        }

        if (!provisionOk) {
          setStatus('Не удалось завершить регистрацию. Попробуйте перезайти.');
          return;
        }

        // Сохраняем пользователя в локальный стор
        login({
          id: userId,
          email: userEmail,
          name: dbProfile?.name || onboardingData.name || 'Пользователь',
          birthDate: dbProfile?.birthDate
            ? new Date(dbProfile.birthDate).toISOString().split('T')[0]
            : formatBirthDate(),
          birthTime: dbProfile?.birthTime || formatBirthTime(),
          birthPlace:
            dbProfile?.birthPlace ||
            onboardingData.birthPlace?.city ||
            'Moscow',
          role: 'user',
        });

        // Ставим флаги онбординга и очищаем временные данные
        setStatus('Завершение онбординга...');
        setOnboardingCompletedFlag(true);
        await setAuthOnboardingCompleted(true);

        try {
          resetOnboarding();
        } catch {
          // ignore
        }

        setStatus('Переход на главный экран...');
        goMainTabs();
        return;
      }

      // Если ни профиля нет, ни данных онбординга - отправляем на онбординг
      setStatus('Переход к онбордингу...');
      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding1' }],
      });
    } catch (e: any) {
      console.error('UserDataLoader error:', e);
      setStatus('Произошла ошибка. Переход к входу...');

      // В случае ошибки возвращаем на SignUp
      setTimeout(() => {
        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignUp' }],
        });
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.text}>
          {Platform.OS === 'web' ? 'Завершаем вход...' : 'Завершаем вход...'}
        </Text>
        <Text style={styles.hint}>{status}</Text>
      </View>
    </View>
  );
};

export default UserDataLoaderScreen;

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
  hint: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
});
