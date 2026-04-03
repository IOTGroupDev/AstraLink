// src/screens/HoroscopeScreen.tsx - Refactored with data fetching
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HoroscopeSvg from '../components/svg/tabs/HoroscopeSvg';
import { LunarCalendarWidget } from '../components/horoscope/LunarCalendarWidget';
import EnergyWidget from '../components/horoscope/EnergyWidget';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import CompactScreenHeader from '../components/shared/CompactScreenHeader';
import MainTransitWidget from '../components/horoscope/MainTransitWidget';
import BiorhythmsWidget from '../components/horoscope/BiorhythmsWidget';
import HoroscopeWidget from '../components/horoscope/HoroscopeWidget';
import { HoroscopeWidgetSkeleton } from '../components/horoscope/HoroscopeSkeletons';
import PlanetaryRecommendationWidget from '../components/horoscope/PlanetRecommendationWidget';
import { chartAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { Chart } from '../types/index';
import { chartLogger } from '../services/logger';
import { getLessonsByLocale } from '../services/lessons-database.localized';
import {
  addLocalDays,
  formatLocalDate,
  getBirthDateParts,
  normalizeBirthDateValue,
} from '../utils/birthDate';

const normalizeAppLocale = (locale?: string): 'ru' | 'en' | 'es' => {
  const normalized = String(locale || 'en').toLowerCase();
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
};

const HoroscopeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const appLocale = React.useMemo((): 'ru' | 'en' | 'es' => {
    return normalizeAppLocale(i18n.language);
  }, [i18n.language]);
  const lessonsLocale = React.useMemo((): 'ru' | 'en' | 'es' => {
    return appLocale;
  }, [appLocale]);
  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    return appLocale;
  }, [appLocale]);
  const horoscopeHeaderDescription = React.useMemo(() => {
    const locale = appLocale;

    if (locale === 'ru') {
      return 'Ежедневный обзор';
    }

    if (locale === 'es') {
      return 'Resumen diario';
    }

    return 'Daily overview';
  }, [appLocale]);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    subscription,
    refetch: refetchSubscription,
    hasFeature,
  } = useSubscription();
  const prevTierRef = useRef<string | undefined>(subscription?.tier);
  const syncingRef = useRef(false);

  // State для данных
  const [chart, setChart] = useState<Chart | null>(null);
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [biorhythms, setBiorhythms] = useState<{
    physical: number;
    emotional: number;
    intellectual: number;
  } | null>(null);
  const [transitModalVisible, setTransitModalVisible] = useState(false);
  const [transitModalLoading, setTransitModalLoading] = useState(false);
  const [transitModalText, setTransitModalText] = useState('');
  const predictionsAttemptedRef = useRef(false);
  const predictionsLoadingRef = useRef(false);
  const predictionsLocaleRef = useRef<string | null>(null);
  const predictionsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const predictionsRetryCountRef = useRef(0);
  const predictionsRequestIdRef = useRef(0);
  const dataLoadingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  // Клиентский расчёт биоритмов (fallback), если сервер вернул плоские 50/50/50
  const computeClientBiorhythms = (
    birthDateISO?: string,
    targetDateISO?: string
  ) => {
    try {
      const birthParts = getBirthDateParts(birthDateISO);
      if (!birthParts) return null;

      // Целевая дата = сегодня (локальная) либо переданная
      const targetParts = getBirthDateParts(targetDateISO);
      const now = targetParts
        ? new Date(
            Date.UTC(
              targetParts.year,
              targetParts.month - 1,
              targetParts.day,
              12,
              0,
              0
            )
          )
        : new Date();

      // Используем «полдень по UTC» для обеих дат, чтобы исключить сдвиги по часовым поясам
      const birthNoonUTC = new Date(
        Date.UTC(
          birthParts.year,
          birthParts.month - 1,
          birthParts.day,
          12,
          0,
          0
        )
      );
      const targetNoonUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          12,
          0,
          0
        )
      );

      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.max(
        0,
        Math.floor((targetNoonUTC.getTime() - birthNoonUTC.getTime()) / dayMs)
      );

      const cycle = (period: number) =>
        Math.round(((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100);

      const clamp = (v: number) => Math.min(100, Math.max(0, v));

      return {
        physical: clamp(cycle(23)),
        emotional: clamp(cycle(28)),
        intellectual: clamp(cycle(33)),
      };
    } catch {
      return null;
    }
  };

  // Загрузка основных данных
  const loadData = async (forcePredictions = false) => {
    if (dataLoadingRef.current) return;
    dataLoadingRef.current = true;
    try {
      setLoading(true);

      if (!isAuthenticated) {
        chartLogger.warn(
          'Пользователь не авторизован, перенаправление на вход'
        );
        navigation.navigate('Login' as never);
        return;
      }

      try {
        chartLogger.log('Загружаю данные для HoroscopeScreen');

        let chartData = await chartAPI.getNatalChart();

        if (!chartData) {
          chartLogger.log(
            'Натальная карта не найдена, создаю из данных профиля'
          );
          chartData = await chartAPI.createNatalChart({}, getApiLocale());
        }

        setChart(chartData);

        const todayLocal = new Date();
        const fromDate = formatLocalDate(todayLocal);
        const toDate = formatLocalDate(addLocalDays(todayLocal, 7));

        const [transitsResult, planetsResult] = await Promise.allSettled([
          chartAPI.getTransits(fromDate, toDate),
          chartAPI.getCurrentPlanets(),
        ]);

        const transitsData =
          transitsResult.status === 'fulfilled' ? transitsResult.value : null;
        const planetsData =
          planetsResult.status === 'fulfilled' ? planetsResult.value : null;

        chartLogger.log('Получены данные карты', chartData);
        chartLogger.log('Получены транзиты', transitsData);
        chartLogger.log('Получены текущие планеты', planetsData);

        setCurrentPlanets(planetsData?.planets ?? null);

        await loadAllPredictions(forcePredictions);

        // Загружаем биоритмы
        try {
          // Локальная дата пользователя (YYYY-MM-DD), чтобы избежать смещения по UTC на бэкенде
          const localDateStr = formatLocalDate(new Date());

          const b = await chartAPI.getBiorhythms(localDateStr);

          // Если значения "плоские" около 50% (из-за даты/часового пояса), пересчитываем на клиенте из даты рождения
          const isNum = (v: any) => typeof v === 'number' && Number.isFinite(v);
          const near50 = (v: number) => Math.abs(v - 50) <= 1;
          const looksFlat =
            isNum(b?.physical) &&
            isNum(b?.emotional) &&
            isNum(b?.intellectual) &&
            near50(b.physical) &&
            near50(b.emotional) &&
            near50(b.intellectual);

          const birthISO =
            normalizeBirthDateValue((chartData?.data as any)?.birthDate) ||
            (chartData?.data as any)?.birth_date ||
            normalizeBirthDateValue(chartData?.birthDate) ||
            (chartData as any)?.birth_date;

          const clientCalc = looksFlat
            ? computeClientBiorhythms(birthISO, localDateStr)
            : null;

          const finalValues = clientCalc ?? {
            physical: b.physical,
            emotional: b.emotional,
            intellectual: b.intellectual,
          };

          setBiorhythms(finalValues);

          chartLogger.log('Биоритмы', {
            api: b,
            clientFallbackUsed: !!clientCalc,
            client: clientCalc,
            requestedDate: localDateStr,
            birthDateUsed: birthISO,
          });
        } catch (e) {
          chartLogger.error('Ошибка загрузки биоритмов', e);
          // Попробуем хотя бы клиентский расчёт, если есть дата рождения
          try {
            const localDateStr = formatLocalDate(new Date());
            const birthISO =
              normalizeBirthDateValue((chartData?.data as any)?.birthDate) ||
              (chartData?.data as any)?.birth_date ||
              normalizeBirthDateValue(chartData?.birthDate) ||
              (chartData as any)?.birth_date;

            const clientCalc = computeClientBiorhythms(birthISO, localDateStr);
            if (clientCalc) {
              setBiorhythms(clientCalc);
              chartLogger.log(
                'ℹ️ Поставлены клиентские биоритмы (fallback):',
                clientCalc
              );
            }
          } catch {
            // ignore
          }
        }
      } catch (error: any) {
        chartLogger.error('Ошибка загрузки данных карты', error);

        if (error.response?.status === 401) {
          chartLogger.info(
            'Перенаправление на страницу входа из-за отсутствия токена'
          );
          navigation.navigate('Login' as never);
          return;
        }

        if (error.response?.status === 404) {
          Alert.alert(
            t('horoscope.errors.createChartTitle'),
            t('horoscope.errors.createChartFirst'),
            [{ text: t('common.buttons.ok') }]
          );
        }
      }
    } catch (error) {
      chartLogger.error('Общая ошибка в loadData', error);
    } finally {
      setLoading(false);
      dataLoadingRef.current = false;
      hasLoadedOnceRef.current = true;
    }
  };

  // Загрузка прогнозов
  const loadAllPredictions = async (force = false) => {
    try {
      chartLogger.log('Загружаю прогнозы');
      const locale = getApiLocale();
      const requestId = ++predictionsRequestIdRef.current;
      if (!isAuthenticated) return;
      if (!force) {
        if (
          predictionsLoadingRef.current ||
          (predictionsLocaleRef.current === locale && predictions)
        ) {
          return;
        }
      }
      predictionsLoadingRef.current = true;

      const results = await Promise.allSettled([
        chartAPI.getHoroscope('day', locale),
        chartAPI.getHoroscope('tomorrow', locale),
        chartAPI.getHoroscope('week', locale),
      ]);
      const dayResponse =
        results[0].status === 'fulfilled' ? results[0].value : null;
      const tomorrowResponse =
        results[1].status === 'fulfilled' ? results[1].value : null;
      const weekResponse =
        results[2].status === 'fulfilled' ? results[2].value : null;

      chartLogger.log('Получены прогнозы', {
        day: dayResponse,
        tomorrow: tomorrowResponse,
        week: weekResponse,
      });

      const extractPredictions = (response: any) => {
        if (response.predictions && typeof response.predictions === 'object') {
          return {
            ...response.predictions,
            generatedBy:
              response.predictions.generatedBy ||
              response.generatedBy ||
              'interpreter',
          };
        }
        return {
          general: response.general || '',
          love: response.love || '',
          career: response.career || '',
          health: response.health || '',
          finance: response.finance || '',
          advice: response.advice || '',
          luckyNumbers: response.luckyNumbers || [],
          luckyColors: response.luckyColors || [],
          energy: response.energy || 50,
          mood: response.mood || '',
          challenges: response.challenges || [],
          opportunities: response.opportunities || [],
          generatedBy: response.generatedBy || 'interpreter',
        };
      };

      const newPredictions = {
        day: dayResponse ? extractPredictions(dayResponse) : null,
        tomorrow: tomorrowResponse
          ? extractPredictions(tomorrowResponse)
          : null,
        week: weekResponse ? extractPredictions(weekResponse) : null,
      };
      const hasPredictionData = Boolean(
        newPredictions.day || newPredictions.tomorrow || newPredictions.week
      );

      if (
        requestId !== predictionsRequestIdRef.current ||
        locale !== getApiLocale()
      ) {
        chartLogger.log('Пропускаю устаревший ответ гороскопа', {
          requestId,
          currentRequestId: predictionsRequestIdRef.current,
          requestLocale: locale,
          currentLocale: getApiLocale(),
        });
        return;
      }

      chartLogger.log('Устанавливаю прогнозы', newPredictions);
      chartLogger.log('Структура predictions.day', {
        hasPredictions: hasPredictionData,
        general: newPredictions.day?.general?.substring(0, 50) + '...',
        keys: Object.keys(newPredictions.day || {}),
      });
      setPredictions(hasPredictionData ? newPredictions : null);
      predictionsAttemptedRef.current = true;
      predictionsLocaleRef.current = hasPredictionData ? locale : null;

      const aiAllowed = hasFeature('aiHoroscope');
      const needsAi =
        hasPredictionData &&
        aiAllowed &&
        (newPredictions.day?.generatedBy !== 'ai' ||
          newPredictions.tomorrow?.generatedBy !== 'ai' ||
          newPredictions.week?.generatedBy !== 'ai');

      if (needsAi) {
        if (predictionsRetryCountRef.current < 2) {
          const delayMs = predictionsRetryCountRef.current === 0 ? 5000 : 10000;
          predictionsRetryCountRef.current += 1;
          if (predictionsRetryRef.current) {
            clearTimeout(predictionsRetryRef.current);
          }
          predictionsRetryRef.current = setTimeout(() => {
            loadAllPredictions(true);
          }, delayMs);
        }
      } else {
        predictionsRetryCountRef.current = 0;
        if (predictionsRetryRef.current) {
          clearTimeout(predictionsRetryRef.current);
          predictionsRetryRef.current = null;
        }
      }
    } catch (error) {
      chartLogger.error('Ошибка загрузки прогнозов', error);
      if (!predictionsAttemptedRef.current) {
        predictionsAttemptedRef.current = true;
        return;
      }
      Alert.alert(
        t('common.errors.generic'),
        t('horoscope.errors.failedToLoad'),
        [{ text: t('common.buttons.ok') }]
      );
    } finally {
      predictionsLoadingRef.current = false;
    }
  };

  // Обработчик обновления (pull to refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Вычисление энергии из карты
  const getCurrentEnergy = () => {
    if (!chart?.data?.aspects) return 50;

    let energy = 40; // Базовая энергия ниже
    const aspectCount = chart.data.aspects.length;

    // Меньший бонус за количество аспектов
    energy += Math.min(aspectCount * 1, 15);

    const harmoniousAspects = chart.data.aspects.filter((aspect) =>
      ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
    );

    const challengingAspects = chart.data.aspects.filter((aspect) =>
      ['square', 'opposition'].includes(aspect.aspect)
    );

    // Гармоничные аспекты добавляют энергию
    const harmonyBonus = harmoniousAspects.reduce(
      (sum, aspect) => sum + (aspect.strength || 0.5) * 8, // Уменьшил множитель
      0
    );

    // Напряженные аспекты немного снижают энергию
    const challengePenalty = challengingAspects.reduce(
      (sum, aspect) => sum + (aspect.strength || 0.5) * 3,
      0
    );

    energy += harmonyBonus;
    energy -= challengePenalty;

    // Добавляем случайность ±5% для реализма
    const randomFactor = (Math.random() - 0.5) * 10;
    energy += randomFactor;

    return Math.min(95, Math.max(20, Math.round(energy)));
  };

  // Получение главного транзита
  const normalizePlanetKey = (raw?: string): string => {
    if (!raw) return '';
    const cleaned = String(raw).trim().toLowerCase();
    if (!cleaned) return '';
    let key = cleaned.replace(/[\s-]+/g, '_');
    key = key.replace(/[^\w]/g, '');
    if (key === 'southnode') return 'south_node';
    return key;
  };

  const normalizeAspectKey = (raw?: string): string => {
    if (!raw) return '';
    const cleaned = String(raw).trim().toLowerCase();
    if (!cleaned) return '';
    let key = cleaned.replace(/[\s_]+/g, '-');
    key = key.replace(/[^a-z0-9-]/g, '');
    key = key.replace(/-+/g, '-');
    if (key === 'sesqui-quadrate') return 'sesquiquadrate';
    if (key === 'bi-quintile') return 'biquintile';
    if (key === 'semi-sextile') return 'semi-sextile';
    if (key === 'semi-square') return 'semi-square';
    return key;
  };

  const getMainTransit = () => {
    if (
      chart &&
      chart.data &&
      chart.data.aspects &&
      chart.data.aspects.length > 0
    ) {
      const strongestAspect = chart.data.aspects.reduce((strongest, current) =>
        (current.strength || 0) > (strongest.strength || 0)
          ? current
          : strongest
      );

      const rawPlanetA = strongestAspect.planetA || '';
      const rawPlanetB = strongestAspect.planetB || '';
      const rawAspect = strongestAspect.aspect || '';

      const planetAKey = normalizePlanetKey(rawPlanetA);
      const planetBKey = normalizePlanetKey(rawPlanetB);
      const aspectKey = normalizeAspectKey(rawAspect);

      const planetA = t(`common.planets.${planetAKey}`, {
        defaultValue: rawPlanetA,
      });
      const planetB = t(`common.planets.${planetBKey}`, {
        defaultValue: rawPlanetB,
      });
      const aspectName = t(`common.aspects.${aspectKey}`, {
        defaultValue: rawAspect,
      });

      return {
        name: `${planetA} - ${aspectName} - ${planetB}`,
        aspect: aspectName,
        targetPlanet: planetB,
        strength: strongestAspect.strength || 0.8,
        description: t('horoscope.transit.description', {
          planetA,
          aspect: aspectName,
          planetB,
        }),
      };
    }

    return null;
  };

  // Получение сообщения об энергии (по значению)
  const getEnergyMessage = (energy: number) => {
    if (energy >= 80) return t('horoscope.energy.veryHigh');
    if (energy >= 60) return t('horoscope.energy.high');
    if (energy >= 40) return t('horoscope.energy.moderate');
    if (energy >= 20) return t('horoscope.energy.low');
    return t('horoscope.energy.veryLow');
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  const refreshForSubscriptionChange = React.useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      predictionsRetryCountRef.current = 0;
      if (predictionsRetryRef.current) {
        clearTimeout(predictionsRetryRef.current);
        predictionsRetryRef.current = null;
      }
      await refetchSubscription();
      await loadData(true);
    } catch (error) {
      chartLogger.warn('Ошибка обновления после смены подписки', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refetchSubscription]);

  useEffect(() => {
    const nextTier = subscription?.tier;
    if (prevTierRef.current && nextTier && prevTierRef.current !== nextTier) {
      refreshForSubscriptionChange();
    }
    prevTierRef.current = nextTier;
  }, [subscription?.tier, refreshForSubscriptionChange]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || authLoading) return undefined;
      if (!hasLoadedOnceRef.current) return undefined;
      refreshForSubscriptionChange();
      return undefined;
    }, [isAuthenticated, authLoading, refreshForSubscriptionChange])
  );

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    chartLogger.log('Перезагружаю horoscope screen из-за смены языка');
    predictionsRequestIdRef.current += 1;
    predictionsRetryCountRef.current = 0;
    if (predictionsRetryRef.current) {
      clearTimeout(predictionsRetryRef.current);
      predictionsRetryRef.current = null;
    }
    predictionsLocaleRef.current = null;
    setPredictions(null);
    void loadData(true);
  }, [appLocale]);

  useEffect(() => {
    return () => {
      if (predictionsRetryRef.current) {
        clearTimeout(predictionsRetryRef.current);
      }
    };
  }, []);

  // Формирование данных для виджетов
  const energyValue =
    (predictions?.day?.energy as number | undefined) ?? getCurrentEnergy();
  const energyMessage = getEnergyMessage(energyValue);
  const mainTransit = getMainTransit();
  const hasAIAccess = hasFeature('detailedTransits');
  const hasPredictionData = Boolean(
    predictions?.day || predictions?.tomorrow || predictions?.week
  );
  const dailyLearningLesson = React.useMemo(() => {
    const lessons = getLessonsByLocale(lessonsLocale);
    if (!lessons.length) return null;

    const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor(
      (Date.now() - startOfYear) / (1000 * 60 * 60 * 24)
    );

    return lessons[dayOfYear % lessons.length] ?? null;
  }, [lessonsLocale]);

  const openMainTransitDetails = async () => {
    if (!hasAIAccess) {
      Alert.alert(
        t('horoscope.mainTransitWidget.premiumOnlyTitle'),
        t('horoscope.mainTransitWidget.premiumOnlyMessage')
      );
      return;
    }

    setTransitModalVisible(true);
    setTransitModalLoading(true);
    setTransitModalText('');
    try {
      const locale = getApiLocale();
      const response = await chartAPI.getMainTransitInterpretation(locale);
      setTransitModalText(
        response?.interpretation ||
          t('horoscope.mainTransitWidget.detailsError')
      );
    } catch (_error) {
      setTransitModalText(t('horoscope.mainTransitWidget.detailsError'));
    } finally {
      setTransitModalLoading(false);
    }
  };

  const closeTransitModal = () => {
    setTransitModalVisible(false);
    setTransitModalText('');
  };

  // Нормализация данных для PlanetaryRecommendationWidget
  const natalPlanetsObj = React.useMemo(() => {
    return chart?.data?.planets || chart?.planets || null;
  }, [chart]);

  const transitPlanetsArr = React.useMemo(() => {
    try {
      if (!currentPlanets) return [];
      if (Array.isArray(currentPlanets)) {
        return currentPlanets.filter(
          (p: any) =>
            p && typeof p.longitude === 'number' && typeof p.name === 'string'
        );
      }
      // Преобразуем объект вида { sun: { longitude, ... }, ... } в массив
      return Object.entries(currentPlanets)
        .map(([name, p]: any) => ({
          name: String(name),
          longitude: Number(p?.longitude),
          sign: p?.sign,
          degree: p?.degree,
        }))
        .filter((p) => Number.isFinite(p.longitude));
    } catch {
      return [];
    }
  }, [currentPlanets]);

  // Логирование для отладки
  chartLogger.log('Данные виджетов', {
    energyValue,
    energyMessage,
    mainTransit: mainTransit?.name,
    hasPredictions: hasPredictionData,
    predictionsDayExists: !!predictions?.day,
  });

  return (
    <>
      <StatusBar barStyle="light-content" />
      <TabScreenLayout
        scrollable={false}
        edges={['left', 'right']}
        contentContainerStyle={styles.layoutContent}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 12,
                paddingBottom: Math.max(72, tabBarHeight + 44),
              },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="rgba(191, 158, 207, 1)"
                colors={['rgba(191, 158, 207, 1)']}
              />
            }
          >
            {/* Заголовок с размытием */}
            <CompactScreenHeader
              style={styles.compactHeader}
              title={t('horoscope.title')}
              description={horoscopeHeaderDescription}
              icon={<HoroscopeSvg size={26} color="#FFFFFF" />}
            />
            <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
              <Text style={styles.headerSubtitle}>
                {t('horoscope.subtitle', {
                  name: user?.name ? `\n${user.name}` : '',
                })}
              </Text>
              <Text style={styles.headerDate}>
                {t('horoscope.positionsOn', {
                  date: new Date().toLocaleDateString(
                    appLocale === 'ru'
                      ? 'ru-RU'
                      : appLocale === 'es'
                        ? 'es-ES'
                        : 'en-US',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  ),
                })}
              </Text>
            </BlurView>

            {/* Основной контент */}
            <View style={styles.contentContainer}>
              {syncing && (
                <View style={styles.syncBanner}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.syncText}>
                    {t(
                      'horoscope.syncing',
                      'Updating horoscope and interpretation...'
                    )}
                  </Text>
                </View>
              )}
              {/* Виджет лунного календаря (прокидываем знак Луны из текущих планет) */}
              <LunarCalendarWidget sign={currentPlanets?.moon?.sign} />

              {/* Рекомендация дня (нормализованные данные для виджета) */}
              {natalPlanetsObj && transitPlanetsArr.length > 0 && (
                <PlanetaryRecommendationWidget
                  natalPlanets={natalPlanetsObj}
                  transitPlanets={transitPlanetsArr}
                  navigation={navigation}
                />
              )}

              {/* Виджет энергии */}
              {!loading && (
                <EnergyWidget energy={energyValue} message={energyMessage} />
              )}

              {/* Виджет главный транзит */}
              {!loading && mainTransit && (
                <MainTransitWidget
                  transitData={mainTransit}
                  onPress={openMainTransitDetails}
                />
              )}

              {/* Гороскоп виджет */}
              {dailyLearningLesson && (
                <TouchableOpacity
                  style={styles.learningCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    (navigation as any).navigate('Learning', {
                      source: 'horoscope',
                      lessonId: dailyLearningLesson.id,
                    })
                  }
                >
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={styles.learningBlur}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(139, 92, 246, 0.24)',
                        'rgba(99, 102, 241, 0.12)',
                      ]}
                      style={styles.learningGradient}
                    >
                      <View style={styles.learningHeader}>
                        <View style={styles.learningIconWrap}>
                          <Text style={styles.learningEmoji}>
                            {dailyLearningLesson.emoji}
                          </Text>
                        </View>
                        <View style={styles.learningHeaderText}>
                          <Text style={styles.learningLabel}>
                            {t('horoscope.learningCard.label')}
                          </Text>
                          <Text style={styles.learningTitle}>
                            {t('horoscope.learningCard.title')}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#C4B5FD"
                        />
                      </View>

                      <Text style={styles.learningLessonTitle}>
                        {dailyLearningLesson.title}
                      </Text>
                      <Text style={styles.learningLessonText} numberOfLines={3}>
                        {dailyLearningLesson.shortText}
                      </Text>

                      <View style={styles.learningFooter}>
                        <Text style={styles.learningCta}>
                          {t('horoscope.learningCard.button')}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color="#DDD6FE"
                        />
                      </View>
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
              )}

              {hasPredictionData ? (
                <HoroscopeWidget
                  key={`horoscope-${appLocale}`}
                  predictions={predictions}
                />
              ) : !loading && predictionsAttemptedRef.current ? (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    {t('horoscope.errors.failedToLoad')}
                  </Text>
                </View>
              ) : (
                <HoroscopeWidgetSkeleton />
              )}

              {/* Виджет Биоритмы */}
              {biorhythms && (
                <BiorhythmsWidget
                  physical={biorhythms.physical}
                  emotional={biorhythms.emotional}
                  intellectual={biorhythms.intellectual}
                />
              )}

              {/* Placeholder для будущих виджетов */}
              {loading && (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    {t('horoscope.loading')}
                  </Text>
                </View>
              )}
              {/*<View>*/}
              {/*  <PersonalCodeScreen />*/}
              {/*</View>*/}
            </View>
          </ScrollView>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(15, 23, 42, 0.98)',
              'rgba(15, 23, 42, 0.65)',
              'rgba(15, 23, 42, 0)',
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.topFade, { height: insets.top + 56 }]}
          />
        </View>
      </TabScreenLayout>

      <Modal
        animationType="fade"
        transparent={true}
        visible={transitModalVisible}
        onRequestClose={closeTransitModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeTransitModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <LinearGradient
              colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
              start={{ x: 0, y: 0.44 }}
              end={{ x: 0, y: 1 }}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('horoscope.mainTransitWidget.detailsTitle')}
                </Text>
                <Pressable onPress={closeTransitModal}>
                  <Text style={styles.modalClose}>×</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {transitModalLoading ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                    <Text style={styles.modalLoadingText}>
                      {t('horoscope.mainTransitWidget.detailsLoading')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.modalText}>{transitModalText}</Text>
                )}
              </ScrollView>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  layoutContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  // Заголовок
  compactHeader: {
    marginBottom: 12,
  },
  headerContainer: {
    marginHorizontal: 0,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Контент
  contentContainer: {
    marginTop: 20,
    gap: 20,
  },
  placeholder: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  syncText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  learningCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
  },
  learningBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  learningGradient: {
    borderRadius: 20,
    padding: 18,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  learningIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  learningEmoji: {
    fontSize: 22,
  },
  learningHeaderText: {
    flex: 1,
  },
  learningLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#C4B5FD',
  },
  learningTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  learningLessonTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  learningLessonText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.74)',
  },
  learningFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  learningCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    height: '80%',
    minHeight: 260,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(237, 164, 255, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(237, 164, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  modalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalLoadingText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HoroscopeScreen;
