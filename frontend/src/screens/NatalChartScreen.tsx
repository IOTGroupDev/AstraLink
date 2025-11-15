import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { chartAPI } from '../services/api';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import LoadingIndicator from '../components/shared/LoadingIndicator';

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
  };
  interpretation?: any;
}

const PLANET_NAMES: Record<string, string> = {
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
};

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

const ASPECT_NAMES: Record<string, string> = {
  conjunction: 'Соединение',
  opposition: 'Оппозиция',
  trine: 'Тригон',
  square: 'Квадрат',
  sextile: 'Секстиль',
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
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'planets' | 'houses' | 'aspects' | 'summary'
  >('overview');

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      console.log('📊 Загружены данные натальной карты:', {
        hasData: !!data?.data,
        hasInterpretation: !!data?.data?.interpretation,
        hasSummary: !!data?.data?.interpretation?.summary,
        dataKeys: data?.data ? Object.keys(data.data) : [],
        interpretationKeys: data?.data?.interpretation
          ? Object.keys(data.data.interpretation)
          : [],
        summaryKeys: data?.data?.interpretation?.summary
          ? Object.keys(data.data.interpretation.summary)
          : [],
      });
      setChartData(data);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки натальной карты:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChartData();
    setRefreshing(false);
  };

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
          <Text style={styles.errorText}>Натальная карта не найдена</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </TabScreenLayout>
    );
  }

  const { planets, houses, aspects, ascendant, midheaven } = chartData.data;
  const interpretation = chartData.data?.interpretation;

  // Вкладки
  const tabs = [
    { id: 'overview', label: 'Обзор', icon: 'star-outline' },
    { id: 'planets', label: 'Планеты', icon: 'planet-outline' },
    { id: 'houses', label: 'Дома', icon: 'home-outline' },
    { id: 'aspects', label: 'Аспекты', icon: 'git-network-outline' },
    { id: 'summary', label: 'Резюме', icon: 'document-text-outline' },
  ];

  // Основная информация
  const renderOverview = () => {
    const sunSign = planets?.sun?.sign || 'N/A';
    const moonSign = planets?.moon?.sign || 'N/A';
    const ascSign = ascendant?.sign || 'N/A';

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
        {/* Основная тройка */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Большая Тройка</Text>

            <View style={styles.bigThreeRow}>
              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☉</Text>
                <Text style={styles.bigThreeLabel}>Солнце</Text>
                <Text style={styles.bigThreeValue}>{sunSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets.sun?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>☽</Text>
                <Text style={styles.bigThreeLabel}>Луна</Text>
                <Text style={styles.bigThreeValue}>{moonSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(planets.moon?.degree || 0)}
                </Text>
              </View>

              <View style={styles.bigThreeItem}>
                <Text style={styles.bigThreeSymbol}>ASC</Text>
                <Text style={styles.bigThreeLabel}>Асцендент</Text>
                <Text style={styles.bigThreeValue}>{ascSign}</Text>
                <Text style={styles.bigThreeDegree}>
                  {formatDegree(ascendant?.degree || 0)}
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Статистика карты */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Статистика карты</Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Планеты</Text>
                <Text style={styles.statValue}>
                  {planets ? Object.keys(planets).length : 0}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Аспекты</Text>
                <Text style={styles.statValue}>{aspects?.length || 0}</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ретроградных</Text>
                <Text style={styles.statValue}>{retrogradeCount}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>Доминирующий элемент</Text>
                <Text style={styles.statValueLarge}>
                  {dominantElement?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantElement?.[1] || 0})
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItemFull}>
                <Text style={styles.statLabel}>Доминирующее качество</Text>
                <Text style={styles.statValueLarge}>
                  {dominantQuality?.[0]?.toUpperCase() || 'N/A'} (
                  {dominantQuality?.[1] || 0})
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Углы карты */}
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Углы карты</Text>

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>ASC</Text>
                <Text style={styles.angleLabel}>Асцендент (1 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {ascendant?.sign} {formatDegree(ascendant?.degree || 0)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>MC</Text>
                <Text style={styles.angleLabel}>Середина неба (10 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {midheaven?.sign} {formatDegree(midheaven?.degree || 0)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>DSC</Text>
                <Text style={styles.angleLabel}>Десцендент (7 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[7]?.sign || 'N/A'}{' '}
                {houses?.[7]?.cusp ? formatDegree(houses[7].cusp) : ''}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.angleItem}>
              <View style={styles.angleHeader}>
                <Text style={styles.angleSymbol}>IC</Text>
                <Text style={styles.angleLabel}>Нижнее небо (4 дом)</Text>
              </View>
              <Text style={styles.angleValue}>
                {houses?.[4]?.sign || 'N/A'}{' '}
                {houses?.[4]?.cusp ? formatDegree(houses[4].cusp) : ''}
              </Text>
            </View>
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

          const name = PLANET_NAMES[key] || key;
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
                        в {planet.sign || 'N/A'} {formatDegree(planet.degree)}
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
                    <Text style={styles.detailLabel}>Долгота:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.longitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Широта:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.latitude || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Скорость:</Text>
                    <Text style={styles.detailValue}>
                      {(planet.speed || 0).toFixed(4)}°/день
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Дом:</Text>
                    <Text style={styles.detailValue}>{house}</Text>
                  </View>
                </View>

                {interpretation?.planets?.find(
                  (p: any) => p.planet === name
                ) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.planets.find(
                            (p: any) => p.planet === name
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
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

    const houseThemes = [
      'Личность, внешность, начало',
      'Деньги, ресурсы, ценности',
      'Общение, обучение, близкое окружение',
      'Дом, семья, корни',
      'Творчество, дети, романтика',
      'Здоровье, работа, служение',
      'Партнерство, брак, контракты',
      'Трансформация, общие ресурсы',
      'Философия, путешествия, высшее образование',
      'Карьера, статус, призвание',
      'Дружба, сообщества, мечты',
      'Подсознание, изоляция, духовность',
    ];

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
                    <Text style={styles.houseName}>Дом {num}</Text>
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
                        Планеты в доме:
                      </Text>
                      <View style={styles.planetChips}>
                        {planetsInHouse.map(([key, planet]) => (
                          <View key={key} style={styles.planetChip}>
                            <Text style={styles.planetChipSymbol}>
                              {PLANET_SYMBOLS[key] || '●'}
                            </Text>
                            <Text style={styles.planetChipText}>
                              {PLANET_NAMES[key] || key}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {interpretation?.houses?.find((h: any) => h.house === num) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.houses.find(
                            (h: any) => h.house === num
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
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
              <Text style={styles.cardTitle}>Нет аспектов</Text>
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
            <Text style={styles.cardTitle}>Статистика аспектов</Text>
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
                    {ASPECT_NAMES[type] || type}
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

          const planetA = PLANET_NAMES[aspect.planetA] || aspect.planetA;
          const planetB = PLANET_NAMES[aspect.planetB] || aspect.planetB;
          const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
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
                    <Text style={styles.detailLabel}>Угол:</Text>
                    <Text style={styles.detailValue}>
                      {(aspect.angle || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Орб:</Text>
                    <Text style={styles.detailValue}>
                      {Math.abs(aspect.orb || 0).toFixed(2)}°
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Тип:</Text>
                    <Text style={styles.detailValue}>
                      {aspect.applying ? 'Сходящийся' : 'Расходящийся'}
                    </Text>
                  </View>
                </View>

                {interpretation?.aspects?.find(
                  (a: any) =>
                    a.planetA === planetA &&
                    a.planetB === planetB &&
                    a.aspect === aspectName
                ) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.interpretationSection}>
                      <Text style={styles.interpretationText}>
                        {
                          interpretation.aspects.find(
                            (a: any) =>
                              a.planetA === planetA &&
                              a.planetB === planetB &&
                              a.aspect === aspectName
                          ).interpretation
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          );
        })}
      </View>
    );
  };

  // Резюме личности
  const renderSummary = () => {
    const summary = interpretation?.summary;

    console.log('📊 Interpretation данные:', {
      hasInterpretation: !!interpretation,
      hasSummary: !!summary,
      interpretationKeys: interpretation ? Object.keys(interpretation) : [],
      summaryKeys: summary ? Object.keys(summary) : [],
    });

    if (!interpretation) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#FF6B35"
                />
                <Text style={styles.summaryTitle}>
                  Интерпретация недоступна
                </Text>
              </View>
              <Text style={styles.summarySubtext}>
                Данные интерпретации натальной карты не загружены.{'\n\n'}
                Попробуйте обновить страницу.
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    if (!summary) {
      return (
        <View style={styles.content}>
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.summaryTitle}>Резюме формируется</Text>
              </View>
              <Text style={styles.summarySubtext}>
                Полное резюме личности пока не сформировано.{'\n\n'}
                Данные доступны в других вкладках: Обзор, Планеты, Дома,
                Аспекты.
              </Text>
            </View>
          </BlurView>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {/* Жизненная цель */}
        {summary.lifePurpose && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="compass-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Жизненная цель</Text>
              </View>
              <Text style={styles.summaryText}>{summary.lifePurpose}</Text>
            </View>
          </BlurView>
        )}

        {/* Личностные качества */}
        {summary.personalityTraits && summary.personalityTraits.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="person-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Личностные качества</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.personalityTraits.map((trait: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={styles.traitBullet} />
                    <Text style={styles.traitText}>{trait}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Таланты */}
        {summary.talents && summary.talents.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Таланты и дары</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.talents.map((talent: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={[styles.traitBullet, styles.talentBullet]} />
                    <Text style={styles.traitText}>{talent}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Жизненные темы */}
        {summary.lifeThemes && summary.lifeThemes.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="book-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Жизненные темы</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.lifeThemes.map((theme: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View style={styles.traitBullet} />
                    <Text style={styles.traitText}>{theme}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Кармические уроки */}
        {summary.karmaLessons && summary.karmaLessons.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="school-outline" size={24} color="#FF6B35" />
                <Text style={styles.summaryTitle}>Кармические уроки</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.karmaLessons.map((lesson: string, idx: number) => (
                  <View key={idx} style={styles.traitItem}>
                    <View
                      style={[styles.traitBullet, styles.karmaLessonBullet]}
                    />
                    <Text style={styles.traitText}>{lesson}</Text>
                  </View>
                ))}
              </View>
            </View>
          </BlurView>
        )}

        {/* Отношения */}
        {summary.relationships && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                <Text style={styles.summaryTitle}>Отношения</Text>
              </View>
              <Text style={styles.summaryText}>{summary.relationships}</Text>
            </View>
          </BlurView>
        )}

        {/* Карьера */}
        {summary.careerPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="briefcase-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>Карьерный путь</Text>
              </View>
              <Text style={styles.summaryText}>{summary.careerPath}</Text>
            </View>
          </BlurView>
        )}

        {/* Духовный путь */}
        {summary.spiritualPath && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="flame-outline" size={24} color="#9B59B6" />
                <Text style={styles.summaryTitle}>Духовный путь</Text>
              </View>
              <Text style={styles.summaryText}>{summary.spiritualPath}</Text>
            </View>
          </BlurView>
        )}

        {/* Здоровье */}
        {summary.healthFocus && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="fitness-outline" size={24} color="#4ECDC4" />
                <Text style={styles.summaryTitle}>Здоровье</Text>
              </View>
              <Text style={styles.summaryText}>{summary.healthFocus}</Text>
            </View>
          </BlurView>
        )}

        {/* Финансы */}
        {summary.financialApproach && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="cash-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Финансовый подход</Text>
              </View>
              <Text style={styles.summaryText}>
                {summary.financialApproach}
              </Text>
            </View>
          </BlurView>
        )}

        {/* Доминирующие элементы */}
        {summary.dominantElements && summary.dominantElements.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="water-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Доминирующие элементы</Text>
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
            </View>
          </BlurView>
        )}

        {/* Доминирующие качества */}
        {summary.dominantQualities && summary.dominantQualities.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="settings-outline" size={24} color="#8B5CF6" />
                <Text style={styles.summaryTitle}>Доминирующие качества</Text>
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
            </View>
          </BlurView>
        )}

        {/* Рекомендации */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.summaryHeader}>
                <Ionicons name="bulb-outline" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Рекомендации</Text>
              </View>
              <View style={styles.traitsList}>
                {summary.recommendations.map(
                  (recommendation: string, idx: number) => (
                    <View key={idx} style={styles.traitItem}>
                      <View
                        style={[
                          styles.traitBullet,
                          styles.recommendationBullet,
                        ]}
                      />
                      <Text style={styles.traitText}>{recommendation}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </BlurView>
        )}
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
          <Text style={styles.headerTitle}>Натальная карта</Text>
          <Text style={styles.headerSubtitle}>
            Полный астрологический анализ
          </Text>
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
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons
                name={tab.icon as any}
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
