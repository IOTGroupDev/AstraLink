import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  G,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../services/logger';

const { width } = Dimensions.get('window');

// Типы для планет
interface PlanetPosition {
  name: string;
  longitude: number;
  sign?: string;
  degree?: number;
}

interface TransitData {
  planet: string;
  target: string;
  type: string;
  orb: number;
  strength: number;
}

interface PlanetaryRecommendationWidgetProps {
  natalPlanets:
    | Record<string, { longitude: number; sign: string; degree: number }>
    | string
    | any;
  transitPlanets: PlanetPosition[] | string | any;
  onPress?: () => void;
  isLoading?: boolean;
  navigation?: any;
}

// Функция для получения цвета планеты
const getPlanetColor = (planet: string): string => {
  const colors: Record<string, string> = {
    sun: '#FDB813',
    moon: '#C0C0C0',
    mercury: '#87CEEB',
    venus: '#FFC0CB',
    mars: '#FF4500',
    jupiter: '#DAA520',
    saturn: '#8B7355',
    uranus: '#4169E1',
    neptune: '#1E90FF',
    pluto: '#8B0000',
  };
  return colors[planet.toLowerCase()] || '#8B5CF6';
};

// Функция для получения цвета аспекта
const getAspectColor = (aspectType: string): string => {
  const colors: Record<string, string> = {
    conjunction: '#FFD700',
    sextile: '#90EE90',
    square: '#FF6B6B',
    trine: '#87CEEB',
    opposition: '#FF69B4',
  };
  return colors[aspectType.toLowerCase()] || '#8B5CF6';
};

// Функция для проверки валидности данных планет (поддержка объекта и массива)
const isValidPlanetData = (data: any): boolean => {
  if (!data) return false;

  // Если это массив планет
  if (Array.isArray(data)) {
    return data.some(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof (p.longitude ?? p?.position?.longitude) === 'number'
    );
  }

  // Если это объект: проверяем значения
  if (typeof data === 'object') {
    const values = Object.values(data);
    if (values.length === 0) return false;
    return values.some(
      (p: any) =>
        p &&
        typeof p === 'object' &&
        typeof (p.longitude ?? p?.position?.longitude) === 'number'
    );
  }

  return false;
};

// Функция для проверки валидности транзитных планет
const isValidTransitData = (data: any): boolean => {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;

  // Проверяем, что первый элемент имеет нужные поля
  const first = data[0];
  return (
    first &&
    typeof first.longitude === 'number' &&
    typeof first.name === 'string'
  );
};

// Нормализация натальных планет к объекту Record<string, { longitude, sign, degree }>
const normalizeNatalPlanets = (
  raw: any
): Record<string, { longitude: number; sign?: string; degree?: number }> => {
  const out: Record<
    string,
    { longitude: number; sign?: string; degree?: number }
  > = {};

  try {
    if (!raw) return out;

    if (Array.isArray(raw)) {
      raw.forEach((p: any, idx: number) => {
        const lon = p?.longitude ?? p?.position?.longitude;
        if (typeof lon === 'number') {
          const key =
            (typeof p?.name === 'string' && p.name.toLowerCase()) || `p${idx}`;
          out[key] = {
            longitude: lon,
            sign: p?.sign,
            degree: p?.degree,
          };
        }
      });
      return out;
    }

    if (typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        const lon = (v as any)?.longitude ?? (v as any)?.position?.longitude;
        if (typeof lon === 'number') {
          out[k.toLowerCase()] = {
            longitude: lon,
            sign: (v as any)?.sign,
            degree: (v as any)?.degree,
          };
        }
      }
      return out;
    }
  } catch {
    // ignore
  }

  return out;
};

