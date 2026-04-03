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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { chartAPI } from '../services/api';
import type { ArchetypeResult } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import { logger } from '../services/logger';

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
  };
  interpretation?: any;
}

interface AngleData {
  sign: string;
  degree: number;
  longitude?: number;
}

type AngleKey = 'ascendant' | 'midheaven' | 'descendant' | 'ic';
type ElementKey = 'fire' | 'earth' | 'air' | 'water';
type QualityKey = 'cardinal' | 'fixed' | 'mutable';
type SummarySectionKey =
  | 'archetype'
  | 'chartRuler'
  | 'lunarNodes'
  | 'relationshipMechanics'
  | 'careerMechanics'
  | 'financeMechanics';
type SummaryDetailPayload = {
  title: string;
  subtitle?: string;
  summary?: string;
  lines?: string[];
};

const NARRATIVE_PREFERRED_KEYS = [
  'narrative',
  'interpretation',
  'synthesis',
  'summary',
  'overview',
  'general',
  'text',
  'content',
  'message',
] as const;

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

const ELEMENT_KEYS: ElementKey[] = ['fire', 'earth', 'air', 'water'];
const QUALITY_KEYS: QualityKey[] = ['cardinal', 'fixed', 'mutable'];
const SUMMARY_SECTION_SCROLL_OFFSET = 20;

const formatDegree = (deg?: number): string => {
  if (typeof deg !== 'number' || !isFinite(deg)) return "0°0'";
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${m}'`;
};

