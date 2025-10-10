import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { chartAPI } from '../services/api';
import CosmicBackground from '../components/CosmicBackground';
import LoadingLogo from '../components/LoadingLogo';
import NatalChartWidget from '../components/NatalChartWidget';

interface NatalChartScreenProps {
  navigation: any;
}

const getPlanetColors = (planet: string): string[] => {
  const colors: { [key: string]: string[] } = {
    Солнце: ['#FFD700', '#FFA500', '#FF8C00'],
    Луна: ['#E6E6FA', '#B0C4DE', '#778899'],
    Меркурий: ['#C0C0C0', '#A9A9A9', '#808080'],
    Венера: ['#FFB6C1', '#FF69B4', '#FF1493'],
    Марс: ['#FF6347', '#FF4500', '#DC143C'],
    Юпитер: ['#DDA0DD', '#BA55D3', '#9932CC'],
    Сатурн: ['#708090', '#2F4F4F', '#000000'],
    Уран: ['#00FFFF', '#00CED1', '#20B2AA'],
    Нептун: ['#4169E1', '#0000FF', '#000080'],
    Плутон: ['#8B0000', '#B22222', '#FF0000'],
    Асцендент: ['#8B5CF6', '#7C3AED', '#5B21B6'],
  };
  return colors[planet] || ['#8B5CF6', '#7C3AED', '#5B21B6'];
};

