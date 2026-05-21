import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { chartAPI } from '../services/api';
import type { ArchetypeResult } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import {
  normalizeSubscriptionTier,
  SubscriptionTier,
} from '../types/subscription';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import FullscreenLoadingScreen from '../components/shared/FullscreenLoadingScreen';
import { GradientBorderView } from '../components/shared';
import { logger } from '../services/logger';
import { readHoroscopeScreenInvalidationMarker } from '../services/horoscope-cache';

interface NatalChartScreenProps {
  navigation: any;
}

interface PlanetData {
  longitude: number;
  latitude: number;
  speed: number;
  sign: string;
  degree: number;
  retrograde: boolean;
  house?: number;
}

interface HouseData {
  cusp: number;
  sign: string;
}

interface AspectData {
  planetA: string;
  planetB: string;
  aspect: string;
  angle: number;
  orb: number;
  applying: boolean;
}

interface ChartData {
  id?: string;
  userId?: string;
  data: {
    planets: Record<string, PlanetData>;
    houses: Record<number, HouseData>;
    aspects: AspectData[];
    ascendant?: {
      sign: string;
      degree: number;
    };
    midheaven?: {
      sign: string;
      degree: number;
    };
    interpretation?: any;
    aiInterpretations?: Record<string, any>;
  };
  interpretation?: any;
  aiInterpretations?: Record<string, any>;
}

interface AngleData {
  sign: string;
  degree: number;
  longitude?: number;
}

type AngleKey = 'ascendant' | 'midheaven' | 'descendant' | 'ic';
type SummaryDetailPayload = {
  title: string;
  subtitle?: string;
  summary?: string;
  lines?: string[];
  variant?: 'default' | 'lesson';
};

type NarrativeSection = {
  title?: string;
  accent?: boolean;
  paragraphs: string[];
};

type NarrativeSectionLabels = {
  overview: string;
  dynamics: string;
  keyThought: string;
  finalSynthesis: string;
  mainConflict: string;
  mainGift: string;
  karmicTask: string;
};

// Planet symbols remain constant across languages
const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#FFD700',
  opposition: '#FF6347',
  trine: '#4ECDC4',
  square: '#FF6B35',
  sextile: '#9B59B6',
};

const formatDegree = (deg?: number): string => {
  if (typeof deg !== 'number' || !isFinite(deg)) return "0°0'";
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${m}'`;
};

const normalizeZodiacKey = (sign?: string): string => {
  const map: Record<string, string> = {
    aries: 'aries',
    taurus: 'taurus',
    gemini: 'gemini',
    cancer: 'cancer',
    leo: 'leo',
    virgo: 'virgo',
    libra: 'libra',
    scorpio: 'scorpio',
    sagittarius: 'sagittarius',
    capricorn: 'capricorn',
    aquarius: 'aquarius',
    pisces: 'pisces',
  };

  return (
    map[
      String(sign || '')
        .trim()
        .toLowerCase()
    ] ?? String(sign || '')
  );
};

const hasChartPayload = (value: any): boolean =>
  Boolean(value && typeof value === 'object' && value.planets && value.houses);

const sanitizeNarrativeFormatting = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/g, '')
        .replace(/^\s*№\s*\d+(?:\.\d+)*[\).:\-–—]?\s*/giu, '')
        .replace(/^\s*\d+(?:\.\d+)*[\).:\-–—]\s*/g, '')
        .trim()
    )
    .filter((line) => !/^[-–—*_]{3,}$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeNarrativeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return sanitizeNarrativeFormatting(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeNarrativeValue).filter(Boolean).join('\n\n');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of [
      'narrative',
      'premiumNarrative',
      'aiNarrative',
      'text',
      'content',
      'summary',
    ]) {
      const normalized = normalizeNarrativeValue(record[key]);
      if (normalized) return normalized;
    }
  }

  return '';
};

const getPremiumNarrativeFromChart = (
  chart: ChartData | null,
  locale: 'ru' | 'en' | 'es'
): string => {
  const data = (chart?.data || {}) as Record<string, any>;
  const root = (chart || {}) as Record<string, any>;
  const interpretation = data?.interpretation;
  const candidates = [
    interpretation?.premiumSummary,
    interpretation?.freeformSummary,
    interpretation?.aiNarrative,
    interpretation?.premiumNarrative,
    data?.interpretation?.premiumSummary,
    data?.interpretation?.freeformSummary,
    data?.aiInterpretations?.[locale]?.narrative,
    data?.aiInterpretations?.[locale]?.premiumNarrative,
    data?.aiInterpretations?.ru?.narrative,
    data?.aiInterpretations?.ru?.premiumNarrative,
    data?.interpretation?.aiNarrative,
    data?.interpretation?.premiumNarrative,
    root?.aiInterpretations?.[locale]?.narrative,
    root?.aiInterpretations?.[locale]?.premiumNarrative,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeNarrativeValue(candidate);
    if (normalized) return normalized;
  }

  return '';
};

const isNarrativeSectionTitle = (value: string): boolean => {
  const text = value.trim();
  if (!text) return false;
  if (/^(👉|📋)\s*/u.test(text)) return true;
  if (text.endsWith(':') && text.length <= 90) return true;
  return (
    text.length <= 70 &&
    !/[.!?。]$/.test(text) &&
    !text.includes(',') &&
    text.split(/\s+/).length <= 7
  );
};

const splitHeadingAndBody = (
  value: string,
  markers: RegExp[]
): { heading: string; body: string } | null => {
  const text = value.trim();
  for (const marker of markers) {
    const match = text.match(marker);
    if (match?.index === 0) {
      const heading = match[0].trim().replace(/:$/, '');
      const body = text.slice(match[0].length).trim();
      return { heading, body };
    }
  }
  return null;
};

const splitNarrativeIntoSections = (
  parts: string[],
  labels: NarrativeSectionLabels
): NarrativeSection[] => {
  const normalized = parts
    .map(normalizeNarrativeValue)
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n(?=(👉|📋)\s*)/gu, '\n\n')
    .replace(/(👉\s*[^:\n]{1,80}:)/gu, '\n\n$1\n')
    .replace(/(📋\s*[^\n]{1,80})/gu, '\n\n$1\n');

  const chunks = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const overviewParagraphs: string[] = [];
  const explicitSections: NarrativeSection[] = [];
  const finalParagraphs: string[] = [];
  let current: NarrativeSection | null = null;
  let inFinalSynthesis = false;

  const pushCurrent = () => {
    if (current && current.paragraphs.length) {
      explicitSections.push(current);
    }
    current = null;
  };

  chunks.forEach((chunk) => {
    const lines = chunk
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const firstLine = lines[0] || '';
    const keyThought = splitHeadingAndBody(chunk, [
      /^👉\s*[^:\n]{1,80}:\s*/u,
      /^(key thought|idea clave|ключевая мысль)\s*:\s*/iu,
    ]);
    if (keyThought) {
      pushCurrent();
      explicitSections.push({
        title: labels.keyThought,
        accent: true,
        paragraphs: [keyThought.body || lines.slice(1).join('\n')].filter(
          Boolean
        ),
      });
      return;
    }

    const finalHeading = splitHeadingAndBody(chunk, [
      /^📋\s*[^\n]{1,80}\s*/u,
      /^(итоговый синтез|final synthesis|síntesis final|sintesis final)\s*:?/iu,
    ]);
    if (finalHeading) {
      pushCurrent();
      inFinalSynthesis = true;
      if (finalHeading.body) {
        finalParagraphs.push(finalHeading.body);
      }
      return;
    }

    if (inFinalSynthesis) {
      finalParagraphs.push(chunk);
      return;
    }

    if (lines.length > 1 && isNarrativeSectionTitle(firstLine)) {
      pushCurrent();
      current = {
        title: firstLine.replace(/:$/, ''),
        paragraphs: lines.slice(1),
      };
      return;
    }

    if (lines.length === 1 && isNarrativeSectionTitle(firstLine)) {
      pushCurrent();
      current = { title: firstLine.replace(/:$/, ''), paragraphs: [] };
      return;
    }

    if (!current) {
      overviewParagraphs.push(chunk);
      return;
    }
    current.paragraphs.push(chunk);
  });

  pushCurrent();

  const sections: NarrativeSection[] = [];
  if (overviewParagraphs.length) {
    sections.push({
      title: labels.overview,
      accent: true,
      paragraphs: overviewParagraphs.slice(0, 2),
    });

    if (overviewParagraphs.length > 2) {
      sections.push({
        title: labels.dynamics,
        paragraphs: overviewParagraphs.slice(2),
      });
    }
  }

  sections.push(...explicitSections);

  if (finalParagraphs.length) {
    const finalTitles = [
      labels.mainConflict,
      labels.mainGift,
      labels.karmicTask,
    ];

    finalParagraphs.slice(0, 3).forEach((paragraph, idx) => {
      sections.push({
        title: finalTitles[idx] || labels.finalSynthesis,
        accent: idx === 0,
        paragraphs: [paragraph],
      });
    });

    if (finalParagraphs.length > 3) {
      sections.push({
        title: labels.finalSynthesis,
        paragraphs: finalParagraphs.slice(3),
      });
    }
  }

  return sections.length ? sections : [{ paragraphs: chunks }];
};

const normalizeNatalChartResponse = (response: any): ChartData => {
  if (hasChartPayload(response?.data)) {
    return response as ChartData;
  }

  if (hasChartPayload(response?.data?.data)) {
    return {
      ...response,
      data: {
        ...response.data.data,
        interpretation:
          response.data.data.interpretation ??
          response.data.interpretation ??
          response.interpretation,
        aiInterpretations:
          response.data.data.aiInterpretations ??
          response.data.aiInterpretations ??
          response.aiInterpretations,
      },
      aiInterpretations:
        response.data.data.aiInterpretations ??
        response.data.aiInterpretations ??
        response.aiInterpretations,
    };
  }

  if (hasChartPayload(response?.data?.data?.data)) {
    return {
      ...response,
      data: {
        ...response.data.data.data,
        interpretation:
          response.data.data.data.interpretation ??
          response.data.data.interpretation ??
          response.data.interpretation ??
          response.interpretation,
        aiInterpretations:
          response.data.data.data.aiInterpretations ??
          response.data.data.aiInterpretations ??
          response.data.aiInterpretations ??
          response.aiInterpretations,
      },
      aiInterpretations:
        response.data.data.data.aiInterpretations ??
        response.data.data.aiInterpretations ??
        response.data.aiInterpretations ??
        response.aiInterpretations,
    };
  }

  return response as ChartData;
};

