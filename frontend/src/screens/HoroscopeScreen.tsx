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
  Animated,
  Image,
  useWindowDimensions,
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
import { useQuery } from '@tanstack/react-query';
import MaskedView from '@react-native-masked-view/masked-view';
import { LunarCalendarWidget } from '../components/horoscope/LunarCalendarWidget';
import EnergyWidget from '../components/horoscope/EnergyWidget';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import MainTransitWidget from '../components/horoscope/MainTransitWidget';
import BiorhythmsWidget from '../components/horoscope/BiorhythmsWidget';
import HoroscopeWidget from '../components/horoscope/HoroscopeWidget';
import { HoroscopeWidgetSkeleton } from '../components/horoscope/HoroscopeSkeletons';
import PlanetaryRecommendationWidget from '../components/horoscope/PlanetRecommendationWidget';
import { chartAPI, userAPI } from '../services/api';
import type {
  BiorhythmPhase,
  BiorhythmResponse,
  HoroscopeBundle,
  HoroscopeContent,
} from '../services/api/chart.api';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { Chart } from '../types/index';
import { chartLogger } from '../services/logger';
import { getCoreLessonsByLocale } from '../services/lessons-database.localized';
import { pickDailyLesson } from '../services/daily-lesson';
import {
  buildHoroscopeDailyBucketKey,
  getHoroscopeChartRevision,
  readHoroscopeScreenCache,
  writeHoroscopeScreenCache,
} from '../services/horoscope-cache';
import { useCompletedLessonIds } from '../stores';
import {
  addLocalDays,
  formatLocalDate,
  getBirthDateParts,
  normalizeBirthDateValue,
} from '../utils/birthDate';
import { StarSvg } from '../components/svg/moon-phase/Star';
import { HouseSvg } from '../components/svg/moon-phase/House';
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  getCachedPrimaryPhoto,
  setCachedPrimaryPhoto,
} from '../services/profile-photo-cache';
import { GradientBorderView } from '../components/shared';

const normalizeAppLocale = (locale?: string): 'ru' | 'en' | 'es' => {
  const normalized = String(locale || 'en').toLowerCase();
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
};

const normalizeZodiacKey = (sign: string): string => {
  const raw = (sign || '').trim();
  if (!raw) return '';
  return raw.toLowerCase();
};