const getPlanetImage = (planet: string): string => {
  // Fixed planet photos (Wikimedia/NASA) to avoid random non-planet images
  const images: { [key: string]: string } = {
    Солнце:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg',
    Луна: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg',
    Меркурий:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/640px-Mercury_in_true_color.jpg',
    Венера:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/640px-Venus-real_color.jpg',
    Марс: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg',
    Юпитер:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Jupiter_by_Cassini-Huygens.jpg/640px-Jupiter_by_Cassini-Huygens.jpg',
    Сатурн:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg',
    Уран: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/640px-Uranus2.jpg',
    Нептун:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/640px-Neptune_Full.jpg',
    Плутон:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg/640px-Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg',
    Асцендент:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/ESO_-_Milky_Way.jpg/640px-ESO_-_Milky_Way.jpg',
  };
  return (
    images[planet] ||
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg'
  );
};

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // "Подробнее" modal state
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState<string>('');
  const [detailsLines, setDetailsLines] = useState<string[]>([]);

  // Simple in-memory cache for details to avoid repeat network calls
  const [detailsCache, setDetailsCache] = useState<Record<string, string[]>>(
    {}
  );

  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    loadChartData();
    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      setChartData(data);
    } catch (error: any) {
      console.error('Error loading natal chart:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
    } finally {
      setLoading(false);
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      {
        translateY: withTiming(fadeAnim.value * 0, { duration: 800 }),
      },
    ],
  }));

  /**
   * Helpers for enrichment
   * RU planet and aspect maps used across screen and for reverse lookup
   */
  const planetRu: Record<string, string> = {
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

  const aspectRu: Record<string, string> = {
    conjunction: 'Соединение',
    opposition: 'Оппозиция',
    trine: 'Тригон',
    square: 'Квадрат',
    sextile: 'Секстиль',
  };

  // Reverse map RU planet name -> key (sun, moon, ...)
  const planetKeyByRu = React.useMemo(() => {
    const entries = Object.entries(planetRu).map(([k, v]) => [v, k]);
    return Object.fromEntries(entries as [string, string][]);
  }, []);

  const resolvePlanetKey = (ruName: string): string => {
    return planetKeyByRu[ruName] || ruName;
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsTitle('');
    setDetailsLines([]);
    setDetailsLoading(false);
  };

  const openDetails = async (
    params:
      | {
          type: 'planet';
          planet: string;
          sign: string;
          locale?: 'ru' | 'en' | 'es';
        }
      | { type: 'ascendant'; sign: string; locale?: 'ru' | 'en' | 'es' }
      | {
          type: 'house';
          houseNum: number | string;
          sign: string;
          locale?: 'ru' | 'en' | 'es';
        }
      | {
          type: 'aspect';
          aspect: string;
          planetA: string;
          planetB: string;
          locale?: 'ru' | 'en' | 'es';
        },
    title: string
  ) => {
    try {
      setDetailsTitle(title);
      setDetailsVisible(true);

      // cache key
      const cacheKey = JSON.stringify(params);
      const cached = detailsCache[cacheKey];
      if (cached && cached.length) {
        setDetailsLines(cached);
        setDetailsLoading(false);
        return;
      }

      setDetailsLoading(true);
      const res = await chartAPI.getInterpretationDetails(params as any);
      const lines = Array.isArray(res?.lines) ? res.lines : [];
      setDetailsLines(lines);
      setDetailsCache((prev) => ({ ...prev, [cacheKey]: lines }));
    } catch (e) {
      console.error('Ошибка загрузки деталей:', e);
      Alert.alert('Ошибка', 'Не удалось загрузить детали');
      setDetailsLines([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingLogo />
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Натальная карта не найдена</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { data } = chartData;
  const interpretation = data?.interpretation;

  if (!interpretation) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Интерпретация недоступна</Text>
        </View>
      </View>
    );
  }

  // Helpers defined above (planetRu, aspectRu)

  const getHouseForLongitude = (longitude: number, houses: any): number => {
    for (let i = 1; i <= 12; i++) {
      const current = houses?.[i]?.cusp ?? 0;
      const next = houses?.[i === 12 ? 1 : i + 1]?.cusp ?? 0;

      if (current <= next) {
        if (longitude >= current && longitude < next) return i;
      } else {
        if (longitude >= current || longitude < next) return i;
      }
    }
    return 1;
  };

  const computePlanetsByHouse = (): Record<number, string[]> => {
    const houses = (data as any)?.houses || {};
    const planets = (data as any)?.planets || {};
    const res: Record<number, string[]> = {};
    Object.entries(planets).forEach(([key, value]: any) => {
      const lon = value?.longitude;
      if (typeof lon !== 'number') return;
      const h = getHouseForLongitude(lon, houses);
      if (!res[h]) res[h] = [];
      res[h].push(planetRu[key] || key);
    });
    return res;
  };

  const aspectsRaw = ((data as any)?.aspects || []).map((a: any) => ({
    planetA: planetRu[a.planetA] || a.planetA,
    planetB: planetRu[a.planetB] || a.planetB,
    type: aspectRu[a.aspect] || a.aspect,
    orb: a.orb,
    strength: Math.round(((a.strength ?? 0) as number) * 100),
  }));

  const planetsInHouse = computePlanetsByHouse();

  const tabs = [
    { key: 'overview', title: 'Обзор', icon: 'eye-outline' },
    { key: 'planets', title: 'Планеты', icon: 'planet-outline' },
    { key: 'aspects', title: 'Аспекты', icon: 'git-network-outline' },
    { key: 'houses', title: 'Дома', icon: 'home-outline' },
    { key: 'summary', title: 'Резюме', icon: 'star-outline' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Обзор
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Natal Chart Widget */}
            <View style={styles.chartSection}>
              <NatalChartWidget chart={chartData} />
            </View>

            {/* Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Общий обзор</Text>
              <LinearGradient
                colors={['#8B5CF6', '#06B6D4', '#10B981']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="planet"
                  size={40}
                  color="rgba(255, 255, 255, 0.2)"
                  style={styles.planetIcon}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.overviewText}>
                    {interpretation.overview}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Sun Sign */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Солнце</Text>
              <ImageBackground
                source={{ uri: getPlanetImage('Солнце') }}
                style={styles.card}
                imageStyle={styles.cardImage}
              >
                <View style={styles.overlay} />
                <View style={styles.cardContent}>
                  <Text style={styles.planetTitle}>
                    {interpretation.sunSign.planet} в{' '}
                    {interpretation.sunSign.sign}
                  </Text>
                  <Text style={styles.planetText}>
                    {interpretation.sunSign.interpretation}
                  </Text>
                  <View style={styles.keywordsContainer}>
                    <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
                    <Text style={styles.keywordsText}>
                      {interpretation.sunSign.keywords.join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() =>
                      openDetails(
                        {
                          type: 'planet',
                          planet: resolvePlanetKey(
                            interpretation.sunSign.planet
                          ),
                          sign: interpretation.sunSign.sign,
                          locale: 'ru',
                        },
                        `${interpretation.sunSign.planet} в ${interpretation.sunSign.sign} — Подробнее`
                      )
                    }
                  >
                    <Text style={styles.detailsButtonText}>Подробнее</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>

            {/* Moon Sign */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Луна</Text>
              <ImageBackground
                source={{ uri: getPlanetImage('Луна') }}
                style={styles.card}
                imageStyle={styles.cardImage}
              >
                <View style={styles.overlay} />
                <View style={styles.cardContent}>
                  <Text style={styles.planetTitle}>
                    {interpretation.moonSign.planet} в{' '}
                    {interpretation.moonSign.sign}
                  </Text>
                  <Text style={styles.planetText}>
                    {interpretation.moonSign.interpretation}
                  </Text>
                  <View style={styles.keywordsContainer}>
                    <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
                    <Text style={styles.keywordsText}>
                      {interpretation.moonSign.keywords.join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() =>
                      openDetails(
                        {
                          type: 'planet',
                          planet: resolvePlanetKey(
                            interpretation.moonSign.planet
                          ),
                          sign: interpretation.moonSign.sign,
                          locale: 'ru',
                        },
                        `${interpretation.moonSign.planet} в ${interpretation.moonSign.sign} — Подробнее`
                      )
                    }
                  >
                    <Text style={styles.detailsButtonText}>Подробнее</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>

            {/* Ascendant */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Асцендент</Text>
              <ImageBackground
                source={{ uri: getPlanetImage('Асцендент') }}
                style={styles.card}
                imageStyle={styles.cardImage}
              >
                <View style={styles.overlay} />
                <View style={styles.cardContent}>
                  <Text style={styles.planetTitle}>
                    {interpretation.ascendant.planet} в{' '}
                    {interpretation.ascendant.sign}
                  </Text>
                  <Text style={styles.planetText}>
                    {interpretation.ascendant.interpretation}
                  </Text>
                  <View style={styles.keywordsContainer}>
                    <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
                    <Text style={styles.keywordsText}>
                      {interpretation.ascendant.keywords.join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() =>
                      openDetails(
                        {
                          type: 'ascendant',
                          sign: interpretation.ascendant.sign,
                          locale: 'ru',
                        },
                        `Асцендент в ${interpretation.ascendant.sign} — Подробнее`
                      )
                    }
                  >
                    <Text style={styles.detailsButtonText}>Подробнее</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>
          </ScrollView>
        );

      case 1: // Планеты
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Планеты</Text>
              {interpretation.planets.map((planet: any, index: number) => {
                return (
                  <ImageBackground
                    key={index}
                    source={{ uri: getPlanetImage(planet.planet) }}
                    style={styles.card}
                    imageStyle={styles.cardImage}
                  >
                    <View style={styles.overlay} />
                    <View style={styles.cardContent}>
                      <Text style={styles.planetTitle}>
                        {planet.planet} в {planet.sign} (
                        {planet.degree.toFixed(1)}°) ({planet.house} дом)
                      </Text>
                      <Text style={styles.planetText}>
                        {planet.interpretation}
                      </Text>
                      {planet.keywords && planet.keywords.length > 0 && (
                        <View style={styles.keywordsContainer}>
                          <Text style={styles.keywordsTitle}>
                            Ключевые слова:
                          </Text>
                          <Text style={styles.keywordsText}>
                            {planet.keywords.join(', ')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.keywordsContainer}>
                        <Text style={styles.keywordsTitle}>
                          Сильные стороны:
                        </Text>
                        <Text style={styles.keywordsText}>
                          {planet.strengths.join(', ')}
                        </Text>
                      </View>
                      <View style={styles.keywordsContainer}>
                        <Text style={styles.keywordsTitle}>Вызовы:</Text>
                        <Text style={styles.keywordsText}>
                          {planet.challenges.join(', ')}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.detailsButton}
                        onPress={() =>
                          openDetails(
                            {
                              type: 'planet',
                              planet: resolvePlanetKey(planet.planet),
                              sign: planet.sign,
                              locale: 'ru',
                            },
                            `${planet.planet} в ${planet.sign} — Подробнее`
                          )
                        }
                      >
                        <Text style={styles.detailsButtonText}>Подробнее</Text>
                      </TouchableOpacity>
                    </View>
                  </ImageBackground>
                );
              })}
            </View>
          </ScrollView>
        );

      case 2: // Аспекты
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Precise aspects with orb/strength */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Точные аспекты</Text>
              {aspectsRaw.map((asp: any, index: number) => (
                <View key={index} style={styles.card}>
                  <View style={styles.cardContent}>
                    <Text style={styles.aspectTitle}>
                      {asp.planetA} — {asp.type} — {asp.planetB}
                    </Text>

                    <View style={styles.chipRow}>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>
                          Орб:{' '}
                          {typeof asp.orb === 'number'
                            ? asp.orb.toFixed(1)
                            : asp.orb}
                          °
                        </Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>
                          Сила: {asp.strength}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.meter}>
                      <View
                        style={[
                          styles.meterFill,
                          {
                            width: `${Math.min(100, Math.max(0, asp.strength))}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Аспекты</Text>
              {interpretation.aspects.map((aspect: any, index: number) => (
                <LinearGradient
                  key={index}
                  colors={['#FF6B35', '#FF4500', '#DC143C']}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="planet"
                    size={30}
                    color="rgba(255, 255, 255, 0.2)"
                    style={styles.planetIcon}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.aspectTitle}>{aspect.aspect}</Text>
                    <Text style={styles.aspectText}>
                      {aspect.interpretation}
                    </Text>
                    <Text style={styles.significanceText}>
                      {aspect.significance}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </View>
          </ScrollView>
        );

      case 3: // Дома
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Дома</Text>
              {interpretation.houses.map((house: any, index: number) => (
                <LinearGradient
                  key={index}
                  colors={['#32CD32', '#228B22', '#006400']}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="home"
                    size={30}
                    color="rgba(255, 255, 255, 0.2)"
                    style={styles.planetIcon}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.houseTitle}>
                      {house.house} дом в {house.sign}
                    </Text>
                    <Text style={styles.houseArea}>{house.lifeArea}</Text>

                    {planetsInHouse[house.house] &&
                      planetsInHouse[house.house].length > 0 && (
                        <View style={styles.chipRow}>
                          {planetsInHouse[house.house].map(
                            (p: string, i: number) => (
                              <View key={i} style={styles.chip}>
                                <Text style={styles.chipText}>{p}</Text>
                              </View>
                            )
                          )}
                        </View>
                      )}

                    <Text style={styles.houseText}>{house.interpretation}</Text>

                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() =>
                        openDetails(
                          {
                            type: 'house',
                            houseNum: house.house,
                            sign: house.sign,
                            locale: 'ru',
                          },
                          `${house.house} дом в ${house.sign} — Подробнее`
                        )
                      }
                    >
                      <Text style={styles.detailsButtonText}>Подробнее</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
            </View>
          </ScrollView>
        );

      case 4: // Резюме
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Резюме</Text>
              <LinearGradient
                colors={['#FFD700', '#FF69B4', '#8B5CF6']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="star"
                  size={30}
                  color="rgba(255, 255, 255, 0.2)"
                  style={styles.planetIcon}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.summaryTitle}>Черты личности:</Text>
                  <Text style={styles.summaryText}>
                    {interpretation.summary.personalityTraits.join(', ')}
                  </Text>

                  <Text style={styles.summaryTitle}>Жизненные темы:</Text>
                  <Text style={styles.summaryText}>
                    {interpretation.summary.lifeThemes.join(', ')}
                  </Text>

                  <Text style={styles.summaryTitle}>Кармические уроки:</Text>
                  <Text style={styles.summaryText}>
                    {interpretation.summary.karmaLessons.join(', ')}
                  </Text>

                  <Text style={styles.summaryTitle}>Таланты:</Text>
                  <Text style={styles.summaryText}>
                    {interpretation.summary.talents.join(', ')}
                  </Text>

                  <Text style={styles.summaryTitle}>Рекомендации:</Text>
                  {interpretation.summary.recommendations.map(
                    (rec: string, index: number) => (
                      <Text key={index} style={styles.recommendationText}>
                        • {rec}
                      </Text>
                    )
                  )}
                </View>
              </LinearGradient>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />

      {/* Header - outside animation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Натальная карта</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs - outside animation */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => setActiveTab(index)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === index ? '#8B5CF6' : '#B0B0B0'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === index && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content - with animation */}
      <Animated.View style={[styles.tabContent, animatedContainerStyle]}>
        {renderTabContent()}
      </Animated.View>

      {/* Подробнее Modal */}
      <Modal
        visible={detailsVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{detailsTitle}</Text>
            {detailsLoading ? (
              <Text style={styles.modalLine}>Загрузка...</Text>
            ) : (
              <ScrollView>
                {detailsLines && detailsLines.length > 0 ? (
                  detailsLines.map((line, idx) => (
                    <Text key={idx} style={styles.modalLine}>
                      {line}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.modalLine}>Детали отсутствуют</Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeDetails}
            >
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  placeholder: {
    width: 44,
  },
  chartSection: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 12,
    padding: 8,
  },
  planetIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.3,
  },
  cardImage: {
    borderRadius: 16,
  },
  overlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  planetPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: '38%',
    opacity: 0.25,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  overviewText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  planetTitle: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planetText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  keywordsContainer: {
    marginBottom: 10,
  },
  keywordsTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  keywordsText: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
  },
  aspectTitle: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aspectText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  significanceText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontStyle: 'italic',
  },
  houseTitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  houseArea: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  houseTheme: {
    color: '#B0B0B0',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  houseRuling: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  houseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  summaryTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  recommendationText: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Tab styles
  tabsContainer: {
    marginBottom: 20,
    marginHorizontal: -20, // Compensate for content padding
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
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
  tabContent: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  meter: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },

  // "Подробнее" button
  detailsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  detailsButtonText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    padding: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalLine: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  modalCloseButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default NatalChartScreen;
