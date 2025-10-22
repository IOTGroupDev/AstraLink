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
import { userAPI } from '../../services/api';
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
    return (
      !profile?.birth_date || !profile?.birth_time || !profile?.birth_place
    );
  };

  const verifyProvisioning = async (userId: string) => {
    // Проверяем профиль
    const { data: dbProfile } = await supabase
      .from('users')
      .select(
        'id, birth_date, birth_time, birth_place, name, email, created_at, updated_at'
      )
      .eq('id', userId)
      .single();

    const profileOk =
      !!dbProfile?.birth_date &&
      !!dbProfile?.birth_time &&
      !!dbProfile?.birth_place;

    // Проверяем наличие хотя бы одной карты
    const { data: charts } = await supabase
      .from('charts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const chartOk = Array.isArray(charts) && charts.length > 0;

    return { profileOk, chartOk, dbProfile };
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

      // Сохраняем токен локально (на всякий случай)
      await tokenService.setToken(session.access_token);

      const userId = session.user.id;
      const userEmail = session.user.email || '';

      setStatus('Проверка профиля...');
      // Проверяем существующий профиль
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // код "no rows" не считаем фатальным
        // eslint-disable-next-line no-console
        console.warn('Profile check warning:', profileError);
      }

      const hasOnboardingData =
        !!onboardingData?.name && !!onboardingData?.birthDate; // birthTime/place опционально
      const profileComplete = profile ? !needsOnboarding(profile) : false;

      if (profileComplete) {
        setStatus('Профиль заполнен. Завершаем вход...');
        // Локальное состояние пользователя
        login({
          id: userId,
          email: userEmail,
          name: profile?.name || 'Пользователь',
          birthDate: profile?.birth_date
            ? new Date(profile.birth_date).toISOString().split('T')[0]
            : undefined,
          birthTime: profile?.birth_time || undefined,
          birthPlace: profile?.birth_place || undefined,
          role: 'user',
        });

        // Ставим флаги онбординга (оба стора)
        setOnboardingCompletedFlag(true);
        await setAuthOnboardingCompleted(true);

        // На главный экран
        goMainTabs();
        return;
      }

      if (!hasOnboardingData) {
        setStatus('Нет данных онбординга. Переход к шагам онбординга...');
        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding1' }],
        });
        return;
      }

      // Идемпотентный update на backend (создаст/обновит профиль, FREE подписку и натальную карту при наличии данных)
      setStatus('Обновление профиля на сервере...');
      const updatePayload = {
        name: onboardingData.name!,
        birthDate: formatBirthDate(),
        birthTime: formatBirthTime(),
        birthPlace: onboardingData.birthPlace?.city || 'Moscow',
      };

      await userAPI.updateProfile(updatePayload);

      // Верификация, что профиль и карта действительно созданы
      setStatus('Верификация данных...');
      const { profileOk, chartOk, dbProfile } =
        await verifyProvisioning(userId);

      // Обновляем локальное состояние и только затем чистим сторы
      login({
        id: userId,
        email: userEmail,
        name: dbProfile?.name || onboardingData.name || 'Пользователь',
        birthDate: dbProfile?.birth_date
          ? new Date(dbProfile.birth_date).toISOString().split('T')[0]
          : updatePayload.birthDate,
        birthTime: dbProfile?.birth_time || updatePayload.birthTime,
        birthPlace: dbProfile?.birth_place || updatePayload.birthPlace,
        role: 'user',
      });

      if (profileOk && chartOk) {
        setStatus('Завершение онбординга...');
        setOnboardingCompletedFlag(true);
        await setAuthOnboardingCompleted(true);
        try {
          resetOnboarding();
        } catch {
          // ignore
        }
      } else {
        // Если вдруг provisioning не подтвердился — не очищаем onboarding-данные
        setStatus(
          'Профиль не подтверждён, повторная проверка на главном экране...'
        );
      }

      // На главный экран
      setStatus('Переход на главный экран...');
      goMainTabs();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('UserDataLoader error:', e);
      // В случае ошибки возвращаем на SignUp, чтобы не зависнуть
      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignUp' }],
      });
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