const getInitials = (name?: string, email?: string): string => {
  const source = (name || email || 'A').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const HeroMetricIcon = ({ type }: { type: 'sign' | 'house' }) => {
  const Icon = type === 'sign' ? StarSvg : HouseSvg;

  return (
    <View style={styles.heroMetricIconWrap}>
      <MaskedView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        maskElement={<Icon width={36} height={36} />}
      >
        <View style={styles.heroMetricIconFill} />
      </MaskedView>
    </View>
  );
};

const ScrollTopGlow = () => (
  <Svg
    pointerEvents="none"
    viewBox="0 0 1352 1352"
    preserveAspectRatio="none"
    style={styles.topGlow}
  >
    <Defs>
      <RadialGradient id="scrollTopGlowGradient" cx="50%" cy="18%" r="72%">
        <Stop offset="0" stopColor="#6F38A6" stopOpacity="0.95" />
        <Stop offset="0.48" stopColor="#2E2457" stopOpacity="0.64" />
        <Stop offset="1" stopColor="#080E1C" stopOpacity="0" />
      </RadialGradient>
      <Filter
        id="scrollTopGlowBlur"
        x="-35%"
        y="-35%"
        width="170%"
        height="170%"
      >
        <FeGaussianBlur stdDeviation="109" />
      </Filter>
    </Defs>
    <Ellipse
      cx="676"
      cy="676"
      rx="624"
      ry="624"
      fill="url(#scrollTopGlowGradient)"
      filter="url(#scrollTopGlowBlur)"
    />
  </Svg>
);

const HoroscopeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;
  const completedLessonIds = useCompletedLessonIds();
  const appLocale = React.useMemo((): 'ru' | 'en' | 'es' => {
    return normalizeAppLocale(i18n.language);
  }, [i18n.language]);
  const lessonsLocale = React.useMemo((): 'ru' | 'en' | 'es' => {
    return appLocale;
  }, [appLocale]);
  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    return appLocale;
  }, [appLocale]);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    subscription,
    refetch: refetchSubscription,
    hasFeature,
  } = useSubscription();
  const { data: moonPhase } = useQuery({
    queryKey: ['moonPhase', i18n.language],
    queryFn: () => chartAPI.getMoonPhase(undefined, getApiLocale()),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    enabled: isAuthenticated,
  });
  const prevTierRef = useRef<string | undefined>(subscription?.tier);
  const syncingRef = useRef(false);

  // State для данных
  const [chart, setChart] = useState<Chart | null>(null);
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [biorhythms, setBiorhythms] = useState<BiorhythmResponse | null>(null);
  const [transitModalVisible, setTransitModalVisible] = useState(false);
  const [transitModalLoading, setTransitModalLoading] = useState(false);
  const [transitModalText, setTransitModalText] = useState('');
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(null);
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
  const lastLoadedBucketRef = useRef<string | null>(null);
  const mainTransitInterpretationCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const loadPrimaryPhoto = async () => {
      const userId = user?.id;
      if (!userId) {
        setPrimaryPhotoUrl(null);
        return;
      }

      const cachedPhoto = await getCachedPrimaryPhoto(userId);
      if (isMounted && cachedPhoto?.url) {
        setPrimaryPhotoUrl(cachedPhoto.url);
      }

      try {
        const profile = await userAPI.getProfile();
        if (!isMounted) return;

        const nextPhotoUrl = profile.primaryPhotoUrl || null;
        setPrimaryPhotoUrl(nextPhotoUrl);

        if (profile.primaryPhotoUrl && profile.primaryPhotoPath) {
          await setCachedPrimaryPhoto(profile.id, {
            url: profile.primaryPhotoUrl,
            path: profile.primaryPhotoPath,
            expiresAt: profile.primaryPhotoExpiresAt ?? null,
          });
        } else {
          await setCachedPrimaryPhoto(profile.id, null);
        }
      } catch {
        // Avatar is decorative here, so cached/fallback initials are enough.
      }
    };

    void loadPrimaryPhoto();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const extractHoroscopeContent = React.useCallback(
    (response: any): HoroscopeContent => {
      if (response?.predictions && typeof response.predictions === 'object') {
        return {
          ...response.predictions,
          generatedBy:
            response.predictions.generatedBy ||
            response.generatedBy ||
            'interpreter',
          status: response.predictions.status || response.status || 'ready',
          updatedAt:
            response.predictions.updatedAt ||
            response.updatedAt ||
            new Date().toISOString(),
          meta: response.predictions.meta ||
            response.meta || {
              tone: 'mixed',
              focus: '',
              risk: '',
              keyWindow: '',
            },
          mainTransit:
            response.predictions.mainTransit || response.mainTransit || null,
          dailyContext:
            response.predictions.dailyContext || response.dailyContext,
        };
      }

      return {
        general: response?.general || '',
        love: response?.love || '',
        career: response?.career || '',
        health: response?.health || '',
        finance: response?.finance || '',
        advice: response?.advice || '',
        luckyNumbers: response?.luckyNumbers || [],
        luckyColors: response?.luckyColors || [],
        energy: response?.energy || 50,
        mood: response?.mood || '',
        challenges: response?.challenges || [],
        opportunities: response?.opportunities || [],
        generatedBy: response?.generatedBy || 'interpreter',
        status: response?.status || 'ready',
        updatedAt: response?.updatedAt || new Date().toISOString(),
        meta: response?.meta || {
          tone: 'mixed',
          focus: '',
          risk: '',
          keyWindow: '',
        },
        mainTransit: response?.mainTransit || null,
        dailyContext: response?.dailyContext,
      };
    },
    []
  );

  const normalizeHoroscopeBundle = React.useCallback(
    (response: {
      today?: unknown;
      day?: unknown;
      tomorrow?: unknown;
      week?: unknown;
      month?: unknown;
    }): HoroscopeBundle => {
      return {
        day: response?.today
          ? extractHoroscopeContent(response.today)
          : response?.day
            ? extractHoroscopeContent(response.day)
            : null,
        tomorrow: response?.tomorrow
          ? extractHoroscopeContent(response.tomorrow)
          : null,
        week: response?.week ? extractHoroscopeContent(response.week) : null,
        month: response?.month ? extractHoroscopeContent(response.month) : null,
      };
    },
    [extractHoroscopeContent]
  );

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
        date: targetDateISO ?? formatLocalDate(new Date()),
      };
    } catch {
      return null;
    }
  };

  const getBiorhythmPhase = React.useCallback(
    (value: number, delta: number): BiorhythmPhase => {
      if (value >= 90) return 'peak';
      if (value <= 10) return 'low';
      if (value >= 65) return delta >= 0 ? 'rising' : 'high';
      if (value <= 35) return delta <= 0 ? 'falling' : 'low';
      return 'critical';
    },
    []
  );

  const toRichBiorhythm = React.useCallback(
    (
      values: {
        physical: number;
        emotional: number;
        intellectual: number;
        date: string;
      },
      summary?: string
    ): BiorhythmResponse => {
      const physicalDelta = values.emotional - values.physical;
      const emotionalDelta = values.intellectual - values.emotional;
      const intellectualDelta = values.physical - values.intellectual;
      const overall = Math.round(
        (values.physical + values.emotional + values.intellectual) / 3
      );
      const overallPhase = getBiorhythmPhase(overall, 0);

      return {
        ...values,
        physicalPhase: getBiorhythmPhase(values.physical, physicalDelta),
        emotionalPhase: getBiorhythmPhase(values.emotional, emotionalDelta),
        intellectualPhase: getBiorhythmPhase(
          values.intellectual,
          intellectualDelta
        ),
        overall,
        overallPhase,
        summary:
          summary ||
          t('horoscope.biorhythmsWidget.fallbackSummary', {
            defaultValue:
              'Use your strongest rhythm as support today and reduce pressure where energy is lower.',
          }),
        trend: [
          {
            date: values.date,
            physical: values.physical,
            emotional: values.emotional,
            intellectual: values.intellectual,
            overall,
            overallPhase,
          },
        ],
        criticalDays: [],
      };
    },
    [getBiorhythmPhase, t]
  );

  // Загрузка основных данных
  const loadData = async (forcePredictions = false) => {
    if (dataLoadingRef.current) return;
    dataLoadingRef.current = true;
    try {
      setLoading(true);
      if (forcePredictions) {
        mainTransitInterpretationCacheRef.current = {};
      }

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
        const bucketKey = buildHoroscopeDailyBucketKey();
        const tierKey = subscription?.tier || 'free';
        const chartRevision = getHoroscopeChartRevision(chartData);
        const cacheUserId = user?.id;

        if (!forcePredictions && cacheUserId) {
          const cached = await readHoroscopeScreenCache(cacheUserId);
          if (
            cached &&
            cached.bucketKey === bucketKey &&
            cached.locale === getApiLocale() &&
            cached.tier === tierKey &&
            cached.chartRevision === chartRevision
          ) {
            chartLogger.log('Использую локальный daily-cache гороскопа', {
              bucketKey,
              locale: getApiLocale(),
              tierKey,
              chartRevision,
            });
            setChart(cached.chart || chartData);
            setCurrentPlanets(cached.currentPlanets ?? null);
            setPredictions(cached.predictions ?? null);
            setBiorhythms(cached.biorhythms ?? null);
            predictionsAttemptedRef.current = cached.predictions != null;
            predictionsLocaleRef.current =
              cached.predictions != null ? getApiLocale() : null;
            lastLoadedBucketRef.current = bucketKey;
            return;
          }
        }

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

        const loadedPredictions = await loadAllPredictions(forcePredictions);

        // Загружаем биоритмы
        let finalBiorhythms: BiorhythmResponse | null = null;
        try {
          // Локальная дата пользователя (YYYY-MM-DD), чтобы избежать смещения по UTC на бэкенде
          const localDateStr = formatLocalDate(new Date());

          const b = await chartAPI.getBiorhythms(localDateStr, getApiLocale());

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

          const finalValues = clientCalc
            ? toRichBiorhythm(clientCalc, b?.summary)
            : b;

          finalBiorhythms = finalValues;
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
              finalBiorhythms = toRichBiorhythm(clientCalc);
              setBiorhythms(finalBiorhythms);
              chartLogger.log(
                'ℹ️ Поставлены клиентские биоритмы (fallback):',
                clientCalc
              );
            }
          } catch {
            // ignore
          }
        }

        if (cacheUserId) {
          await writeHoroscopeScreenCache(cacheUserId, {
            bucketKey,
            locale: getApiLocale(),
            tier: tierKey,
            chartRevision,
            chart: chartData,
            currentPlanets: planetsData?.planets ?? null,
            predictions: loadedPredictions,
            biorhythms: finalBiorhythms,
            cachedAt: new Date().toISOString(),
          });
        }
        lastLoadedBucketRef.current = bucketKey;
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
  const loadAllPredictions = async (
    force = false
  ): Promise<HoroscopeBundle | null> => {
    try {
      chartLogger.log('Загружаю прогнозы');
      const locale = getApiLocale();
      const requestId = ++predictionsRequestIdRef.current;
      if (!isAuthenticated) return null;
      if (!force) {
        if (
          predictionsLoadingRef.current ||
          (predictionsLocaleRef.current === locale && predictions)
        ) {
          return predictions || null;
        }
      }
      predictionsLoadingRef.current = true;

      const response = await chartAPI.getAllHoroscopes(locale);
      chartLogger.log('Получены прогнозы bundle', response);

      const newPredictions = normalizeHoroscopeBundle(response);
      const hasPredictionData = Boolean(
        newPredictions.day ||
          newPredictions.tomorrow ||
          newPredictions.week ||
          newPredictions.month
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
        return null;
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
          newPredictions.week?.generatedBy !== 'ai' ||
          newPredictions.month?.generatedBy !== 'ai');

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
      return hasPredictionData ? newPredictions : null;
    } catch (error) {
      chartLogger.error('Ошибка загрузки прогнозов', error);
      if (!predictionsAttemptedRef.current) {
        predictionsAttemptedRef.current = true;
        return null;
      }
      Alert.alert(
        t('common.errors.generic'),
        t('horoscope.errors.failedToLoad'),
        [{ text: t('common.buttons.ok') }]
      );
      return null;
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

    return Math.min(95, Math.max(20, Math.round(energy)));
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
      const nextBucket = buildHoroscopeDailyBucketKey();
      if (lastLoadedBucketRef.current === nextBucket) {
        return undefined;
      }
      void loadData(true);
      return undefined;
    }, [isAuthenticated, authLoading])
  );

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    chartLogger.log('Перезагружаю horoscope screen из-за смены языка');
    mainTransitInterpretationCacheRef.current = {};
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
    (predictions?.day?.energy as number | undefined) ??
    (biorhythms?.overall as number | undefined) ??
    getCurrentEnergy();
  const energyMessage =
    predictions?.day?.dailyContext?.summary ||
    biorhythms?.summary ||
    getEnergyMessage(energyValue);
  const mainTransit = predictions?.day?.mainTransit ?? null;
  const hasAIAccess = hasFeature('detailedTransits');
  const hasPredictionData = Boolean(
    predictions?.day || predictions?.tomorrow || predictions?.week
  );
  const dailyLearningLesson = React.useMemo(() => {
    const lessons = getCoreLessonsByLocale(lessonsLocale);
    return pickDailyLesson(lessons, completedLessonIds);
  }, [completedLessonIds, lessonsLocale]);

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
      const transitDate = predictions?.day?.date || new Date().toISOString();
      const cacheKey = `${locale}:${transitDate}`;
      const cachedInterpretation =
        mainTransitInterpretationCacheRef.current[cacheKey];

      if (cachedInterpretation) {
        setTransitModalText(cachedInterpretation);
        setTransitModalLoading(false);
        return;
      }

      const response = await chartAPI.getMainTransitInterpretation(
        locale,
        transitDate
      );
      const nextText =
        response?.interpretation ||
        t('horoscope.mainTransitWidget.detailsError');
      mainTransitInterpretationCacheRef.current[cacheKey] = nextText;
      setTransitModalText(nextText);
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

  const moonPlanet = React.useMemo(() => {
    if (Array.isArray(currentPlanets)) {
      return currentPlanets.find(
        (planet: any) => String(planet?.name || '').toLowerCase() === 'moon'
      );
    }

    return currentPlanets?.moon ?? null;
  }, [currentPlanets]);

  const displayMoonSign = React.useMemo(() => {
    const rawSign = String(moonPlanet?.sign || moonPhase?.sign || '');
    const zodiacKey = normalizeZodiacKey(rawSign);
    return zodiacKey
      ? t(`common.zodiacSigns.${zodiacKey}`, { defaultValue: rawSign })
      : '-';
  }, [moonPhase?.sign, moonPlanet?.sign, t]);

  const displayMoonHouse = String(moonPhase?.house || '-');
  const greetingName = user?.name?.trim() || 'there';
  const avatarInitials = getInitials(user?.name, user?.email);
  const positionsDate = new Date().toLocaleDateString(
    appLocale === 'ru' ? 'ru-RU' : appLocale === 'es' ? 'es-ES' : 'en-US',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  const openProfile = React.useCallback(() => {
    (navigation as any).navigate('Profile');
  }, [navigation]);
  const topFadeOpacity = scrollY.interpolate({
    inputRange: [0, windowHeight / 3],
    outputRange: [0.1, 1],
    extrapolate: 'clamp',
  });

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
        showCosmicBackground={false}
      >
        <View style={styles.screen}>
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 12,
                paddingBottom: Math.max(72, tabBarHeight + 44),
              },
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
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
            <View style={styles.scrollInner}>
              <ScrollTopGlow />
              <View style={styles.heroContainer}>
                <View style={styles.heroTopRow}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={openProfile}
                    style={styles.avatarButton}
                  >
                    {primaryPhotoUrl ? (
                      <Image
                        source={{ uri: primaryPhotoUrl }}
                        style={styles.avatarImage}
                        onError={() => setPrimaryPhotoUrl(null)}
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>
                        {avatarInitials}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => undefined}
                    style={styles.premiumButton}
                  >
                    <GradientBorderView
                      colors={[
                        'rgba(255, 255, 255, 0.35)',
                        'rgba(255, 255, 255, 0.025)',
                      ]}
                      gradientProps={{
                        locations: [0.29, 1],
                        start: { x: 0.49, y: 0 },
                        end: { x: 0.51, y: 1 },
                      }}
                      style={styles.premiumBorder}
                      contentStyle={styles.premiumBorderContent}
                    >
                      <BlurView
                        intensity={15}
                        tint="dark"
                        experimentalBlurMethod="dimezisBlurView"
                        style={styles.premiumBlur}
                      >
                        <Text style={styles.premiumText}>👑 Get premium</Text>
                      </BlurView>
                    </GradientBorderView>
                  </TouchableOpacity>
                </View>

                <Text style={styles.heroGreeting} numberOfLines={1}>
                  Hello {greetingName} 👋
                </Text>
                <Text style={styles.heroTitle}>The cosmos for you</Text>
                <Text style={styles.heroDate}>
                  Posotions on {positionsDate}
                </Text>

                <View style={styles.heroMetricRow}>
                  <View style={styles.heroMetric}>
                    <HeroMetricIcon type="sign" />
                    <View style={styles.heroMetricText}>
                      <Text style={styles.heroMetricLabel}>Sign</Text>
                      <Text style={styles.heroMetricValue} numberOfLines={1}>
                        {displayMoonSign}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.heroMetric}>
                    <HeroMetricIcon type="house" />
                    <View style={styles.heroMetricText}>
                      <Text style={styles.heroMetricLabel}>House</Text>
                      <Text style={styles.heroMetricValue} numberOfLines={1}>
                        {displayMoonHouse}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

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
                        category: dailyLearningLesson.category,
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
                        <Text
                          style={styles.learningLessonText}
                          numberOfLines={3}
                        >
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
                    key={`horoscope-${appLocale}-${predictions?.day?.date || 'empty'}-${predictions?.week?.date || 'empty'}-${predictions?.month?.date || 'empty'}`}
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
                    physicalPhase={biorhythms.physicalPhase}
                    emotionalPhase={biorhythms.emotionalPhase}
                    intellectualPhase={biorhythms.intellectualPhase}
                    overall={biorhythms.overall}
                    overallPhase={biorhythms.overallPhase}
                    summary={biorhythms.summary}
                    trend={biorhythms.trend}
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
            </View>
          </Animated.ScrollView>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.topFade,
              { height: insets.top + 56, opacity: topFadeOpacity },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(8, 14, 28, 0.98)',
                'rgba(8, 14, 28, 0.65)',
                'rgba(8, 14, 28, 0)',
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
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
    backgroundColor: '#080E1C',
  },
  scrollInner: {
    position: 'relative',
    overflow: 'visible',
  },
  topGlow: {
    position: 'absolute',
    top: -499,
    left: -250,
    right: -250,
    height: 1352,
    opacity: 0.8,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroContainer: {
    gap: 2,
  },
  heroTopRow: {
    height: 64,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.88,
    borderColor: 'rgba(124, 119, 153, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitials: {
    color: '#080E1C',
    fontSize: 15,
    fontWeight: '700',
  },
  premiumButton: {
    height: 40,
    borderRadius: 24,
    overflow: 'hidden',
  },
  premiumBorder: {
    height: 40,
    borderWidth: 1,
    borderRadius: 24,
  },
  premiumBorderContent: {
    borderRadius: 23,
    overflow: 'hidden',
  },
  premiumBlur: {
    height: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '500',
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0.24,
  },
  heroDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.16,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 20,
  },
  heroMetric: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
  },
  heroMetricIconWrap: {
    width: 36,
    height: 36,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  heroMetricIconFill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroMetricText: {
    flex: 1,
    minWidth: 0,
    height: 44,
    justifyContent: 'center',
  },
  heroMetricLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
  },
  heroMetricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
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