const stripCodeFences = (value: string): string =>
  value
    .trim()
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/```$/, '')
    .trim();

const normalizeNarrativeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    const cleaned = stripCodeFences(value);
    if (!cleaned) return '';

    const looksLikeStructured =
      (cleaned.startsWith('{') && cleaned.endsWith('}')) ||
      (cleaned.startsWith('[') && cleaned.endsWith(']'));

    if (looksLikeStructured) {
      try {
        return normalizeNarrativeValue(JSON.parse(cleaned));
      } catch {
        return cleaned;
      }
    }

    return cleaned;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeNarrativeValue(item))
      .filter(Boolean)
      .join('\n\n');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    for (const key of NARRATIVE_PREFERRED_KEYS) {
      const candidate = normalizeNarrativeValue(record[key]);
      if (candidate) return candidate;
    }

    return Object.values(record)
      .map((item) => normalizeNarrativeValue(item))
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const pickFirstRecord = (
  ...values: unknown[]
): Record<string, unknown> | null =>
  values.find((value): value is Record<string, unknown> => isRecord(value)) ||
  null;

const normalizeChartPayload = (rawValue: unknown): ChartData | null => {
  const root = pickFirstRecord(rawValue);
  if (!root) return null;

  const nestedData = pickFirstRecord(
    root.data,
    root.data && isRecord(root.data) ? root.data.data : null,
    root.data &&
      isRecord(root.data) &&
      root.data.data &&
      isRecord(root.data.data)
      ? root.data.data.data
      : null
  );

  const payload = pickFirstRecord(
    nestedData,
    root,
    root.data,
    root.data && isRecord(root.data) ? root.data.data : null
  );

  if (!payload) {
    return null;
  }

  const interpretation =
    payload.interpretation ??
    (nestedData?.interpretation as unknown) ??
    (root.interpretation as unknown) ??
    null;

  return {
    data: {
      planets: isRecord(payload.planets)
        ? (payload.planets as Record<string, PlanetData>)
        : {},
      houses: isRecord(payload.houses)
        ? (payload.houses as Record<number, HouseData>)
        : {},
      aspects: Array.isArray(payload.aspects)
        ? (payload.aspects as AspectData[])
        : [],
      ascendant: isRecord(payload.ascendant)
        ? (payload.ascendant as { sign: string; degree: number })
        : undefined,
      midheaven: isRecord(payload.midheaven)
        ? (payload.midheaven as { sign: string; degree: number })
        : undefined,
      interpretation,
    },
    interpretation,
  };
};

const toArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const normalizeTextList = (value: unknown): string[] =>
  toArray<unknown>(value)
    .map((item) => normalizeNarrativeValue(item))
    .filter((item): item is string => Boolean(item));

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
  const scrollViewRef = useRef<ScrollView | null>(null);
  const summaryContentOffsetRef = useRef(0);
  const summarySectionOffsetsRef = useRef<
    Partial<Record<SummarySectionKey, number>>
  >({});
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [archetype, setArchetype] = useState<ArchetypeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'planets' | 'houses' | 'aspects' | 'summary'
  >('overview');
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

  const getChartLocale = useCallback((): 'ru' | 'en' | 'es' => {
    const rawLocale = String(i18n.language || 'en').toLowerCase();
    if (rawLocale === 'en' || rawLocale.startsWith('en-')) return 'en';
    if (rawLocale === 'es' || rawLocale.startsWith('es-')) return 'es';
    return 'ru';
  }, [i18n.language]);

  const getElementInfo = useCallback(
    (key: ElementKey) => ({
      label: t(`common.elements.${key}`),
      overview: t(`natalChart.summary.elementDetails.${key}.overview`),
      strength: t(`natalChart.summary.elementDetails.${key}.strength`),
      watchOut: t(`natalChart.summary.elementDetails.${key}.watchOut`),
    }),
    [t]
  );

  const getQualityInfo = useCallback(
    (key: QualityKey) => ({
      label: t(`natalChart.modalities.${key}`),
      overview: t(`natalChart.summary.qualityDetails.${key}.overview`),
      strength: t(`natalChart.summary.qualityDetails.${key}.strength`),
      watchOut: t(`natalChart.summary.qualityDetails.${key}.watchOut`),
    }),
    [t]
  );

  const resolveElementKey = useCallback(
    (value?: string | null): ElementKey | null => {
      const normalized = String(value || '')
        .trim()
        .toLowerCase();
      if (!normalized) return null;

      for (const key of ELEMENT_KEYS) {
        const localized = t(`common.elements.${key}`).toLowerCase();
        if (
          normalized === key ||
          normalized === localized ||
          normalized.includes(localized)
        ) {
          return key;
        }
      }

      return null;
    },
    [t]
  );

  const resolveQualityKey = useCallback(
    (value?: string | null): QualityKey | null => {
      const normalized = String(value || '')
        .trim()
        .toLowerCase();
      if (!normalized) return null;

      for (const key of QUALITY_KEYS) {
        const localized = t(`natalChart.modalities.${key}`).toLowerCase();
        if (
          normalized === key ||
          normalized === localized ||
          normalized.includes(localized)
        ) {
          return key;
        }
      }

      return null;
    },
    [t]
  );

  const buildElementDetailLines = useCallback(
    (items: string[]): string[] => {
      const detailed = items
        .map((item) => resolveElementKey(item))
        .filter((item): item is ElementKey => Boolean(item))
        .flatMap((item) => {
          const info = getElementInfo(item);
          return [
            `${info.label}: ${info.overview}`,
            `• ${info.strength}`,
            `• ${info.watchOut}`,
          ];
        });

      return detailed.length ? detailed : items;
    },
    [getElementInfo, resolveElementKey]
  );

  const buildQualityDetailLines = useCallback(
    (items: string[]): string[] => {
      const detailed = items
        .map((item) => resolveQualityKey(item))
        .filter((item): item is QualityKey => Boolean(item))
        .flatMap((item) => {
          const info = getQualityInfo(item);
          return [
            `${info.label}: ${info.overview}`,
            `• ${info.strength}`,
            `• ${info.watchOut}`,
          ];
        });

      return detailed.length ? detailed : items;
    },
    [getQualityInfo, resolveQualityKey]
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

      const data = normalizeChartPayload(chartResult.value);

      if (!data?.data) {
        throw new Error('Invalid natal chart payload');
      }

      // Подробное логирование для отладки структуры
      logger.info('Полная структура данных', {
        level1Keys: Object.keys(data),
        level2Keys: data?.data ? Object.keys(data.data) : [],
        hasPlanetsInL2: !!data?.data?.planets,
      });
      setChartData(data);
      hasLoadedOnceRef.current = true;

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
    }
  }, [getChartLocale, t]);

  useEffect(() => {
    void loadChartData();
  }, [loadChartData]);

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
      if (!hasLoadedOnceRef.current) return undefined;
      void loadChartData();
      return undefined;
    }, [loadChartData])
  );

  if (loading) {
    return (
      <TabScreenLayout>
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </TabScreenLayout>
    );
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
    id: 'overview' | 'planets' | 'houses' | 'aspects' | 'summary';
    label: string;
    icon:
      | 'star-outline'
      | 'planet-outline'
      | 'home-outline'
      | 'git-network-outline'
      | 'document-text-outline';
  }> = [
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
    {
      id: 'summary',
      label: t('natalChart.tabs.summary'),
      icon: 'document-text-outline',
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
          toArray<any>(interpretation?.houses).find(
            (house: any) => house.house === 10
          )?.interpretation || '',
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
          toArray<any>(interpretation?.houses).find(
            (house: any) => house.house === 7
          )?.interpretation || '',
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
          toArray<any>(interpretation?.houses).find(
            (house: any) => house.house === 4
          )?.interpretation || '',
        request: {
          type: 'house' as const,
          houseNum: 4,
          sign: houses?.[4]?.sign || 'Aries',
          locale,
        },
      },
    }[angle];

    setAngleModalTitle(`${config.symbol} · ${config.title}`);
    setAngleModalSubtitle(`${config.sign} ${formatDegree(config.degree)}`);
    setAngleModalSummary(normalizeNarrativeValue(config.summary));
    setAngleModalLines([]);
    setAngleModalVisible(true);
    setAngleModalLoading(true);

    try {
      const details = await chartAPI.getInterpretationDetails(config.request);
      setAngleModalLines(normalizeTextList(details?.lines));
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
  };

  const openSummaryModal = ({
    title,
    subtitle = '',
    summary = '',
    lines = [],
  }: SummaryDetailPayload) => {
    setSummaryModalTitle(title);
    setSummaryModalSubtitle(subtitle);
    setSummaryModalSummary(normalizeNarrativeValue(summary));
    setSummaryModalLines(
      lines
        .map((line) => normalizeNarrativeValue(line))
        .filter((line): line is string => Boolean(line))
    );
    setSummaryModalVisible(true);
  };

  const registerSummarySection = useCallback(
    (key: SummarySectionKey, localOffsetY: number) => {
      summarySectionOffsetsRef.current[key] = localOffsetY;
    },
    []
  );

  const scrollToSummarySection = useCallback((key: SummarySectionKey) => {
    const localOffsetY = summarySectionOffsetsRef.current[key];
    if (typeof localOffsetY !== 'number') return;

    const targetY = Math.max(
      0,
      summaryContentOffsetRef.current +
        localOffsetY -
        SUMMARY_SECTION_SCROLL_OFFSET
    );

    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

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
    items: unknown,
    bulletStyle?: StyleProp<ViewStyle>,
    previewCount: number = 2
  ) => {
    const normalizedItems = normalizeTextList(items);

    return (
      <View style={styles.traitsList}>
        {normalizedItems.slice(0, previewCount).map((item, idx) => (
          <View key={`${item}-${idx}`} style={styles.traitItem}>
            <View style={[styles.traitBullet, bulletStyle]} />
            <Text style={styles.traitText} numberOfLines={2}>
              {item}
            </Text>
          </View>
        ))}
        {renderSummaryOpenHint(
          normalizedItems.length > previewCount
            ? normalizedItems.length - previewCount
            : undefined
        )}
      </View>
    );
  };

  const splitNarrativeParagraphs = (text?: string): string[] =>
    normalizeNarrativeValue(text)
      .split(/\n{2,}|\r\n\r\n/)
      .map((part) => part.trim())
      .filter(Boolean);

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
          <Text style={styles.summarySubtext}>{archetype.subtitle}</Text>
          <Text style={styles.summarySubtext} numberOfLines={4}>
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

  // Основная информация
  const renderOverview = () => {
    const sunSign = planets?.sun?.sign || 'N/A';
    const moonSign = planets?.moon?.sign || 'N/A';
    const ascSign = resolvedAscendant.sign || 'N/A';
    const sunInterpretation = normalizeNarrativeValue(
      interpretation?.sunSign?.interpretation
    );
    const moonInterpretation = normalizeNarrativeValue(
      interpretation?.moonSign?.interpretation
    );
    const ascendantInterpretation = normalizeNarrativeValue(
      interpretation?.ascendant?.interpretation
    );
    const premiumNarrative = normalizeNarrativeValue(
      interpretation?.aiNarrative || interpretation?.premiumNarrative || ''
    );
    const premiumNarrativeParagraphs =
      splitNarrativeParagraphs(premiumNarrative);

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
    const dominantElementKey = dominantElement?.[0] as ElementKey | undefined;
    const dominantQualityKey = dominantQuality?.[0] as QualityKey | undefined;
    const dominantElementInfo = dominantElementKey
      ? getElementInfo(dominantElementKey)
      : null;
    const dominantQualityInfo = dominantQualityKey
      ? getQualityInfo(dominantQualityKey)
      : null;

    const retrogradeCount = planets
      ? Object.values(planets).filter((p) => p?.retrograde).length
      : 0;

    return (
      <View style={styles.content}>
        {/* Основная тройка */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>
              {t('natalChart.bigThree.title')}
            </Text>

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
              sunInterpretation ||
              moonInterpretation ||
              ascendantInterpretation
            ) && (
              <>
                <View style={styles.divider} />
                <View style={styles.bigThreeDescriptions}>
                  {!!sunInterpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `☉ ${t('natalChart.bigThree.sun')}`,
                          subtitle: `${sunSign} ${formatDegree(
                            planets?.sun?.degree || 0
                          )}`,
                          summary: sunInterpretation,
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
                        numberOfLines={4}
                      >
                        {sunInterpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}

                  {!!moonInterpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `☽ ${t('natalChart.bigThree.moon')}`,
                          subtitle: `${moonSign} ${formatDegree(
                            planets?.moon?.degree || 0
                          )}`,
                          summary: moonInterpretation,
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
                        numberOfLines={4}
                      >
                        {moonInterpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}

                  {!!ascendantInterpretation && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={styles.bigThreeDescriptionCard}
                      onPress={() =>
                        openSummaryModal({
                          title: `ASC ${t('natalChart.bigThree.ascendant')}`,
                          subtitle: `${ascSign} ${formatDegree(
                            resolvedAscendant.degree || 0
                          )}`,
                          summary: ascendantInterpretation,
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
                        numberOfLines={4}
                      >
                        {ascendantInterpretation}
                      </Text>
                      {renderSummaryOpenHint()}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </BlurView>

        {!!premiumNarrative && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.cardInner}
              onPress={() =>
                openSummaryModal({
                  title: t('natalChart.premiumNarrative.title', 'AI Premium'),
                  subtitle: t(
                    'natalChart.premiumNarrative.subtitle',
                    'Расширенный синтез карты'
                  ),
                  summary: premiumNarrativeParagraphs[0] || premiumNarrative,
                  lines:
                    premiumNarrativeParagraphs.length > 1
                      ? premiumNarrativeParagraphs.slice(1)
                      : [],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.premiumNarrative.title', 'AI Premium')}
                </Text>
              </View>
              <Text style={styles.summarySubtext}>
                {t(
                  'natalChart.premiumNarrative.subtitle',
                  'Расширенный синтез карты'
                )}
              </Text>
              <Text style={styles.interpretationText} numberOfLines={7}>
                {premiumNarrative}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Статистика карты */}
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
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.statItemFull}
                onPress={() => {
                  if (!dominantElementInfo) return;
                  openSummaryModal({
                    title: t('natalChart.statistics.dominantElement'),
                    subtitle: `${dominantElementInfo.label} · ${dominantElement?.[1] || 0}`,
                    summary: dominantElementInfo.overview,
                    lines: [
                      dominantElementInfo.strength,
                      dominantElementInfo.watchOut,
                    ],
                  });
                }}
              >
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.dominantElement')}
                </Text>
                <Text style={styles.statValueLarge}>
                  {dominantElementInfo?.label || 'N/A'} (
                  {dominantElement?.[1] || 0})
                </Text>
                {!!dominantElementInfo && (
                  <Text style={styles.statHint} numberOfLines={3}>
                    {dominantElementInfo.overview}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.statRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.statItemFull}
                onPress={() => {
                  if (!dominantQualityInfo) return;
                  openSummaryModal({
                    title: t('natalChart.statistics.dominantModality'),
                    subtitle: `${dominantQualityInfo.label} · ${dominantQuality?.[1] || 0}`,
                    summary: dominantQualityInfo.overview,
                    lines: [
                      dominantQualityInfo.strength,
                      dominantQualityInfo.watchOut,
                    ],
                  });
                }}
              >
                <Text style={styles.statLabel}>
                  {t('natalChart.statistics.dominantModality')}
                </Text>
                <Text style={styles.statValueLarge}>
                  {dominantQualityInfo?.label || 'N/A'} (
                  {dominantQuality?.[1] || 0})
                </Text>
                {!!dominantQualityInfo && (
                  <Text style={styles.statHint} numberOfLines={3}>
                    {dominantQualityInfo.overview}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>

        {/* Углы карты */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>{t('natalChart.angles.title')}</Text>

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
                {resolvedAscendant.sign}{' '}
                {formatDegree(resolvedAscendant.degree || 0)}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
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
                {resolvedMidheaven.sign}{' '}
                {formatDegree(resolvedMidheaven.degree || 0)}
              </Text>
              <Text style={styles.angleHint}>
                {t('natalChart.angleModal.openHint')}
              </Text>
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

          return (
            <BlurView key={key} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.planetHeader}>
                  <View style={styles.planetTitleRow}>
                    <Text style={styles.planetSymbol}>{symbol}</Text>
                    <View>
                      <Text style={styles.planetName}>{name}</Text>
                      <Text style={styles.planetSign}>
                        {t('common.in')} {planet.sign || 'N/A'}{' '}
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

                {(() => {
                  const planetInterpretation = toArray<any>(
                    interpretation?.planets
                  ).find((p: any) => p.planet === name);
                  const planetInterpretationText = normalizeNarrativeValue(
                    planetInterpretation?.interpretation
                  );
                  return planetInterpretation ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.interpretationSection}>
                        <Text style={styles.interpretationText}>
                          {planetInterpretationText}
                        </Text>
                      </View>
                    </>
                  ) : null;
                })()}
              </View>
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

          return (
            <BlurView key={num} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.houseHeader}>
                  <Text style={styles.houseNumber}>{num}</Text>
                  <View style={styles.houseInfo}>
                    <Text style={styles.houseName}>
                      {t('natalChart.houses.house', { num })}
                    </Text>
                    <Text style={styles.houseSign}>
                      {house.sign || 'N/A'}{' '}
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

                {(() => {
                  const houseInterpretation = toArray<any>(
                    interpretation?.houses
                  ).find((h: any) => h.house === num);
                  const houseInterpretationText = normalizeNarrativeValue(
                    houseInterpretation?.interpretation
                  );
                  return houseInterpretation ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.interpretationSection}>
                        <Text style={styles.interpretationText}>
                          {houseInterpretationText}
                        </Text>
                      </View>
                    </>
                  ) : null;
                })()}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Аспекты
  const renderAspects = () => {
    if (!aspects || aspects.length === 0) {
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
    aspects.forEach((aspect) => {
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

        {/* Список аспектов */}
        {aspects.map((aspect, idx) => {
          if (!aspect) return null;

          const planetA = t(`common.planets.${aspect.planetA}`);
          const planetB = t(`common.planets.${aspect.planetB}`);
          const aspectName = t(`common.aspects.${aspect.aspect}`);
          const symbolA = PLANET_SYMBOLS[aspect.planetA] || '●';
          const symbolB = PLANET_SYMBOLS[aspect.planetB] || '●';
          const aspectSymbol = ASPECT_SYMBOLS[aspect.aspect] || '●';
          const color = ASPECT_COLORS[aspect.aspect] || '#8B5CF6';

          return (
            <BlurView key={idx} intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
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

                {(() => {
                  const aspectInterpretation = toArray<any>(
                    interpretation?.aspects
                  ).find(
                    (a: any) =>
                      a.planetA === planetA &&
                      a.planetB === planetB &&
                      a.aspect === aspectName
                  );
                  const aspectInterpretationText = normalizeNarrativeValue(
                    aspectInterpretation?.interpretation
                  );
                  return aspectInterpretation ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.interpretationSection}>
                        <Text style={styles.interpretationText}>
                          {aspectInterpretationText}
                        </Text>
                      </View>
                    </>
                  ) : null;
                })()}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Резюме личности
  const renderSummary = () => {
    const summary = isRecord(interpretation?.summary)
      ? (interpretation.summary as Record<string, any>)
      : null;

    logger.info('Interpretation данные', {
      hasInterpretation: !!interpretation,
      hasSummary: !!summary,
      interpretationKeys: interpretation ? Object.keys(interpretation) : [],
      summaryKeys: summary ? Object.keys(summary) : [],
    });

    if (!interpretation) {
      return (
        <View style={styles.content}>
          {renderArchetypeCard()}
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
              <Text style={styles.summarySubtext}>
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
          {renderArchetypeCard()}
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
              <Text style={styles.summarySubtext}>
                {t('natalChart.summary.summaryNotFormed')}
                {'\n\n'}
                {t('natalChart.summary.dataAvailableInOtherTabs')}
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    const summaryGuideChips: Array<{
      key: SummarySectionKey;
      label: string;
    }> = [
      archetype
        ? {
            key: 'archetype',
            label: t('natalChart.summary.archetype.title', 'Архетип'),
          }
        : null,
      summary.chartRuler
        ? {
            key: 'chartRuler',
            label: t('natalChart.summary.chartRuler', 'Управитель карты'),
          }
        : null,
      summary.lunarNodes
        ? {
            key: 'lunarNodes',
            label: t('natalChart.summary.lunarNodes', 'Лунные узлы'),
          }
        : null,
      summary.thematicFocus?.relationships
        ? {
            key: 'relationshipMechanics',
            label: t(
              'natalChart.summary.relationshipMechanics',
              'Механика отношений'
            ),
          }
        : null,
      summary.thematicFocus?.career
        ? {
            key: 'careerMechanics',
            label: t('natalChart.summary.careerMechanics', 'Механика карьеры'),
          }
        : null,
      summary.thematicFocus?.finances
        ? {
            key: 'financeMechanics',
            label: t('natalChart.summary.financeMechanics', 'Механика денег'),
          }
        : null,
    ].filter(
      (
        chip
      ): chip is {
        key: SummarySectionKey;
        label: string;
      } => Boolean(chip)
    );

    return (
      <View
        style={styles.content}
        onLayout={(event) => {
          summaryContentOffsetRef.current = event.nativeEvent.layout.y;
        }}
      >
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.summaryHeader}>
              <Ionicons
                name="layers-outline"
                size={24}
                color="rgba(139, 92, 246, 0.95)"
              />
              <Text style={styles.summaryTitle}>
                {t(
                  'natalChart.summary.summaryGuideTitle',
                  'Как читать это резюме'
                )}
              </Text>
            </View>
            <Text style={styles.summarySubtext}>
              {t(
                'natalChart.summary.summaryGuideText',
                'Карточки ниже показывают суть. Нажмите любую, чтобы открыть полный разбор без перегруза экрана.'
              )}
            </Text>
            {!!summaryGuideChips.length && (
              <View style={[styles.chipContainer, styles.summaryGuideChips]}>
                {summaryGuideChips.map((chip, idx) => (
                  <TouchableOpacity
                    key={`${chip.key}-${idx}`}
                    activeOpacity={0.82}
                    style={styles.summaryGuideChip}
                    onPress={() => scrollToSummarySection(chip.key)}
                  >
                    <Text style={styles.summaryGuideChipText}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </BlurView>

        {!!archetype && (
          <View
            onLayout={(event) =>
              registerSummarySection('archetype', event.nativeEvent.layout.y)
            }
          >
            {renderArchetypeCard()}
          </View>
        )}

        {summary.chartRuler && (
          <View
            onLayout={(event) =>
              registerSummarySection('chartRuler', event.nativeEvent.layout.y)
            }
          >
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.cardInner}
                onPress={() =>
                  openSummaryModal({
                    title: t(
                      'natalChart.summary.chartRuler',
                      'Управитель карты'
                    ),
                    subtitle: `${summary.chartRuler.ruler} · ${summary.chartRuler.sign} · ${summary.chartRuler.house}${t('natalChart.summary.houseShort', ' дом')}`,
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
                  {summary.chartRuler.sign}
                  {' · '}
                  {summary.chartRuler.house}
                  {t('natalChart.summary.houseShort', ' дом')}
                </Text>
                <Text style={styles.summarySubtext} numberOfLines={3}>
                  {normalizeNarrativeValue(summary.chartRuler.interpretation)}
                </Text>
                {renderSummaryOpenHint()}
              </TouchableOpacity>
            </BlurView>
          </View>
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
                {normalizeNarrativeValue(summary.sect.interpretation)}
              </Text>
              {renderSummaryOpenHint()}
            </TouchableOpacity>
          </BlurView>
        )}

        {summary.lunarNodes && (
          <View
            onLayout={(event) =>
              registerSummarySection('lunarNodes', event.nativeEvent.layout.y)
            }
          >
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.cardInner}
                onPress={() =>
                  openSummaryModal({
                    title: t('natalChart.summary.lunarNodes', 'Лунные узлы'),
                    subtitle: [
                      summary.lunarNodes.northNode
                        ? `NN · ${summary.lunarNodes.northNode.sign} · ${summary.lunarNodes.northNode.house}${t('natalChart.summary.houseShort', ' дом')}`
                        : '',
                      summary.lunarNodes.southNode
                        ? `SN · ${summary.lunarNodes.southNode.sign} · ${summary.lunarNodes.southNode.house}${t('natalChart.summary.houseShort', ' дом')}`
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
                    {normalizeNarrativeValue(
                      summary.lunarNodes.northNode.interpretation
                    )}
                  </Text>
                )}
                {!!summary.lunarNodes.southNode?.interpretation && (
                  <Text style={styles.summarySubtext} numberOfLines={2}>
                    {normalizeNarrativeValue(
                      summary.lunarNodes.southNode.interpretation
                    )}
                  </Text>
                )}
                <Text style={styles.summarySubtext} numberOfLines={2}>
                  {normalizeNarrativeValue(
                    summary.lunarNodes.axisInterpretation
                  )}
                </Text>
                {renderSummaryOpenHint()}
              </TouchableOpacity>
            </BlurView>
          </View>
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
                    ? `${summary.dispositors.finalDispositor.planet} · ${summary.dispositors.finalDispositor.sign} · ${summary.dispositors.finalDispositor.house}${t('natalChart.summary.houseShort', ' дом')}`
                    : summary.dispositors.dominantDispositor
                      ? `${summary.dispositors.dominantDispositor.planet} · ${summary.dispositors.dominantDispositor.sign} · ${summary.dispositors.dominantDispositor.house}${t('natalChart.summary.houseShort', ' дом')}`
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
                  {summary.dispositors.finalDispositor.sign}
                  {' · '}
                  {summary.dispositors.finalDispositor.house}
                  {t('natalChart.summary.houseShort', ' дом')}
                </Text>
              )}
              {!!summary.dispositors.finalDispositor?.interpretation && (
                <Text style={styles.summarySubtext} numberOfLines={3}>
                  {normalizeNarrativeValue(
                    summary.dispositors.finalDispositor.interpretation
                  )}
                </Text>
              )}
              {!!summary.dispositors.dominantDispositor &&
                !summary.dispositors.finalDispositor && (
                  <Text style={styles.summaryText}>
                    {summary.dispositors.dominantDispositor.planet}
                    {' · '}
                    {summary.dispositors.dominantDispositor.sign}
                    {' · '}
                    {summary.dispositors.dominantDispositor.house}
                    {t('natalChart.summary.houseShort', ' дом')}
                  </Text>
                )}
              {!!summary.dispositors.dominantDispositor &&
                !summary.dispositors.finalDispositor?.interpretation && (
                  <Text style={styles.summarySubtext} numberOfLines={3}>
                    {normalizeNarrativeValue(
                      summary.dispositors.dominantDispositor.interpretation
                    )}
                  </Text>
                )}
              <Text style={styles.summarySubtext} numberOfLines={2}>
                {normalizeNarrativeValue(summary.dispositors.chainSummary)}
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

        {summary.thematicFocus?.relationships && (
          <View
            onLayout={(event) =>
              registerSummarySection(
                'relationshipMechanics',
                event.nativeEvent.layout.y
              )
            }
          >
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.cardInner}
                onPress={() =>
                  openSummaryModal({
                    title: t(
                      'natalChart.summary.relationshipMechanics',
                      'Механика отношений'
                    ),
                    summary: summary.thematicFocus?.relationships,
                    lines: [summary.relationships].filter(Boolean) as string[],
                  })
                }
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                  <Text style={styles.summaryTitle}>
                    {t(
                      'natalChart.summary.relationshipMechanics',
                      'Механика отношений'
                    )}
                  </Text>
                </View>
                <Text style={styles.summaryText} numberOfLines={4}>
                  {normalizeNarrativeValue(summary.thematicFocus.relationships)}
                </Text>
                {renderSummaryOpenHint(summary.relationships ? 1 : undefined)}
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        {summary.thematicFocus?.career && (
          <View
            onLayout={(event) =>
              registerSummarySection(
                'careerMechanics',
                event.nativeEvent.layout.y
              )
            }
          >
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.cardInner}
                onPress={() =>
                  openSummaryModal({
                    title: t(
                      'natalChart.summary.careerMechanics',
                      'Механика карьеры'
                    ),
                    summary: summary.thematicFocus?.career,
                    lines: [summary.careerPath].filter(Boolean) as string[],
                  })
                }
              >
                <View style={styles.summaryHeader}>
                  <Ionicons
                    name="briefcase-outline"
                    size={24}
                    color="#4ECDC4"
                  />
                  <Text style={styles.summaryTitle}>
                    {t(
                      'natalChart.summary.careerMechanics',
                      'Механика карьеры'
                    )}
                  </Text>
                </View>
                <Text style={styles.summaryText} numberOfLines={4}>
                  {normalizeNarrativeValue(summary.thematicFocus.career)}
                </Text>
                {renderSummaryOpenHint(summary.careerPath ? 1 : undefined)}
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        {summary.thematicFocus?.finances && (
          <View
            onLayout={(event) =>
              registerSummarySection(
                'financeMechanics',
                event.nativeEvent.layout.y
              )
            }
          >
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.cardInner}
                onPress={() =>
                  openSummaryModal({
                    title: t(
                      'natalChart.summary.financeMechanics',
                      'Механика денег'
                    ),
                    summary: summary.thematicFocus?.finances,
                    lines: [summary.financialApproach].filter(
                      Boolean
                    ) as string[],
                  })
                }
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="cash-outline" size={24} color="#FFD700" />
                  <Text style={styles.summaryTitle}>
                    {t('natalChart.summary.financeMechanics', 'Механика денег')}
                  </Text>
                </View>
                <Text style={styles.summaryText} numberOfLines={4}>
                  {normalizeNarrativeValue(summary.thematicFocus.finances)}
                </Text>
                {renderSummaryOpenHint(
                  summary.financialApproach ? 1 : undefined
                )}
              </TouchableOpacity>
            </BlurView>
          </View>
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
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.lifePurpose)}
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
                  lines: summary.thematicFocus?.relationships
                    ? [summary.thematicFocus.relationships]
                    : [],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.relationships')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.relationships)}
              </Text>
              {renderSummaryOpenHint(
                summary.thematicFocus?.relationships ? 1 : undefined
              )}
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
                  lines: summary.thematicFocus?.career
                    ? [summary.thematicFocus.career]
                    : [],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="briefcase-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.careerPath')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.careerPath)}
              </Text>
              {renderSummaryOpenHint(
                summary.thematicFocus?.career ? 1 : undefined
              )}
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
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.spiritualPath)}
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
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.healthFocus)}
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
                  lines: summary.thematicFocus?.finances
                    ? [summary.thematicFocus.finances]
                    : [],
                })
              }
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="cash-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>
                  {t('natalChart.summary.financialApproach')}
                </Text>
              </View>
              <Text style={styles.summaryText} numberOfLines={4}>
                {normalizeNarrativeValue(summary.financialApproach)}
              </Text>
              {renderSummaryOpenHint(
                summary.thematicFocus?.finances ? 1 : undefined
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
                  lines: buildElementDetailLines(summary.dominantElements),
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
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {(() => {
                  const detailKey = resolveElementKey(
                    summary.dominantElements[0]
                  );
                  return detailKey
                    ? getElementInfo(detailKey).overview
                    : t(
                        'natalChart.summary.dominantElementsHint',
                        'Эти элементы показывают, какая энергия проявляется в карте естественнее и чаще.'
                      );
                })()}
              </Text>
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
                  lines: buildQualityDetailLines(summary.dominantQualities),
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
              <Text style={styles.summarySubtext} numberOfLines={3}>
                {(() => {
                  const detailKey = resolveQualityKey(
                    summary.dominantQualities[0]
                  );
                  return detailKey
                    ? getQualityInfo(detailKey).overview
                    : t(
                        'natalChart.summary.dominantQualitiesHint',
                        'Эти качества показывают, как карта запускает, удерживает и меняет процессы.'
                      );
                })()}
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
      </View>
    );
  };

  return (
    <TabScreenLayout>
      <ScrollView
        ref={scrollViewRef}
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'planets' && renderPlanets()}
        {activeTab === 'houses' && renderHouses()}
        {activeTab === 'aspects' && renderAspects()}
        {activeTab === 'summary' && renderSummary()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
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
  statHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.58)',
    textAlign: 'center',
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