const getHouseForLongitude = (
  longitude: number,
  houses: Record<number, HouseData>
): number => {
  const normLon = ((longitude % 360) + 360) % 360;
  for (let i = 1; i <= 12; i++) {
    const current = houses[i]?.cusp ?? 0;
    const next = houses[i === 12 ? 1 : i + 1]?.cusp ?? 0;
    const normCurrent = ((current % 360) + 360) % 360;
    const normNext = ((next % 360) + 360) % 360;

    if (normCurrent < normNext) {
      if (normLon >= normCurrent && normLon < normNext) return i;
    } else {
      if (normLon >= normCurrent || normLon < normNext) return i;
    }
  }
  return 1;
};

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { subscription } = useSubscription();
  const prevTierRef = useRef<string | undefined>(subscription?.tier);
  const hasLoadedOnceRef = useRef(false);
  const lastInvalidationMarkerRef = useRef<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [archetype, setArchetype] = useState<ArchetypeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'planets' | 'houses' | 'aspects' | 'summary'
  >('summary');
  const [angleModalVisible, setAngleModalVisible] = useState(false);
  const [angleModalLoading, setAngleModalLoading] = useState(false);
  const [angleModalTitle, setAngleModalTitle] = useState('');
  const [angleModalSubtitle, setAngleModalSubtitle] = useState('');
  const [angleModalSummary, setAngleModalSummary] = useState('');
  const [angleModalLines, setAngleModalLines] = useState<string[]>([]);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryModalTitle, setSummaryModalTitle] = useState('');
  const [summaryModalSubtitle, setSummaryModalSubtitle] = useState('');
  const [summaryModalSummary, setSummaryModalSummary] = useState('');
  const [summaryModalLines, setSummaryModalLines] = useState<string[]>([]);
  const [summaryModalVariant, setSummaryModalVariant] = useState<
    'default' | 'lesson'
  >('default');

  const hasPremiumSubscription =
    normalizeSubscriptionTier(subscription?.tier) ===
      SubscriptionTier.PREMIUM &&
    Boolean(subscription?.isActive || subscription?.isTrial);

  const getChartLocale = useCallback((): 'ru' | 'en' | 'es' => {
    const rawLocale = String(i18n.language || 'en').toLowerCase();
    if (rawLocale === 'en' || rawLocale.startsWith('en-')) return 'en';
    if (rawLocale === 'es' || rawLocale.startsWith('es-')) return 'es';
    return 'ru';
  }, [i18n.language]);

  const getZodiacLabel = useCallback(
    (sign?: string): string => {
      const raw = String(sign || '').trim();
      if (!raw || raw === 'N/A') return raw || 'N/A';
      return t(`common.zodiacSigns.${normalizeZodiacKey(raw)}`, {
        defaultValue: raw,
      });
    },
    [t]
  );

  const loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      const locale = getChartLocale();
      const [chartResult, archetypeResult] = await Promise.allSettled([
        chartAPI.getNatalChartWithInterpretation(locale),
        chartAPI.getArchetype(locale),
      ]);

      if (chartResult.status !== 'fulfilled') {
        throw chartResult.reason;
      }

      const rawData = chartResult.value;
      const data = normalizeNatalChartResponse(rawData);

      // Подробное логирование для отладки структуры
      logger.info('Полная структура данных', {
        level1Keys: rawData ? Object.keys(rawData) : [],
        level2Keys: rawData?.data ? Object.keys(rawData.data) : [],
        level3Keys: rawData?.data?.data ? Object.keys(rawData.data.data) : [],
        level4Keys: rawData?.data?.data?.data
          ? Object.keys(rawData.data.data.data)
          : [],

        // Где находятся planets?
        hasPlanetsInL2: !!rawData?.data?.planets,
        hasPlanetsInL3: !!rawData?.data?.data?.planets,
        hasPlanetsInL4: !!rawData?.data?.data?.data?.planets,
        normalizedKeys: data?.data ? Object.keys(data.data) : [],
        premiumNarrativeLength: normalizeNarrativeValue(
          data?.data?.interpretation?.aiNarrative ||
            data?.data?.interpretation?.premiumNarrative ||
            data?.data?.aiInterpretations?.[locale]?.narrative ||
            data?.data?.aiInterpretations?.[locale]?.premiumNarrative
        ).length,
      });
      setChartData(data);

      if (archetypeResult.status === 'fulfilled') {
        setArchetype(archetypeResult.value);
      } else {
        setArchetype(null);
        logger.info('Архетип не загружен', archetypeResult.reason);
      }
    } catch (error: any) {
      logger.error('Ошибка загрузки натальной карты', error);
      setArchetype(null);
      Alert.alert(
        t('common.errors.generic'),
        t('natalChart.errors.failedToLoad')
      );
    } finally {
      setLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [getChartLocale, t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChartData();
    setRefreshing(false);
  };

  useEffect(() => {
    const nextTier = subscription?.tier;
    if (prevTierRef.current && nextTier && prevTierRef.current !== nextTier) {
      void loadChartData();
    }
    prevTierRef.current = nextTier;
  }, [loadChartData, subscription?.tier]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      void (async () => {
        const invalidationMarker =
          await readHoroscopeScreenInvalidationMarker();
        const wasInvalidated =
          invalidationMarker !== null &&
          invalidationMarker !== lastInvalidationMarkerRef.current;

        if (!hasLoadedOnceRef.current || wasInvalidated) {
          if (!cancelled) {
            await loadChartData();
          }
        }

        if (!cancelled) {
          lastInvalidationMarkerRef.current = invalidationMarker;
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [loadChartData])
  );

  const isPremiumNarrativePending = useCallback(
    (): boolean =>
      hasPremiumSubscription &&
      !getPremiumNarrativeFromChart(chartData, getChartLocale()),
    [chartData, getChartLocale, hasPremiumSubscription]
  );

  useEffect(() => {
    if (!chartData?.data || !isPremiumNarrativePending()) {
      return;
    }

    let cancelled = false;
    const retryDelays = [7000, 15000, 30000];
    const timers = retryDelays.map((delay) =>
      setTimeout(() => {
        if (!cancelled) {
          void (async () => {
            try {
              const locale = getChartLocale();
              const rawData =
                await chartAPI.getNatalChartWithInterpretation(locale);
              if (!cancelled) {
                setChartData(normalizeNatalChartResponse(rawData));
              }
            } catch (error) {
              logger.info('AI natal summary is still pending', error);
            }
          })();
        }
      }, delay)
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [chartData, getChartLocale, isPremiumNarrativePending]);

  if (loading) {
    return <FullscreenLoadingScreen />;
  }

  if (!chartData?.data) {
    return (
      <TabScreenLayout>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#8B5CF6" />
          <Text style={styles.errorText}>
            {t('natalChart.errors.notFound')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
            <Text style={styles.retryButtonText}>
              {t('natalChart.buttons.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </TabScreenLayout>
    );
  }

  // Извлекаем данные из правильной структуры
  const { planets, houses, aspects, ascendant, midheaven } = chartData.data;
  const interpretation = chartData.data?.interpretation;
  const resolvedAscendant: AngleData = ascendant || {
    sign: houses?.[1]?.sign || 'N/A',
    degree: typeof houses?.[1]?.cusp === 'number' ? houses[1].cusp % 30 : 0,
  };
  const resolvedMidheaven: AngleData = midheaven || {
    sign: houses?.[10]?.sign || 'N/A',
    degree: typeof houses?.[10]?.cusp === 'number' ? houses[10].cusp % 30 : 0,
  };

  // Вкладки
  const tabs: Array<{
    id: 'summary' | 'planets' | 'houses' | 'aspects' | 'overview';
    label: string;
    icon:
      | 'star-outline'
      | 'planet-outline'
      | 'home-outline'
      | 'git-network-outline'
      | 'document-text-outline';
  }> = [
    {
      id: 'summary',
      label: t('natalChart.tabs.summary'),
      icon: 'document-text-outline',
    },
    {
      id: 'overview',
      label: t('natalChart.tabs.overview'),
      icon: 'star-outline',
    },
    {
      id: 'planets',
      label: t('natalChart.tabs.planets'),
      icon: 'planet-outline',
    },
    { id: 'houses', label: t('natalChart.tabs.houses'), icon: 'home-outline' },
    {
      id: 'aspects',
      label: t('natalChart.tabs.aspects'),
      icon: 'git-network-outline',
    },
  ];

  const closeAngleModal = () => {
    setAngleModalVisible(false);
    setAngleModalLoading(false);
    setAngleModalTitle('');
    setAngleModalSubtitle('');
    setAngleModalSummary('');
    setAngleModalLines([]);
  };

  const openAngleDetails = async (angle: AngleKey) => {
    const rawLocale = ['ru', 'en', 'es'].includes(i18n.language)
      ? i18n.language
      : i18n.language.split('-')[0];
    const locale = (
      ['ru', 'en', 'es'].includes(rawLocale) ? rawLocale : 'ru'
    ) as 'ru' | 'en' | 'es';

    const config = {
      ascendant: {
        symbol: 'ASC',
        title: t('natalChart.angles.ascendant'),
        sign: resolvedAscendant.sign,
        degree: resolvedAscendant.degree,
        summary: interpretation?.ascendant?.interpretation || '',
        request: {
          type: 'ascendant' as const,
          sign: resolvedAscendant.sign,
          locale,
        },
      },
      midheaven: {
        symbol: 'MC',
        title: t('natalChart.angles.midheaven'),
        sign: resolvedMidheaven.sign,
        degree: resolvedMidheaven.degree,
        summary:
          interpretation?.houses?.find((house: any) => house.house === 10)
            ?.interpretation || '',
        request: {
          type: 'house' as const,
          houseNum: 10,
          sign: resolvedMidheaven.sign,
          locale,
        },
      },
      descendant: {
        symbol: 'DSC',
        title: t('natalChart.angles.descendant'),
        sign: houses?.[7]?.sign || 'N/A',
        degree: typeof houses?.[7]?.cusp === 'number' ? houses[7].cusp % 30 : 0,
        summary:
          interpretation?.houses?.find((house: any) => house.house === 7)
            ?.interpretation || '',
        request: {
          type: 'house' as const,
          houseNum: 7,
          sign: houses?.[7]?.sign || 'Aries',
          locale,
        },
      },
      ic: {
        symbol: 'IC',
        title: t('natalChart.angles.ic'),
        sign: houses?.[4]?.sign || 'N/A',
        degree: typeof houses?.[4]?.cusp === 'number' ? houses[4].cusp % 30 : 0,
        summary:
          interpretation?.houses?.find((house: any) => house.house === 4)
            ?.interpretation || '',
        request: {
          type: 'house' as const,
          houseNum: 4,
          sign: houses?.[4]?.sign || 'Aries',
          locale,
        },
      },
    }[angle];

    setAngleModalTitle(`${config.symbol} · ${config.title}`);
    setAngleModalSubtitle(
      `${getZodiacLabel(config.sign)} ${formatDegree(config.degree)}`
    );
    setAngleModalSummary(config.summary);
    setAngleModalLines([]);
    setAngleModalVisible(true);
    setAngleModalLoading(true);

    try {
      const details = await chartAPI.getInterpretationDetails(config.request);
      setAngleModalLines(details?.lines || []);
    } catch (error) {
      logger.error('Ошибка загрузки расшифровки угла карты', error);
      setAngleModalLines([t('natalChart.angleModal.detailsError')]);
    } finally {
      setAngleModalLoading(false);
    }
  };

  const closeSummaryModal = () => {
    setSummaryModalVisible(false);
    setSummaryModalTitle('');
    setSummaryModalSubtitle('');
    setSummaryModalSummary('');
    setSummaryModalLines([]);
    setSummaryModalVariant('default');
  };

  const openSummaryModal = ({
    title,
    subtitle = '',
    summary = '',
    lines = [],
    variant = 'default',
  }: SummaryDetailPayload) => {
    setSummaryModalTitle(title);
    setSummaryModalSubtitle(subtitle);
    setSummaryModalSummary(summary);
    setSummaryModalLines(lines.filter(Boolean));
    setSummaryModalVariant(variant);
    setSummaryModalVisible(true);
  };

  const renderSummaryOpenHint = (extraCount?: number) => (
    <View style={styles.summaryCardFooter}>
      <Text style={styles.summaryCardFooterText}>
        {t('natalChart.summary.openDetails', 'Подробнее')}
        {typeof extraCount === 'number' && extraCount > 0
          ? ` · +${extraCount}`
          : ''}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(139, 92, 246, 0.9)"
      />
    </View>
  );

  const renderPreviewList = (
    items: string[],
    bulletStyle?: StyleProp<ViewStyle>,
    previewCount: number = 2
  ) => {
    const visibleCount = Math.min(previewCount, 1);

    return (
      <View style={styles.traitsList}>
        {items.slice(0, visibleCount).map((item, idx) => (
          <View key={`${item}-${idx}`} style={styles.traitItem}>
            <View style={[styles.traitBullet, bulletStyle]} />
            <Text style={styles.traitText} numberOfLines={3}>
              {item}
            </Text>
          </View>
        ))}
        {renderSummaryOpenHint(
          items.length > visibleCount ? items.length - visibleCount : undefined
        )}
      </View>
    );
  };

  const splitNarrativeParagraphs = (text?: string): string[] =>
    (text || '')
      .split(/\n{2,}|\r\n\r\n/)
      .map((part) => part.trim())
      .filter(Boolean);

  const renderLessonModalContent = () => {
    const sections = splitNarrativeIntoSections(
      [summaryModalSummary, ...summaryModalLines],
      {
        overview: t(
          'natalChart.premiumNarrative.sections.overview',
          'Общий портрет'
        ),
        dynamics: t(
          'natalChart.premiumNarrative.sections.dynamics',
          'Внутренняя динамика'
        ),
        keyThought: t(
          'natalChart.premiumNarrative.sections.keyThought',
          'Ключевая мысль'
        ),
        finalSynthesis: t(
          'natalChart.premiumNarrative.sections.finalSynthesis',
          'Итоговый синтез'
        ),
        mainConflict: t(
          'natalChart.premiumNarrative.sections.mainConflict',
          'Главный конфликт карты'
        ),
        mainGift: t(
          'natalChart.premiumNarrative.sections.mainGift',
          'Главный дар и сила'
        ),
        karmicTask: t(
          'natalChart.premiumNarrative.sections.karmicTask',
          'Кармическая задача'
        ),
      }
    );

    return sections.map((section, sectionIdx) => (
      <View
        key={`${section.title || 'section'}-${sectionIdx}`}
        style={[
          styles.modalLessonSection,
          section.accent && styles.modalLessonSectionFirst,
        ]}
      >
        {!!section.title && (
          <Text style={styles.modalLessonSectionTitle}>{section.title}</Text>
        )}
        {section.paragraphs.map((paragraph, paragraphIdx) => (
          <Text
            key={`${paragraph}-${paragraphIdx}`}
            style={styles.modalLessonParagraph}
          >
            {paragraph}
          </Text>
        ))}
      </View>
    ));
  };

  const getPremiumNarrative = (): string => {
    return getPremiumNarrativeFromChart(chartData, getChartLocale());
  };

  const renderPremiumNarrativePendingCard = () => {
    if (!isPremiumNarrativePending()) {
      return null;
    }

    return (
      <View style={styles.premiumNarrativeTouchable}>
        <GradientBorderView
          colors={[
            'rgba(237, 164, 255, 0.65)',
            'rgba(141, 38, 169, 0.22)',
            'rgba(237, 164, 255, 0)',
          ]}
          gradientProps={{
            locations: [0, 0.44, 1],
            start: { x: 0.08, y: 0 },
            end: { x: 0.92, y: 1 },
          }}
          style={styles.premiumNarrativeBorder}
          contentStyle={styles.premiumNarrativeContent}
        >
          <BlurView
            intensity={20}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.premiumNarrativeBlur}
          >
            <LinearGradient
              colors={['rgba(89, 2, 114, 0.25)', 'rgba(21, 8, 25, 0.35)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumNarrativeGradient}
            >
              <View style={styles.premiumNarrativeHeader}>
                <View style={styles.premiumNarrativeIconWrap}>
                  <ActivityIndicator size="small" color="#4C1D95" />
                </View>
                <View style={styles.premiumNarrativeHeaderText}>
                  <Text style={styles.premiumNarrativeLabel}>
                    {t(
                      'natalChart.premiumNarrative.pendingLabel',
                      'Premium AI'
                    )}
                  </Text>
                  <Text style={styles.premiumNarrativeTitle}>
                    {t(
                      'natalChart.premiumNarrative.pendingTitle',
                      'AI-резюме готовится'
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.premiumNarrativeLessonText}>
                {t(
                  'natalChart.premiumNarrative.pendingText',
                  'Пока показываем базовую натальную интерпретацию. AI-синтез догружается и появится здесь автоматически.'
                )}
              </Text>
            </LinearGradient>
          </BlurView>
        </GradientBorderView>
      </View>
    );
  };

  const renderPremiumNarrativeCard = () => {
    const premiumNarrative = getPremiumNarrative();
    if (!premiumNarrative) {
      return renderPremiumNarrativePendingCard();
    }

    const premiumNarrativeParagraphs =
      splitNarrativeParagraphs(premiumNarrative);
    const previewParagraphs = premiumNarrativeParagraphs.slice(0, 2);

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.premiumNarrativeTouchable}
        onPress={() =>
          openSummaryModal({
            title: t('natalChart.premiumNarrative.title', 'Резюме от AI'),
            subtitle: t(
              'natalChart.premiumNarrative.subtitle',
              'Расширенный синтез карты'
            ),
            summary: premiumNarrativeParagraphs[0] || premiumNarrative,
            lines:
              premiumNarrativeParagraphs.length > 1
                ? premiumNarrativeParagraphs.slice(1)
                : [],
            variant: 'lesson',
          })
        }
      >
        <GradientBorderView
          colors={[
            'rgba(237, 164, 255, 0.85)',
            'rgba(141, 38, 169, 0.28)',
            'rgba(237, 164, 255, 0)',
          ]}
          gradientProps={{
            locations: [0, 0.44, 1],
            start: { x: 0.08, y: 0 },
            end: { x: 0.92, y: 1 },
          }}
          style={styles.premiumNarrativeBorder}
          contentStyle={styles.premiumNarrativeContent}
        >
          <BlurView
            intensity={20}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.premiumNarrativeBlur}
          >
            <LinearGradient
              colors={['rgba(89, 2, 114, 0.35)', 'rgba(21, 8, 25, 0.35)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumNarrativeGradient}
            >
              <View style={styles.premiumNarrativeHeader}>
                <View style={styles.premiumNarrativeIconWrap}>
                  <Ionicons name="sparkles-outline" size={20} color="#4C1D95" />
                </View>
                <View style={styles.premiumNarrativeHeaderText}>
                  <Text style={styles.premiumNarrativeLabel}>
                    {t(
                      'natalChart.premiumNarrative.subtitle',
                      'Расширенный синтез карты'
                    )}
                  </Text>
                  <Text style={styles.premiumNarrativeTitle}>
                    {t('natalChart.premiumNarrative.title', 'Резюме от AI')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </View>

              <Text style={styles.premiumNarrativeLessonTitle}>
                {t(
                  'natalChart.premiumNarrative.cardTitle',
                  'Ключевой смысл карты'
                )}
              </Text>
              <Text style={styles.premiumNarrativeLessonText} numberOfLines={3}>
                {(previewParagraphs.length
                  ? previewParagraphs
                  : [premiumNarrative]
                ).join('\n\n')}
              </Text>

              <View style={styles.premiumNarrativeFooter}>
                <Text style={styles.premiumNarrativeCta}>
                  {t('natalChart.summary.openDetails', 'Подробнее')}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#DDD6FE" />
              </View>
            </LinearGradient>
          </BlurView>
        </GradientBorderView>
      </TouchableOpacity>
    );
  };

  const renderArchetypeCard = () => {
    if (!archetype) {
      return null;
    }

    return (
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.cardInner}
          onPress={() =>
            openSummaryModal({
              title: `${t('natalChart.summary.archetype.title', 'Архетип')} · ${archetype.title}`,
              subtitle: archetype.subtitle,
              summary: archetype.overview,
              lines: [
                archetype.essence,
                `${t('natalChart.summary.archetype.strengths', 'Сильные стороны')}:`,
                ...archetype.strengths.map((item) => `• ${item}`),
                `${t('natalChart.summary.archetype.shadows', 'Теневые паттерны')}:`,
                ...archetype.shadowPatterns.map((item) => `• ${item}`),
                `${t('natalChart.summary.archetype.relationships', 'В отношениях')}: ${archetype.relationships}`,
                `${t('natalChart.summary.archetype.work', 'В работе')}: ${archetype.work}`,
                `${t('natalChart.summary.archetype.growthTask', 'Задача роста')}: ${archetype.growthTask}`,
                archetype.note,
              ],
            })
          }
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles-outline" size={24} color="#FFD700" />
            <Text style={styles.summaryTitle}>
              {t('natalChart.summary.archetype.title', 'Архетип')}
            </Text>
          </View>
          <Text style={styles.summaryText}>{archetype.title}</Text>
          <Text style={styles.summarySubtext} numberOfLines={2}>
            {archetype.subtitle}
          </Text>
          <Text style={styles.summarySubtext} numberOfLines={3}>
            {archetype.essence}
          </Text>
          <View style={[styles.chipContainer, styles.summaryGuideChips]}>
            <View style={styles.elementChip}>
              <Text style={styles.elementChipText}>
                {archetype.source === 'natal'
                  ? t(
                      'natalChart.summary.archetype.sourceNatal',
                      'По натальной карте'
                    )
                  : t(
                      'natalChart.summary.archetype.sourceDateOnly',
                      'По дате рождения'
                    )}
              </Text>
            </View>
            <View style={styles.elementChip}>
              <Text style={styles.elementChipText}>
                {t('natalChart.summary.archetype.lifePath', {
                  defaultValue: 'Путь {{num}}',
                  num: archetype.blueprint.lifePathNumber,
                })}
              </Text>
            </View>
            <View style={styles.elementChip}>
              <Text style={styles.elementChipText}>
                {t('natalChart.summary.archetype.dominantElement', {
                  defaultValue: 'Стихия {{element}}',
                  element: archetype.blueprint.dominantElement,
                })}
              </Text>
            </View>
          </View>
          {renderSummaryOpenHint(
            archetype.strengths.length + archetype.shadowPatterns.length + 2
          )}
        </TouchableOpacity>
      </BlurView>
    );
  };

  const renderSummaryListCard = ({
    title,
    icon,
    color,
    items,
    hint,
    bulletStyle,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    items?: string[];
    hint?: string;
    bulletStyle?: StyleProp<ViewStyle>;
  }) => {
    const normalizedItems = (items || [])
      .map((item) => normalizeNarrativeValue(item))
      .filter(Boolean);

    if (!normalizedItems.length) {
      return null;
    }

    return (
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.cardInner}
          onPress={() =>
            openSummaryModal({
              title,
              summary: hint || normalizedItems[0],
              lines: hint ? normalizedItems : normalizedItems.slice(1),
            })
          }
        >
          <View style={styles.summaryHeader}>
            <Ionicons name={icon} size={24} color={color} />
            <Text style={styles.summaryTitle}>{title}</Text>
          </View>
          {hint ? (
            <Text style={styles.summarySubtext} numberOfLines={3}>
              {hint}
            </Text>
          ) : null}
          {!hint
            ? renderPreviewList(normalizedItems, bulletStyle, 1)
            : renderSummaryOpenHint(normalizedItems.length)}
        </TouchableOpacity>
      </BlurView>
    );
  };

  // Основная информация
  const renderOverview = () => {
    const sunSign = getZodiacLabel(planets?.sun?.sign || 'N/A');
    const moonSign = getZodiacLabel(planets?.moon?.sign || 'N/A');
    const ascSign = getZodiacLabel(resolvedAscendant.sign || 'N/A');
    // Подсчет элементов и качеств
    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    const qualities = { cardinal: 0, fixed: 0, mutable: 0 };

    const elementMap: Record<string, keyof typeof elements> = {
      aries: 'fire',
      leo: 'fire',
      sagittarius: 'fire',
      taurus: 'earth',
      virgo: 'earth',
      capricorn: 'earth',
      gemini: 'air',
      libra: 'air',
      aquarius: 'air',
      cancer: 'water',
      scorpio: 'water',
      pisces: 'water',
    };

    const qualityMap: Record<string, keyof typeof qualities> = {
      aries: 'cardinal',
      cancer: 'cardinal',
      libra: 'cardinal',
      capricorn: 'cardinal',
      taurus: 'fixed',
      leo: 'fixed',
      scorpio: 'fixed',
      aquarius: 'fixed',
      gemini: 'mutable',
      virgo: 'mutable',
      sagittarius: 'mutable',
      pisces: 'mutable',
    };

    if (planets) {
      Object.values(planets).forEach((planet) => {
        if (planet?.sign) {
          const sign = planet.sign.toLowerCase();
          if (elementMap[sign]) elements[elementMap[sign]]++;
          if (qualityMap[sign]) qualities[qualityMap[sign]]++;
        }
      });
    }

    const dominantElement = Object.entries(elements).sort(
      ([, a], [, b]) => b - a
    )[0];
    const dominantQuality = Object.entries(qualities).sort(
      ([, a], [, b]) => b - a
    )[0];

    const retrogradeCount = planets
      ? Object.values(planets).filter((p) => p?.retrograde).length
      : 0;

    return (
      <View style={styles.content}>
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, styles.cardTitleInline]}>
                {t('natalChart.bigThree.title')}
              </Text>
            </View>

            <View style={styles.bigThreeRow}>
              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☉</Text>
                <Text style={styles.bigThreeLabel}>
                  {t('natalChart.bigThree.sun')}
                </Text>
                <Text style={styles.bigThreeValue}>{sunSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets?.sun?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☽</Text>
                <Text style={styles.bigThreeLabel}>
                  {t('natalChart.bigThree.moon')}
                </Text>
                <Text style={styles.bigThreeValue}>{moonSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets?.moon?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>ASC</Text>
                <Text style={styles.bigThreeLabel}>
                  {t('natalChart.bigThree.ascendant')}
                </Text>
                <Text style={styles.bigThreeValue}>{ascSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(resolvedAscendant.degree || 0)}
                </Text>
              </View>
            </View>

            {!!(
              interpretation?.sunSign?.interpretation ||
              interpretation?.moonSign?.interpretation ||
              interpretation?.ascendant?.interpretation
            ) && (
              <>
                <View style={styles.divider} />
                <View style={styles.bigThreeDescriptions}>
                  {!!interpretation?.sunSign?.interpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `☉ ${t('natalChart.bigThree.sun')}`,
                          subtitle: `${sunSign} ${formatDegree(
                            planets?.sun?.degree || 0
                          )}`,
                          summary: interpretation.sunSign.interpretation,
                        })
                      }
                    >
                      <Text style={styles.bigThreeDescriptionTitle}>
                        ☉ {t('natalChart.bigThree.sun')}
                      </Text>
                      <Text style={styles.bigThreeDescriptionMeta}>
                        {sunSign} {formatDegree(planets?.sun?.degree || 0)}
                      </Text>
                      <Text
                        style={styles.bigThreeDescriptionText}
                        numberOfLines={3}
                      >
                        {interpretation.sunSign.interpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}

                  {!!interpretation?.moonSign?.interpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `☽ ${t('natalChart.bigThree.moon')}`,
                          subtitle: `${moonSign} ${formatDegree(
                            planets?.moon?.degree || 0
                          )}`,
                          summary: interpretation.moonSign.interpretation,
                        })
                      }
                    >
                      <Text style={styles.bigThreeDescriptionTitle}>
                        ☽ {t('natalChart.bigThree.moon')}
                      </Text>
                      <Text style={styles.bigThreeDescriptionMeta}>
                        {moonSign} {formatDegree(planets?.moon?.degree || 0)}
                      </Text>
                      <Text
                        style={styles.bigThreeDescriptionText}
                        numberOfLines={3}
                      >
                        {interpretation.moonSign.interpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}

                  {!!interpretation?.ascendant?.interpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `ASC ${t('natalChart.bigThree.ascendant')}`,
                          subtitle: `${ascSign} ${formatDegree(
                            resolvedAscendant.degree || 0
                          )}`,
                          summary: interpretation.ascendant.interpretation,
                        })
                      }
                    >
                      <Text style={styles.bigThreeDescriptionTitle}>
                        ASC {t('natalChart.bigThree.ascendant')}
                      </Text>
                      <Text style={styles.bigThreeDescriptionMeta}>
                        {ascSign} {formatDegree(resolvedAscendant.degree || 0)}
                      </Text>
                      <Text
                        style={styles.bigThreeDescriptionText}
                        numberOfLines={3}
                      >
                        {interpretation.ascendant.interpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>
              {t('natalChart.statistics.title')}
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.planets')}
                </Text>
                <Text style={styles.statValue}>
                  {planets ? Object.keys(planets).length : 0}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.aspects')}
                </Text>
                <Text style={styles.statValue}>{aspects?.length || 0}</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.retrograde')}
                </Text>
                <Text style={styles.statValue}>{retrogradeCount}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.dominantElement')}
                </Text>
                <Text style={styles.statValueLarge}>
                  {dominantElement?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantElement?.[1] || 0})
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.dominantModality')}
                </Text>
                <Text style={styles.statValueLarge}>
                  {dominantQuality?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantQuality?.[1] || 0})
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, styles.cardTitleInline]}>
                {t('natalChart.angles.title')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.angleItem}
              activeOpacity={0.85}
              onPress={() => openAngleDetails('ascendant')}
            >
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>ASC</Text>
                <Text style={styles.angleLabel}>
                  {t('natalChart.angles.ascendant')}
                </Text>
              </View>
              <Text style={styles.angleValue}>
                {getZodiacLabel(resolvedAscendant.sign)}{' '}
                {formatDegree(resolvedAscendant.degree || 0)}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
              {!!interpretation?.ascendant?.interpretation && (
                <Text style={styles.angleDescription} numberOfLines={3}>
                  {interpretation.ascendant.interpretation}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.angleItem}
              activeOpacity={0.85}
              onPress={() => openAngleDetails('midheaven')}
            >
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>MC</Text>
                <Text style={styles.angleLabel}>
                  {t('natalChart.angles.midheaven')}
                </Text>
              </View>
              <Text style={styles.angleValue}>
                {getZodiacLabel(resolvedMidheaven.sign)}{' '}
                {formatDegree(resolvedMidheaven.degree || 0)}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
              {!!interpretation?.houses?.find(
                (house: any) => house.house === 10
              )?.interpretation && (
                <Text style={styles.angleDescription} numberOfLines={3}>
                  {
                    interpretation.houses.find(
                      (house: any) => house.house === 10
                    )?.interpretation
                  }
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.angleItem}
              activeOpacity={0.85}
              onPress={() => openAngleDetails('descendant')}
            >
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>DSC</Text>
                <Text style={styles.angleLabel}>
                  {t('natalChart.angles.descendant')}
                </Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[7]?.sign || 'N/A'}{' '}
                {houses?.[7]?.cusp ? formatDegree(houses[7].cusp) : ''}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
              {!!interpretation?.houses?.find((house: any) => house.house === 7)
                ?.interpretation && (
                <Text style={styles.angleDescription} numberOfLines={3}>
                  {
                    interpretation.houses.find(
                      (house: any) => house.house === 7
                    )?.interpretation
                  }
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.angleItem}
              activeOpacity={0.85}
              onPress={() => openAngleDetails('ic')}
            >
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>IC</Text>
                <Text style={styles.angleLabel}>
                  {t('natalChart.angles.ic')}
                </Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[4]?.sign || 'N/A'}{' '}
                {houses?.[4]?.cusp ? formatDegree(houses[4].cusp) : ''}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
              {!!interpretation?.houses?.find((house: any) => house.house === 4)
                ?.interpretation && (
                <Text style={styles.angleDescription} numberOfLines={3}>
                  {
                    interpretation.houses.find(
                      (house: any) => house.house === 4
                    )?.interpretation
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    );
  };

  // Планеты
  const renderPlanets = () => {
    if (!planets) return null;

    return (
      <View style={styles.content}>
        {Object.entries(planets).map(([key, planet]) => {
          if (!planet) return null;

          const name = t(`common.planets.${key}`);
          const symbol = PLANET_SYMBOLS[key] || '●';
          const house = getHouseForLongitude(
            planet.longitude || 0,
            houses || {}
          );
          const planetInterpretation = interpretation?.planets?.find(
            (p: any) => p.planet === name
          );

          return (
            <BlurView key={key} intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={planetInterpretation ? 0.86 : 1}
                disabled={!planetInterpretation}
                style={styles.cardInner}
                onPress={() =>
                  planetInterpretation &&
                  openSummaryModal({
                    title: `${symbol} ${name}`,
                    subtitle: `${getZodiacLabel(planet.sign || 'N/A')} ${formatDegree(planet.degree)} · ${house}${t('natalChart.summary.houseShort', ' дом')}`,
                    summary: planetInterpretation.interpretation,
                  })
                }
              >
                <View style={styles.planetHeader}>
                  <View style={styles.planetTitleRow}>
                    <Text style={styles.planetSymbol}>{symbol}</Text>
                    <View>
                      <Text style={styles.planetName}>{name}</Text>
                      <Text style={styles.planetSign}>
                        {t('common.in')} {getZodiacLabel(planet.sign || 'N/A')}{' '}
                        {formatDegree(planet.degree)}
                      </Text>
                    </View>
                  </View>
                  {planet.retrograde && (
                    <View style={styles.retrogradeBadge}>
                      <Text style={styles.retrogradeBadgeText}>℞</Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.planetDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.planetDetails.longitude')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {(planet.longitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.planetDetails.latitude')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {(planet.latitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.planetDetails.speed')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {(planet.speed || 0).toFixed(4)}°/день
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.planetDetails.house')}
                    </Text>
                    <Text style={styles.detailValue}>{house}</Text>
                  </View>
                </View>

                {planetInterpretation ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText} numberOfLines={3}>
                        {planetInterpretation.interpretation}
                      </Text>
                    </View>
                    {renderSummaryOpenHint()}
                  </>
                ) : null}
              </TouchableOpacity>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Дома
  const renderHouses = () => {
    if (!houses) return null;

    const houseThemes: string[] = t('natalChart.houses.themes', {
      returnObjects: true,
    }) as string[];

    return (
      <View style={styles.content}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
          const house = houses[num];
          if (!house) return null;

          const planetsInHouse = planets
            ? Object.entries(planets).filter(
                ([, planet]) =>
                  planet &&
                  getHouseForLongitude(planet.longitude || 0, houses) === num
              )
            : [];
          const houseInterpretation = interpretation?.houses?.find(
            (h: any) => h.house === num
          );

          return (
            <BlurView key={num} intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={houseInterpretation ? 0.86 : 1}
                disabled={!houseInterpretation}
                style={styles.cardInner}
                onPress={() =>
                  houseInterpretation &&
                  openSummaryModal({
                    title: t('natalChart.houses.house', { num }),
                    subtitle: `${getZodiacLabel(house.sign || 'N/A')} ${house.cusp ? formatDegree(house.cusp % 30) : ''}`,
                    summary: houseInterpretation.interpretation,
                  })
                }
              >
                <View style={styles.houseHeader}>
                  <Text style={styles.houseNumber}>{num}</Text>
                  <View style={styles.houseInfo}>
                    <Text style={styles.houseName}>
                      {t('natalChart.houses.house', { num })}
                    </Text>
                    <Text style={styles.houseSign}>
                      {getZodiacLabel(house.sign || 'N/A')}{' '}
                      {house.cusp ? formatDegree(house.cusp % 30) : ''}
                    </Text>
                  </View>
                </View>

                <Text style={styles.houseTheme}>{houseThemes[num - 1]}</Text>

                {planetsInHouse.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.housePlanets}>
                      <Text style={styles.housePlanetsLabel}>
                        {t('natalChart.houses.planetsInHouse')}
                      </Text>
                      <View style={styles.planetChips}>
                        {planetsInHouse.map(([key, _planet]) => (
                          <View key={key} style={styles.planetChip}>
                            <Text style={styles.planetChipSymbol}>
                              {PLANET_SYMBOLS[key] || '●'}
                            </Text>
                            <Text style={styles.planetChipText}>
                              {t(`common.planets.${key}`)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {houseInterpretation ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText} numberOfLines={3}>
                        {houseInterpretation.interpretation}
                      </Text>
                    </View>
                    {renderSummaryOpenHint()}
                  </>
                ) : null}
              </TouchableOpacity>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Аспекты
  const renderAspects = () => {
    const locale = getChartLocale();
    const chartPayload = (chartData?.data || {}) as Record<string, any>;
    const rawAiAspectCandidates = [
      ...(Array.isArray(interpretation?.structuredAi?.aspects)
        ? interpretation.structuredAi.aspects
        : []),
      ...(Array.isArray(
        chartPayload?.aiInterpretations?.[locale]?.structured?.aspects
      )
        ? chartPayload.aiInterpretations[locale].structured.aspects
        : []),
      ...(Array.isArray(
        (chartData as any)?.aiInterpretations?.[locale]?.structured?.aspects
      )
        ? (chartData as any).aiInterpretations[locale].structured.aspects
        : []),
      ...(Array.isArray(interpretation?.aspects) ? interpretation.aspects : []),
    ];
    const aiAspectInterpretations = rawAiAspectCandidates.filter(
      (item: any) =>
        normalizeNarrativeValue(item?.interpretation) ||
        normalizeNarrativeValue(item?.significance)
    );
    const normalizeAspectToken = (value?: string) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9]+/giu, '');
    const planetAliasMap: Record<string, string[]> = {
      sun: ['sun', 'солнце', 'sol'],
      moon: ['moon', 'луна', 'luna'],
      mercury: ['mercury', 'меркурий', 'mercurio'],
      venus: ['venus', 'венера'],
      mars: ['mars', 'марс', 'marte'],
      jupiter: ['jupiter', 'юпитер', 'jupiter'],
      saturn: ['saturn', 'сатурн', 'saturno'],
      uranus: ['uranus', 'уран', 'urano'],
      neptune: ['neptune', 'нептун', 'neptuno'],
      pluto: ['pluto', 'плутон', 'pluton'],
      chiron: ['chiron', 'хирон', 'quiron'],
      lilith: ['lilith', 'лилит'],
      northNode: [
        'northnode',
        'north node',
        'северный узел',
        'nodo norte',
        'nn',
      ],
      southNode: ['southnode', 'south node', 'южный узел', 'nodo sur', 'sn'],
    };
    const aspectAliasMap: Record<string, string[]> = {
      conjunction: ['conjunction', 'conjunct', 'соединение', 'conjuncion'],
      opposition: ['opposition', 'opposed', 'оппозиция', 'oposicion'],
      trine: ['trine', 'трин', 'trigono'],
      square: ['square', 'квадрат', 'cuadratura'],
      sextile: ['sextile', 'секстиль', 'sextil'],
      'semi-sextile': ['semisextile', 'semi sextile', 'полусекстиль'],
      'semi-square': ['semisquare', 'semi square', 'полуквадрат'],
      sesquiquadrate: ['sesquiquadrate', 'полутораквадрат'],
      quincunx: ['quincunx', 'квинконс', 'quincuncio'],
      quintile: ['quintile', 'квинтиль'],
      biquintile: ['biquintile', 'биквинтиль'],
    };
    const getPlanetTokens = (planetKey: string) =>
      [
        normalizeAspectToken(planetKey),
        normalizeAspectToken(t(`common.planets.${planetKey}`)),
        ...(planetAliasMap[planetKey] || []).map(normalizeAspectToken),
      ].filter(Boolean);
    const getAspectTokens = (aspectKey: string) =>
      [
        normalizeAspectToken(aspectKey),
        normalizeAspectToken(t(`common.aspects.${aspectKey}`)),
        ...(aspectAliasMap[aspectKey] || []).map(normalizeAspectToken),
      ].filter(Boolean);
    const hasTokenMatch = (value: unknown, tokens: string[]) => {
      const normalized = normalizeAspectToken(String(value || ''));
      return Boolean(
        normalized &&
          tokens.some(
            (token) => normalized === token || normalized.includes(token)
          )
      );
    };
    const findAspectInterpretation = (aspect: AspectData) => {
      const planetATokens = getPlanetTokens(aspect.planetA);
      const planetBTokens = getPlanetTokens(aspect.planetB);
      const aspectTokens = getAspectTokens(aspect.aspect);

      return aiAspectInterpretations.find((item: any) => {
        const combined = [
          item?.planetA,
          item?.planetB,
          item?.aspect,
          item?.title,
          item?.name,
        ]
          .filter(Boolean)
          .join(' ');
        const directOrder =
          (hasTokenMatch(item?.planetA, planetATokens) &&
            hasTokenMatch(item?.planetB, planetBTokens)) ||
          (hasTokenMatch(combined, planetATokens) &&
            hasTokenMatch(combined, planetBTokens));
        const reverseOrder =
          hasTokenMatch(item?.planetA, planetBTokens) &&
          hasTokenMatch(item?.planetB, planetATokens);

        return (
          (directOrder || reverseOrder) &&
          (hasTokenMatch(item?.aspect, aspectTokens) ||
            hasTokenMatch(combined, aspectTokens))
        );
      });
    };
    const matchedAspects = (aspects || []).filter((aspect) =>
      findAspectInterpretation(aspect)
    );
    const visibleAspects = aiAspectInterpretations.length
      ? matchedAspects
      : aspects || [];
    const statsAspects = aspects || [];

    if (!statsAspects.length) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>
                {t('natalChart.aspectsStats.noAspects')}
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    // Группируем аспекты по типу
    const groupedAspects: Record<string, AspectData[]> = {};
    statsAspects.forEach((aspect) => {
      if (!groupedAspects[aspect.aspect]) {
        groupedAspects[aspect.aspect] = [];
      }
      groupedAspects[aspect.aspect].push(aspect);
    });

    return (
      <View style={styles.content}>
        {/* Статистика аспектов */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>
              {t('natalChart.aspectsStats.title')}
            </Text>
            <View style={styles.aspectStats}>
              {Object.entries(groupedAspects).map(([type, list]) => (
                <View key={type} style={styles.aspectStatItem}>
                  <Text
                    style={[
                      styles.aspectStatSymbol,
                      { color: ASPECT_COLORS[type] || '#8B5CF6' },
                    ]}
                  >
                    {ASPECT_SYMBOLS[type] || '●'}
                  </Text>
                  <Text style={styles.aspectStatLabel}>
                    {t(`common.aspects.${type}`)}
                  </Text>
                  <Text style={styles.aspectStatValue}>{list.length}</Text>
                </View>
              ))}
            </View>
          </View>
        </BlurView>

        {aiAspectInterpretations.length > 0 && !visibleAspects.length && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.tabs.aspects')}
                </Text>
              </View>
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {t(
                  'natalChart.aspectsStats.noAiDescriptions',
                  'AI-описания аспектов пока не сопоставились с расчетной картой. Обновите натальную карту после регенерации AI-разбора.'
                )}
              </Text>
            </View>
          </BlurView>
        )}

        {/* Список аспектов */}
        {visibleAspects.map((aspect, idx) => {
          if (!aspect) return null;

          const planetA = t(`common.planets.${aspect.planetA}`);
          const planetB = t(`common.planets.${aspect.planetB}`);
          const aspectName = t(`common.aspects.${aspect.aspect}`);
          const symbolA = PLANET_SYMBOLS[aspect.planetA] || '●';
          const symbolB = PLANET_SYMBOLS[aspect.planetB] || '●';
          const aspectSymbol = ASPECT_SYMBOLS[aspect.aspect] || '●';
          const color = ASPECT_COLORS[aspect.aspect] || '#8B5CF6';
          const aspectInterpretation = findAspectInterpretation(aspect);

          return (
            <BlurView key={idx} intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={aspectInterpretation ? 0.86 : 1}
                disabled={!aspectInterpretation}
                style={styles.cardInner}
                onPress={() =>
                  aspectInterpretation &&
                  openSummaryModal({
                    title: `${planetA} · ${aspectName} · ${planetB}`,
                    subtitle: `${t('natalChart.aspectDetails.orb')}: ${Math.abs(aspect.orb || 0).toFixed(2)}°`,
                    summary: aspectInterpretation.interpretation,
                    lines: [aspectInterpretation.significance].filter(Boolean),
                  })
                }
              >
                <View style={styles.aspectHeader}>
                  <View style={styles.aspectPlanets}>
                    <Text style={styles.aspectPlanetSymbol}>{symbolA}</Text>
                    <Text style={styles.aspectPlanetName}>{planetA}</Text>
                  </View>

                  <View
                    style={[
                      styles.aspectSymbolContainer,
                      { borderColor: color },
                    ]}
                  >
                    <Text style={[styles.aspectSymbolLarge, { color }]}>
                      {aspectSymbol}
                    </Text>
                  </View>

                  <View style={styles.aspectPlanets}>
                    <Text style={styles.aspectPlanetSymbol}>{symbolB}</Text>
                    <Text style={styles.aspectPlanetName}>{planetB}</Text>
                  </View>
                </View>

                <Text style={[styles.aspectName, { color }]}>{aspectName}</Text>

                <View style={styles.divider} />

                <View style={styles.aspectDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.aspectDetails.angle')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {(aspect.angle || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.aspectDetails.orb')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {Math.abs(aspect.orb || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('natalChart.aspectDetails.type')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {aspect.applying
                        ? t('natalChart.aspectDetails.applying')
                        : t('natalChart.aspectDetails.separating')}
                    </Text>
                  </View>
                </View>

                {aspectInterpretation ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText} numberOfLines={3}>
                        {aspectInterpretation.interpretation}
                      </Text>
                    </View>
                    {renderSummaryOpenHint()}
                  </>
                ) : null}
              </TouchableOpacity>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Резюме личности
  const renderSummary = () => {
    const summary = interpretation?.summary;

    logger.info('Interpretation данные', {
      hasInterpretation: !!interpretation,
      hasSummary: !!summary,
      interpretationKeys: interpretation ? Object.keys(interpretation) : [],
      summaryKeys: summary ? Object.keys(summary) : [],
    });

    if (!interpretation) {
      return (
        <View style={styles.content}>
          {renderPremiumNarrativeCard()}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#FF6B35"
                />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.interpretationUnavailable')}
                </Text>
              </View>
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {t('natalChart.summary.interpretationNotLoaded')}
                {'\n\n'}
                {t('natalChart.summary.tryRefresh')}
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    if (!summary) {
      return (
        <View style={styles.content}>
          {renderPremiumNarrativeCard()}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.summaryInProgress')}
                </Text>
              </View>
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {t('natalChart.summary.summaryNotFormed')}
                {'\n\n'}
                {t('natalChart.summary.dataAvailableInOtherTabs')}
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {renderPremiumNarrativeCard()}
        {renderArchetypeCard()}

        {summary.chartRuler && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.chartRuler', 'Управитель карты'),
                  subtitle: `${summary.chartRuler.ruler} · ${getZodiacLabel(summary.chartRuler.sign)} · ${summary.chartRuler.house}${t('natalChart.summary.houseShort', ' дом')}`,
                  summary: summary.chartRuler.interpretation,
                  lines: summary.keyHouseRulers?.length
                    ? summary.keyHouseRulers
                        .filter((item: any) => item.house === 1)
                        .map((item: any) => item.interpretation)
                    : [],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="navigate-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.chartRuler', 'Управитель карты')}
                </Text>
              </View>
              <Text style={styles.summaryText}>
                {summary.chartRuler.ruler}
                {' · '}
                {getZodiacLabel(summary.chartRuler.sign)}
                {' · '}
                {summary.chartRuler.house}
                {t('natalChart.summary.houseShort', ' дом')}
              </Text>
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {summary.chartRuler.interpretation}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.sect && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.sect', 'Секта карты'),
                  subtitle:
                    summary.sect.type === 'day'
                      ? t('natalChart.summary.dayChart', 'Дневная карта')
                      : t('natalChart.summary.nightChart', 'Ночная карта'),
                  summary: summary.sect.interpretation,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="sunny-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.sect', 'Секта карты')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.sect.interpretation}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.lunarNodes && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.lunarNodes', 'Лунные узлы'),
                  subtitle: [
                    summary.lunarNodes.northNode
                      ? `NN · ${getZodiacLabel(summary.lunarNodes.northNode.sign)} · ${summary.lunarNodes.northNode.house}${t('natalChart.summary.houseShort', ' дом')}`
                      : '',
                    summary.lunarNodes.southNode
                      ? `SN · ${getZodiacLabel(summary.lunarNodes.southNode.sign)} · ${summary.lunarNodes.southNode.house}${t('natalChart.summary.houseShort', ' дом')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('  •  '),
                  summary: summary.lunarNodes.axisInterpretation,
                  lines: [
                    summary.lunarNodes.northNode?.interpretation || '',
                    summary.lunarNodes.southNode?.interpretation || '',
                  ],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="git-network-outline"
                  size={24}
                  color="#FF6B6B"
                />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.lunarNodes', 'Лунные узлы')}
                </Text>
              </View>
              {!!summary.lunarNodes.northNode?.interpretation && (
                <Text style={styles.summaryText} numberOfLines={3}>
                  {summary.lunarNodes.northNode.interpretation}
                </Text>
              )}
              {!!summary.lunarNodes.southNode?.interpretation && (
                <Text style={styles.summarySubtext} numberOfLines={2}>
                  {summary.lunarNodes.southNode.interpretation}
                </Text>
              )}
              <Text style={styles.summarySubtext} numberOfLines={2}>
                {summary.lunarNodes.axisInterpretation}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.dispositors && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t(
                    'natalChart.summary.dispositors',
                    'Диспозиторный центр'
                  ),
                  subtitle: summary.dispositors.finalDispositor
                    ? `${summary.dispositors.finalDispositor.planet} · ${getZodiacLabel(summary.dispositors.finalDispositor.sign)} · ${summary.dispositors.finalDispositor.house}${t('natalChart.summary.houseShort', ' дом')}`
                    : summary.dispositors.dominantDispositor
                      ? `${summary.dispositors.dominantDispositor.planet} · ${getZodiacLabel(summary.dispositors.dominantDispositor.sign)} · ${summary.dispositors.dominantDispositor.house}${t('natalChart.summary.houseShort', ' дом')}`
                      : '',
                  summary:
                    summary.dispositors.finalDispositor?.interpretation ||
                    summary.dispositors.dominantDispositor?.interpretation ||
                    summary.dispositors.chainSummary,
                  lines: [
                    summary.dispositors.chainSummary,
                    ...(summary.dispositors.mutualReceptions || []).map(
                      (item: any) => item.interpretation
                    ),
                  ],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="radio-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.dispositors', 'Диспозиторный центр')}
                </Text>
              </View>
              {!!summary.dispositors.finalDispositor && (
                <Text style={styles.summaryText}>
                  {summary.dispositors.finalDispositor.planet}
                  {' · '}
                  {getZodiacLabel(summary.dispositors.finalDispositor.sign)}
                  {' · '}
                  {summary.dispositors.finalDispositor.house}
                  {t('natalChart.summary.houseShort', ' дом')}
                </Text>
              )}
              {!!summary.dispositors.finalDispositor?.interpretation && (
                <Text style={styles.summarySubtext} numberOfLines={3}>
                  {summary.dispositors.finalDispositor.interpretation}
                </Text>
              )}
              {!!summary.dispositors.dominantDispositor &&
                !summary.dispositors.finalDispositor && (
                  <Text style={styles.summaryText}>
                    {summary.dispositors.dominantDispositor.planet}
                    {' · '}
                    {getZodiacLabel(
                      summary.dispositors.dominantDispositor.sign
                    )}
                    {' · '}
                    {summary.dispositors.dominantDispositor.house}
                    {t('natalChart.summary.houseShort', ' дом')}
                  </Text>
                )}
              {!!summary.dispositors.dominantDispositor &&
                !summary.dispositors.finalDispositor?.interpretation && (
                  <Text style={styles.summarySubtext} numberOfLines={3}>
                    {summary.dispositors.dominantDispositor.interpretation}
                  </Text>
                )}
              <Text style={styles.summarySubtext} numberOfLines={2}>
                {summary.dispositors.chainSummary}
              </Text>
              {!!summary.dispositors.mutualReceptions?.length &&
                renderPreviewList(
                  summary.dispositors.mutualReceptions.map(
                    (item: any) => item.interpretation
                  ),
                  styles.recommendationBullet,
                  1
                )}
              {!summary.dispositors.mutualReceptions?.length &&
                renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.keyHouseRulers && summary.keyHouseRulers.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t(
                    'natalChart.summary.keyHouseRulers',
                    'Управители ключевых домов'
                  ),
                  summary: t(
                    'natalChart.summary.keyHouseRulersHint',
                    'Это показывает, через какие реальные сферы жизни раскрываются главные оси карты.'
                  ),
                  lines: summary.keyHouseRulers.map(
                    (item: any) => item.interpretation
                  ),
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="git-branch-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t(
                    'natalChart.summary.keyHouseRulers',
                    'Управители ключевых домов'
                  )}
                </Text>
              </View>
              {renderPreviewList(
                summary.keyHouseRulers.map((item: any) => item.interpretation),
                styles.recommendationBullet
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.strongestAspects && summary.strongestAspects.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t(
                    'natalChart.summary.strongestAspects',
                    'Сильнейшие аспекты'
                  ),
                  summary: t(
                    'natalChart.summary.strongestAspectsHint',
                    'Это самые влиятельные связи карты, которые сильнее всего окрашивают характер и сценарии.'
                  ),
                  lines: summary.strongestAspects.map(
                    (item: any) => `${item.title}. ${item.interpretation}`
                  ),
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="git-network-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.summaryTitle}>
                  {t(
                    'natalChart.summary.strongestAspects',
                    'Сильнейшие аспекты'
                  )}
                </Text>
              </View>
              {renderPreviewList(
                summary.strongestAspects.map(
                  (item: any) => `${item.title}. ${item.interpretation}`
                ),
                styles.talentBullet
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Жизненная цель */}
        {summary.lifePurpose && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.lifePurpose'),
                  summary: summary.lifePurpose,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="compass-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.lifePurpose')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.lifePurpose}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Личностные качества */}
        {summary.personalityTraits && summary.personalityTraits.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.personalityTraits'),
                  lines: summary.personalityTraits,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="person-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.personalityTraits')}
                </Text>
              </View>
              {renderPreviewList(
                summary.personalityTraits,
                styles.traitBullet,
                3
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Таланты */}
        {summary.talents && summary.talents.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.talents'),
                  lines: summary.talents,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.talents')}
                </Text>
              </View>
              {renderPreviewList(summary.talents, styles.talentBullet, 3)}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Жизненные темы */}
        {summary.lifeThemes && summary.lifeThemes.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.lifeThemes'),
                  lines: summary.lifeThemes,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="book-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.lifeThemes')}
                </Text>
              </View>
              {renderPreviewList(summary.lifeThemes, styles.traitBullet, 3)}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Кармические уроки */}
        {summary.karmaLessons && summary.karmaLessons.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.karmaLessons'),
                  lines: summary.karmaLessons,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="school-outline" size={24} color="#FF6B35" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.karmaLessons')}
                </Text>
              </View>
              {renderPreviewList(
                summary.karmaLessons,
                styles.karmaLessonBullet,
                3
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.uniqueFeatures && summary.uniqueFeatures.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t(
                    'natalChart.summary.uniqueFeatures',
                    'Что выделяет эту карту'
                  ),
                  summary: t(
                    'natalChart.summary.uniqueFeaturesHint',
                    'Ниже собраны самые характерные астрологические особенности именно этой карты.'
                  ),
                  lines: summary.uniqueFeatures,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="aperture-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>
                  {t(
                    'natalChart.summary.uniqueFeatures',
                    'Что выделяет эту карту'
                  )}
                </Text>
              </View>
              {renderPreviewList(
                summary.uniqueFeatures,
                styles.talentBullet,
                3
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Отношения */}
        {summary.relationships && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.relationships'),
                  summary: summary.relationships,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.relationships')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.relationships}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Карьера */}
        {summary.careerPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.careerPath'),
                  summary: summary.careerPath,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="briefcase-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.careerPath')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.careerPath}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Духовный путь */}
        {summary.spiritualPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.spiritualPath'),
                  summary: summary.spiritualPath,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="flame-outline" size={24} color="#9B59B6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.spiritualPath')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.spiritualPath}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Здоровье */}
        {summary.healthFocus && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.healthFocus'),
                  summary: summary.healthFocus,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="fitness-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.healthFocus')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.healthFocus}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Финансы */}
        {summary.financialApproach && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.financialApproach'),
                  summary: summary.financialApproach,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="cash-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.financialApproach')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={3}>
                {summary.financialApproach}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Рекомендации */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.recommendations'),
                  lines: summary.recommendations,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="bulb-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.recommendations')}
                </Text>
              </View>
              {renderPreviewList(
                summary.recommendations,
                styles.recommendationBullet,
                3
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Доминирующие элементы */}
        {summary.dominantElements && summary.dominantElements.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.dominantElements'),
                  summary: t(
                    'natalChart.summary.dominantElementsHint',
                    'Эти элементы показывают, какая энергия проявляется в карте естественнее и чаще.'
                  ),
                  lines: summary.dominantElements,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="water-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.dominantElements')}
                </Text>
              </View>
              <View style={styles.chipContainer}>
                {summary.dominantElements.map(
                  (element: string, idx: number) => (
                    <View key={idx} style={styles.elementChip}>
                      <Text style={styles.elementChipText}>{element}</Text>
                    </View>
                  )
                )}
              </View>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Доминирующие качества */}
        {summary.dominantQualities && summary.dominantQualities.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.summary.dominantQualities'),
                  summary: t(
                    'natalChart.summary.dominantQualitiesHint',
                    'Эти качества показывают, как карта запускает, удерживает и меняет процессы.'
                  ),
                  lines: summary.dominantQualities,
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="settings-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.dominantQualities')}
                </Text>
              </View>
              <View style={styles.chipContainer}>
                {summary.dominantQualities.map(
                  (quality: string, idx: number) => (
                    <View key={idx} style={styles.elementChip}>
                      <Text style={styles.elementChipText}>{quality}</Text>
                    </View>
                  )
                )}
              </View>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {renderSummaryListCard({
          title: t(
            'natalChart.summary.retrogradePlanets',
            'Ретроградные планеты'
          ),
          icon: 'refresh-outline',
          color: '#FF6B35',
          items: summary.retrogradePlanets,
          bulletStyle: styles.karmaLessonBullet,
        })}

        {renderSummaryListCard({
          title: t('natalChart.summary.stellium', 'Стеллиум'),
          icon: 'ellipse-outline',
          color: '#FFD700',
          items: summary.stellium,
          bulletStyle: styles.talentBullet,
        })}

        {renderSummaryListCard({
          title: t('natalChart.summary.chartPatterns', 'Фигуры карты'),
          icon: 'shapes-outline',
          color: '#8B5CF6',
          items: summary.chartPatterns,
          bulletStyle: styles.traitBullet,
        })}

        {renderSummaryListCard({
          title: t(
            'natalChart.summary.dignityHighlights',
            'Достоинства планет'
          ),
          icon: 'ribbon-outline',
          color: '#4ECDC4',
          items: summary.dignityHighlights,
          bulletStyle: styles.talentBullet,
        })}

        {renderSummaryListCard({
          title: t(
            'natalChart.summary.retrogradeList',
            'Ретроградные планеты: кратко'
          ),
          icon: 'list-outline',
          color: '#FF6B35',
          items: summary.retrogradeList,
          bulletStyle: styles.recommendationBullet,
        })}

        {renderSummaryListCard({
          title: t('natalChart.summary.houseAccents', 'Дома-акценты'),
          icon: 'home-outline',
          color: '#8B5CF6',
          items: summary.houseAccents,
          bulletStyle: styles.traitBullet,
        })}

        {renderSummaryListCard({
          title: t('natalChart.summary.emptyHouses', 'Пустые дома'),
          icon: 'scan-outline',
          color: '#D8B4FE',
          items: summary.emptyHouses,
          bulletStyle: styles.recommendationBullet,
        })}

        {renderSummaryListCard({
          title: t(
            'natalChart.summary.retrogradeHouses',
            'Дома с ретроградными планетами'
          ),
          icon: 'return-down-back-outline',
          color: '#FF6B35',
          items: summary.retrogradeHouses,
          bulletStyle: styles.karmaLessonBullet,
        })}

        {renderSummaryListCard({
          title: t(
            'natalChart.summary.topAspectsDetailed',
            'Топ сильных аспектов'
          ),
          icon: 'git-network-outline',
          color: '#8B5CF6',
          items: summary.topAspectsDetailed,
          bulletStyle: styles.talentBullet,
        })}
      </View>
    );
  };

  return (
    <TabScreenLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
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
        {/* Заголовок */}
        <BlurView intensity={20} tint="dark" style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Ionicons name="planet" size={60} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>{t('natalChart.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('natalChart.subtitle')}</Text>
        </BlurView>

        {/* Вкладки */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.id ? '#8B5CF6' : '#B0B0B0'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Контент вкладки */}
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'planets' && renderPlanets()}
        {activeTab === 'houses' && renderHouses()}
        {activeTab === 'aspects' && renderAspects()}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={angleModalVisible}
        onRequestClose={closeAngleModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeAngleModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{angleModalTitle}</Text>
                {!!angleModalSubtitle && (
                  <Text style={styles.modalSubtitle}>{angleModalSubtitle}</Text>
                )}
              </View>
              <Pressable onPress={closeAngleModal}>
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {angleModalLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.modalLoadingText}>
                    {t('natalChart.angleModal.loading')}
                  </Text>
                </View>
              ) : (
                <>
                  {!!angleModalSummary && (
                    <View style={styles.modalSummary}>
                      <Text style={styles.modalSummaryText}>
                        {angleModalSummary}
                      </Text>
                    </View>
                  )}
                  {angleModalLines.map((line, idx) => (
                    <Text key={`${line}-${idx}`} style={styles.modalText}>
                      {line}
                    </Text>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={summaryModalVisible}
        onRequestClose={closeSummaryModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeSummaryModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{summaryModalTitle}</Text>
                {!!summaryModalSubtitle && (
                  <Text style={styles.modalSubtitle}>
                    {summaryModalSubtitle}
                  </Text>
                )}
              </View>
              <Pressable onPress={closeSummaryModal}>
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {summaryModalVariant === 'lesson' ? (
                renderLessonModalContent()
              ) : (
                <>
                  {!!summaryModalSummary && (
                    <View style={styles.modalSummary}>
                      <Text style={styles.modalSummaryText}>
                        {summaryModalSummary}
                      </Text>
                    </View>
                  )}
                  {summaryModalLines.map((line, idx) => (
                    <Text key={`${line}-${idx}`} style={styles.modalText}>
                      {line}
                    </Text>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Заголовок
  header: {
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    zIndex: 10,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Вкладки
  tabsContainer: {
    marginBottom: 20,
  },
  tabsContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Контент
  content: {
    paddingHorizontal: 8,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardInner: {
    padding: 16,
  },
  premiumNarrativeTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumNarrativeBorder: {
    borderRadius: 12,
    borderWidth: 1,
  },
  premiumNarrativeContent: {
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 10, 10, 0.35)',
  },
  premiumNarrativeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumNarrativeGradient: {
    borderRadius: 12,
    padding: 14,
  },
  premiumNarrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumNarrativeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumNarrativeHeaderText: {
    flex: 1,
  },
  premiumNarrativeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1C5FF',
  },
  premiumNarrativeTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  premiumNarrativeLessonTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  premiumNarrativeLessonText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  premiumNarrativeFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumNarrativeCta: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1C5FF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cardTitleInline: {
    flex: 1,
    marginBottom: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  // Большая тройка
  bigThreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bigThreeDescriptions: {
    gap: 12,
  },
  bigThreeItem: {
    alignItems: 'center',
  },
  bigThreeSymbol: {
    fontSize: 40,
    color: '#8B5CF6',
    marginBottom: 8,
  },
  bigThreeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  bigThreeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bigThreeDegree: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bigThreeDescriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bigThreeDescriptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bigThreeDescriptionMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.58)',
    marginBottom: 8,
  },
  bigThreeDescriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.88)',
  },

  // Статистика
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemFull: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statValueLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Углы карты
  angleItem: {
    marginVertical: 8,
  },
  angleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  angleSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
    marginRight: 12,
    width: 50,
  },
  angleLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  angleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 62,
  },
  angleHint: {
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 62,
    marginTop: 6,
  },
  angleDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.82)',
    marginLeft: 62,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 20, 0.78)',
  },
  modalContent: {
    maxHeight: '75%',
    borderRadius: 24,
    backgroundColor: 'rgba(19, 24, 44, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  modalClose: {
    fontSize: 30,
    lineHeight: 30,
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 18,
    paddingBottom: 24,
  },
  modalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  modalLoadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  modalSummary: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    padding: 14,
    marginBottom: 14,
  },
  modalSummaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  modalLessonSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 12,
  },
  modalLessonSectionFirst: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  modalLessonSectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalLessonParagraph: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 8,
  },

  // Планеты
  planetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planetSymbol: {
    fontSize: 32,
    color: '#8B5CF6',
    marginRight: 12,
  },
  planetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planetSign: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  retrogradeBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  retrogradeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  planetDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Дома
  houseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
    marginRight: 16,
    width: 50,
    textAlign: 'center',
  },
  houseInfo: {
    flex: 1,
  },
  houseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  houseSign: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  houseTheme: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  housePlanets: {
    marginTop: 8,
  },
  housePlanetsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  planetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  planetChipSymbol: {
    fontSize: 14,
    color: '#8B5CF6',
    marginRight: 6,
  },
  planetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Аспекты
  aspectStats: {
    gap: 12,
  },
  aspectStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aspectStatSymbol: {
    fontSize: 24,
    fontWeight: '700',
    width: 30,
    textAlign: 'center',
  },
  aspectStatLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  aspectStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  aspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aspectPlanets: {
    alignItems: 'center',
    flex: 1,
  },
  aspectPlanetSymbol: {
    fontSize: 28,
    color: '#8B5CF6',
    marginBottom: 4,
  },
  aspectPlanetName: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  aspectSymbolContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectSymbolLarge: {
    fontSize: 28,
    fontWeight: '700',
  },
  aspectName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  aspectDetails: {
    gap: 8,
  },

  // Интерпретация
  interpretationSection: {
    marginTop: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },

  // Разделитель
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },

  // Резюме
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  summarySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
    marginTop: 8,
  },
  summaryCardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(139, 92, 246, 0.95)',
  },
  summaryGuideChips: {
    marginTop: 14,
  },
  summaryGuideChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryGuideChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  traitsList: {
    gap: 8,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  traitBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginTop: 8,
    marginRight: 12,
  },
  talentBullet: {
    backgroundColor: '#FFD700',
  },
  karmaLessonBullet: {
    backgroundColor: '#FF6B35',
  },
  recommendationBullet: {
    backgroundColor: '#FFD700',
  },
  traitText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  elementChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  elementChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});

export default NatalChartScreen;