// Функция для расчета активных транзитов (принимает «сырые» натальные планеты)
const calculateActiveTransits = (
  transitPlanets: PlanetPosition[],
  natalPlanetsRaw: any
): TransitData[] => {
  const transits: TransitData[] = [];
  const orbTolerance = 8; // орб в градусах
  const natalPlanets = normalizeNatalPlanets(natalPlanetsRaw);

  try {
    if (!Array.isArray(transitPlanets) || !transitPlanets.length) {
      return [];
    }

    if (
      !natalPlanets ||
      typeof natalPlanets !== 'object' ||
      !Object.keys(natalPlanets).length
    ) {
      return [];
    }

    transitPlanets.forEach((transitPlanet) => {
      if (!transitPlanet || typeof transitPlanet.longitude !== 'number') {
        return;
      }

      Object.entries(natalPlanets).forEach(([natalKey, natalPlanet]) => {
        if (!natalPlanet || typeof natalPlanet.longitude !== 'number') {
          return;
        }

        const diff = Math.abs(transitPlanet.longitude - natalPlanet.longitude);
        const normalizedDiff = diff > 180 ? 360 - diff : diff;

        // Проверяем основные аспекты
        const aspects = [
          { type: 'conjunction', angle: 0 },
          { type: 'sextile', angle: 60 },
          { type: 'square', angle: 90 },
          { type: 'trine', angle: 120 },
          { type: 'opposition', angle: 180 },
        ];

        aspects.forEach((aspect) => {
          const orb = Math.abs(normalizedDiff - aspect.angle);
          if (orb <= orbTolerance) {
            const strength = 1 - orb / orbTolerance;
            transits.push({
              planet: transitPlanet.name,
              target: natalKey,
              type: aspect.type,
              orb,
              strength,
            });
          }
        });
      });
    });

    // Сортируем по силе (самые точные аспекты первыми)
    return transits.sort((a, b) => b.strength - a.strength);
  } catch (error) {
    logger.error('Ошибка в calculateActiveTransits', error);
    return [];
  }
};
// Дополнительные утилиты для рекомендаций
const normalizePlanetKey = (name: string): string => {
  const raw = (name || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();

  // already keys
  if (
    [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ].includes(lower)
  ) {
    return lower;
  }

  // Title-case variants
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const map: Record<string, string> = {
    Sun: 'sun',
    Moon: 'moon',
    Mercury: 'mercury',
    Venus: 'venus',
    Mars: 'mars',
    Jupiter: 'jupiter',
    Saturn: 'saturn',
    Uranus: 'uranus',
    Neptune: 'neptune',
    Pluto: 'pluto',
  };

  return map[title] ?? lower;
};

function buildRecommendations(
  transits: TransitData[],
  t: (key: string, options?: any) => string
) {
  const positive: string[] = [];
  const negative: string[] = [];
  const positiveVariants = (t(
    'horoscope.planetRecommendationWidget.recommendationPositiveVariants',
    { returnObjects: true }
  ) || []) as string[];
  const negativeVariants = (t(
    'horoscope.planetRecommendationWidget.recommendationNegativeVariants',
    { returnObjects: true }
  ) || []) as string[];
  const pickVariant = (variants: string[], index: number) => {
    if (!Array.isArray(variants) || variants.length === 0) return null;
    return variants[index % variants.length];
  };

  for (const tr of transits) {
    const targetKey = normalizePlanetKey(tr.target);
    const planetKey = normalizePlanetKey(tr.planet);
    const targetName = targetKey
      ? t(`common.planets.${targetKey}`, { defaultValue: tr.target })
      : tr.target;
    const planetName = planetKey
      ? t(`common.planets.${planetKey}`, { defaultValue: tr.planet })
      : tr.planet;

    const aspectName = t(`common.aspects.${tr.type}`, {
      defaultValue: tr.type,
    });
    const strengthPercent = Math.round((tr.strength ?? 0) * 100);
    const orbValue = Number.isFinite(tr.orb) ? tr.orb : 0;

    const isPositive =
      tr.type === 'trine' || tr.type === 'sextile' || tr.type === 'conjunction';

    const fallbackLine = isPositive
      ? t('horoscope.planetRecommendationWidget.recommendationPositive', {
          aspect: aspectName,
          target: targetName,
          planet: planetName,
        })
      : t('horoscope.planetRecommendationWidget.recommendationNegative', {
          aspect: aspectName,
          target: targetName,
          planet: planetName,
        });
    const variantTemplate = isPositive
      ? pickVariant(positiveVariants, positive.length)
      : pickVariant(negativeVariants, negative.length);
    const line =
      variantTemplate && typeof variantTemplate === 'string'
        ? variantTemplate
            .replace('{{planet}}', planetName)
            .replace('{{aspect}}', aspectName)
            .replace('{{target}}', targetName)
        : fallbackLine;

    const detail = t(
      'horoscope.planetRecommendationWidget.recommendationDetail',
      {
        strength: strengthPercent,
        orb: orbValue.toFixed(1),
      }
    );
    const fullText = `${line} ${detail}`;

    if (isPositive) {
      if (positive.length < 3) positive.push(fullText);
    } else {
      if (negative.length < 3) negative.push(fullText);
    }

    if (positive.length >= 3 && negative.length >= 3) break;
  }

  return { positive, negative };
}

const PlanetaryRecommendationWidget: React.FC<
  PlanetaryRecommendationWidgetProps
> = ({ natalPlanets, transitPlanets, onPress, isLoading }) => {
  const { t } = useTranslation();
  const [adviceModalVisible, setAdviceModalVisible] = useState(false);
  const [adviceModalTitle, setAdviceModalTitle] = useState('');
  const [adviceModalItems, setAdviceModalItems] = useState<string[]>([]);
  const [adviceModalSummary, setAdviceModalSummary] = useState('');

  // Валидация данных
  const hasValidNatalData = isValidPlanetData(natalPlanets);
  const hasValidTransitData = isValidTransitData(transitPlanets);

  // Логирование для отладки валидации данных
  React.useEffect(() => {
    if (!hasValidNatalData || !hasValidTransitData) {
      logger.warn('PlanetaryRecommendationWidget: Невалидные данные', {
        hasValidNatalData,
        hasValidTransitData,
        natalPlanets: typeof natalPlanets,
        transitPlanets: typeof transitPlanets,
        natalIsArray: Array.isArray(natalPlanets),
        transitIsArray: Array.isArray(transitPlanets),
        natalKeys:
          natalPlanets && typeof natalPlanets === 'object'
            ? Object.keys(natalPlanets).length
            : 0,
        transitLength: Array.isArray(transitPlanets)
          ? transitPlanets.length
          : 0,
      });
    }
  }, [hasValidNatalData, hasValidTransitData, natalPlanets, transitPlanets]);

  // Если из экрана пришёл пустой объект ({}), считаем что данные ещё грузятся
  const natalEmptyObject =
    !!natalPlanets &&
    typeof natalPlanets === 'object' &&
    !Array.isArray(natalPlanets) &&
    Object.keys(natalPlanets).length === 0;

  const effectiveLoading = !!(isLoading || natalEmptyObject);

  // Плейсхолдер загрузки — показываем только пока идёт глобальная загрузка
  // или когда нет транзитов. Отсутствие натальных планет НЕ блокирует вывод (покажем транзиты без аспектов).
  if (effectiveLoading || !hasValidTransitData) {
    // Логируем только когда загрузка закончилась, а транзиты так и невалидны
    if (!effectiveLoading && !hasValidTransitData) {
      logger.warn(
        'PlanetaryRecommendationWidget: Недоступны транзиты (после загрузки)',
        {
          transitPlanets: typeof transitPlanets,
          hasValidTransitData,
        }
      );
    }

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.4)', 'rgba(168, 85, 247, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>
                🌙 {t('horoscope.planetRecommendationWidget.title')}
              </Text>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: '#A78BFA' }}>
                {t('horoscope.planetRecommendationWidget.loading')}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.border}
          />
        </LinearGradient>
      </View>
    );
  }

  // Рассчитываем активные транзиты
  let activeTransits: TransitData[] = [];
  try {
    activeTransits = calculateActiveTransits(transitPlanets, natalPlanets);
  } catch (error) {
    logger.error('Ошибка при расчете транзитов', error);
    return null;
  }
  const { positive: positiveRecs, negative: negativeRecs } =
    buildRecommendations(activeTransits, t);
  const buildSummary = (items: string[], fallbackKey: string) => {
    if (!items.length) return t(fallbackKey);
    const cleaned = items.map((i) => i.replace(/^•\s*/, '').trim());
    const summary = cleaned.slice(0, 2).join(' ');
    return summary;
  };
  const canDoSummary = buildSummary(
    positiveRecs,
    'horoscope.planetRecommendationWidget.summaryCanDoFallback'
  );
  const avoidSummary = buildSummary(
    negativeRecs,
    'horoscope.planetRecommendationWidget.summaryAvoidFallback'
  );

  const openAdviceModal = (title: string, items: string[], summary: string) => {
    setAdviceModalTitle(title);
    setAdviceModalItems(items);
    setAdviceModalSummary(summary);
    setAdviceModalVisible(true);
  };

  const closeAdviceModal = () => {
    setAdviceModalVisible(false);
    setAdviceModalTitle('');
    setAdviceModalItems([]);
    setAdviceModalSummary('');
  };

  const renderAstrologyChart = () => {
    const centerX = 171;
    const centerY = 142;
    const natalRadius = 70;
    const transitRadius = 105;

    // Преобразуем натальные планеты (поддержка объекта и массива)
    let natalPlanetsArray: any[] = [];
    let normalizedNatal: Record<
      string,
      { longitude: number; sign?: string; degree?: number }
    > = {};

    try {
      normalizedNatal = normalizeNatalPlanets(natalPlanets);
      natalPlanetsArray = Object.entries(normalizedNatal).map(
        ([key, planet]) => {
          if (typeof planet === 'object' && planet !== null) {
            return {
              key,
              ...(planet as Record<string, any>),
            };
          }
          return { key };
        }
      );
    } catch (error) {
      logger.error('Ошибка при преобразовании натальных планет', error);
      return null;
    }

    return (
      <Svg width={342} height={284} style={styles.chartSvg}>
        <Defs>
          <RadialGradient id="natalGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.03" />
          </RadialGradient>
        </Defs>

        {/* Внутренний круг - натальная карта */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={natalRadius}
          stroke="#8B5CF6"
          strokeWidth="2"
          fill="url(#natalGradient)"
        />

        {/* Внешний круг - транзиты (пунктирный) */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={transitRadius}
          stroke="#A855F7"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          opacity={0.6}
        />

        {/* Линии аспектов - рисуем ПЕРЕД планетами */}
        {activeTransits.slice(0, 5).map((transit, index) => {
          try {
            // Находим позиции планет для точного отображения линий
            const transitPlanet = transitPlanets.find(
              (p: PlanetPosition) => p.name === transit.planet
            );
            const natalPlanet = normalizedNatal[transit.target.toLowerCase()];

            if (!transitPlanet || !natalPlanet) return null;
            if (
              typeof transitPlanet.longitude !== 'number' ||
              typeof natalPlanet.longitude !== 'number'
            ) {
              return null;
            }

            const transitAngle = (transitPlanet.longitude * Math.PI) / 180;
            const natalAngle = (natalPlanet.longitude * Math.PI) / 180;

            const transitX =
              centerX + transitRadius * Math.cos(transitAngle - Math.PI / 2);
            const transitY =
              centerY + transitRadius * Math.sin(transitAngle - Math.PI / 2);
            const natalX =
              centerX + natalRadius * Math.cos(natalAngle - Math.PI / 2);
            const natalY =
              centerY + natalRadius * Math.sin(natalAngle - Math.PI / 2);

            const aspectColor = getAspectColor(transit.type);

            return (
              <Line
                key={`${transit.planet}-${transit.target}-${index}`}
                x1={transitX}
                y1={transitY}
                x2={natalX}
                y2={natalY}
                stroke={aspectColor}
                strokeWidth={Math.max(1.5, 3 - transit.orb / 2)}
                opacity={Math.max(0.25, 1 - transit.orb / 10)}
                strokeDasharray="3,3"
              />
            );
          } catch (error) {
            logger.error('Ошибка при рисовании аспекта', error);
            return null;
          }
        })}

        {/* Натальные планеты */}
        {natalPlanetsArray.map((planet, index) => {
          try {
            if (typeof planet.longitude !== 'number') return null;

            const angle = (planet.longitude * Math.PI) / 180;
            const x = centerX + natalRadius * Math.cos(angle - Math.PI / 2);
            const y = centerY + natalRadius * Math.sin(angle - Math.PI / 2);

            return (
              <G key={planet.key || index}>
                <Circle cx={x} cy={y} r="5" fill="#8B5CF6" opacity={0.9} />
              </G>
            );
          } catch (error) {
            logger.error('Ошибка при рисовании натальной планеты', error);
            return null;
          }
        })}

        {/* Транзитные планеты */}
        {Array.isArray(transitPlanets) &&
          transitPlanets.map((planet: PlanetPosition, index: number) => {
            try {
              if (typeof planet.longitude !== 'number') return null;

              const angle = (planet.longitude * Math.PI) / 180;
              const x = centerX + transitRadius * Math.cos(angle - Math.PI / 2);
              const y = centerY + transitRadius * Math.sin(angle - Math.PI / 2);

              const planetColor = getPlanetColor(planet.name);

              return (
                <G key={planet.name || index}>
                  <Circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill={planetColor}
                    stroke="#fff"
                    strokeWidth="1"
                    opacity={0.95}
                  />
                </G>
              );
            } catch (error) {
              logger.error('Ошибка при рисовании транзитной планеты', error);
              return null;
            }
          })}
      </Svg>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.4)', 'rgba(168, 85, 247, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {/* Заголовок */}
            <View style={styles.header}>
              <Text style={styles.title}>
                🌙 {t('horoscope.planetRecommendationWidget.title')}
              </Text>
            </View>

            {/* Карта */}
            <View style={styles.chartWrapper}>{renderAstrologyChart()}</View>

            {/* Рекомендации: Позитив / Негатив */}
            <View style={styles.adviceContainer}>
              <View style={styles.adviceRow}>
                <Pressable
                  style={[styles.adviceCard, styles.adviceCardPositive]}
                  onPress={() =>
                    openAdviceModal(
                      t('horoscope.planetRecommendationWidget.positiveTitle'),
                      positiveRecs,
                      canDoSummary
                    )
                  }
                >
                  <Text
                    style={[styles.adviceTitle, styles.adviceTitlePositive]}
                  >
                    {t('horoscope.planetRecommendationWidget.positiveTitle')}
                  </Text>
                  {positiveRecs.length === 0 ? (
                    <Text style={styles.adviceItem}>
                      {t('horoscope.planetRecommendationWidget.emptyItem')}
                    </Text>
                  ) : (
                    positiveRecs.map((s, i) => (
                      <Text
                        key={`pos-${i}`}
                        style={styles.adviceItem}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        • {s}
                      </Text>
                    ))
                  )}
                </Pressable>
                <Pressable
                  style={[styles.adviceCard, styles.adviceCardNegative]}
                  onPress={() =>
                    openAdviceModal(
                      t('horoscope.planetRecommendationWidget.negativeTitle'),
                      negativeRecs,
                      avoidSummary
                    )
                  }
                >
                  <Text
                    style={[styles.adviceTitle, styles.adviceTitleNegative]}
                  >
                    {t('horoscope.planetRecommendationWidget.negativeTitle')}
                  </Text>
                  {negativeRecs.length === 0 ? (
                    <Text style={styles.adviceItem}>
                      {t('horoscope.planetRecommendationWidget.emptyItem')}
                    </Text>
                  ) : (
                    negativeRecs.map((s, i) => (
                      <Text
                        key={`neg-${i}`}
                        style={styles.adviceItem}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        • {s}
                      </Text>
                    ))
                  )}
                </Pressable>
              </View>
            </View>

            {/* Статус */}
            <View style={styles.footer}>
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <View style={styles.checkIconWrapper}>
                    <Svg width={20} height={20} viewBox="0 0 20 20">
                      <Circle cx="10" cy="10" r="9.75" fill="#179D83" />
                      <Circle
                        cx="10"
                        cy="10"
                        r="9.75"
                        stroke="#fff"
                        strokeWidth="0.5"
                        fill="none"
                      />
                      {/* Галочка */}
                      <G transform="translate(5, 6)">
                        <Circle cx="3.5" cy="6" r="0.8" fill="#fff" />
                        <Circle cx="5" cy="7.5" r="0.8" fill="#fff" />
                        <Circle cx="9" cy="2.5" r="0.8" fill="#fff" />
                      </G>
                    </Svg>
                  </View>
                  <Text style={styles.statusText}>
                    {activeTransits.length > 0
                      ? t(
                          'horoscope.planetRecommendationWidget.activeTransits',
                          {
                            count: activeTransits.length,
                          }
                        )
                      : t('horoscope.planetRecommendationWidget.analysis')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Граница */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.border}
          />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={adviceModalVisible}
        onRequestClose={closeAdviceModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAdviceModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{adviceModalTitle}</Text>
              <Pressable onPress={closeAdviceModal}>
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              {!!adviceModalSummary && (
                <View style={styles.modalSummary}>
                  <Text style={styles.modalSummaryText}>
                    {adviceModalSummary}
                  </Text>
                </View>
              )}
              {adviceModalItems.length === 0 ? (
                <Text style={styles.modalText}>
                  {t('horoscope.planetRecommendationWidget.emptyItem')}
                </Text>
              ) : (
                adviceModalItems.map((item, idx) => (
                  <Text key={`advice-${idx}`} style={styles.modalText}>
                    • {item}
                  </Text>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chartSvg: {
    alignSelf: 'center',
  },
  footer: {
    gap: 12,
  },

  // Рекомендации
  adviceContainer: {
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  adviceRow: {
    flexDirection: 'column',
    gap: 8,
  },
  adviceCard: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.35)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
  },
  adviceCardPositive: {
    borderLeftColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  adviceCardNegative: {
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  adviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  adviceTitlePositive: {
    color: '#86EFAC',
  },
  adviceTitleNegative: {
    color: '#FCA5A5',
  },
  adviceItem: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  summaryContainer: {
    marginTop: 10,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
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
    height: '70%',
    minHeight: 240,
    borderRadius: 16,
    backgroundColor: '#140018',
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  modalSummary: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  modalSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 10, 10, 0.35)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconWrapper: {
    width: 20,
    height: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default PlanetaryRecommendationWidget;
