import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { chartAPI } from '../services/api/chart.client';
import CosmicBackground from '../components/CosmicBackground';
import LoadingLogo from '../components/LoadingLogo';
import NatalChartWidget from '../components/NatalChartWidget';
import Card from '../components/ui/Card';
import PlanetIcon from '../components/PlanetIcon';
import { colors } from '../theme/tokens';
import PlanetCard from '../components/PlanetCard';
import { ROUTES } from '../navigation/routes';
import { getPlanetImageSource, getPlanetImageUri } from '../assets/planets';

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

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({ navigation }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [horoscopes, setHoroscopes] = useState<any | null>(null);
  const [activePeriod, setActivePeriod] = useState<
    'today' | 'tomorrow' | 'week' | 'month'
  >('today');

  const loadHoroscopes = async () => {
    try {
      const data = await chartAPI.getAllHoroscopes();
      setHoroscopes(data);
    } catch (error) {
      console.error('Ошибка загрузки гороскопов:', error);
    }
  };

  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    loadChartData();
    loadHoroscopes();
    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadChartData(), loadHoroscopes()]);
    } finally {
      setRefreshing(false);
    }
  };

  const prefetchPlanetImages = async (chart: any) => {
    try {
      const urls: string[] = [];

      // Top sections (prefetch remote URIs only)
      urls.push(getPlanetImageUri('Солнце'));
      urls.push(getPlanetImageUri('Луна'));
      urls.push(getPlanetImageUri('Асцендент'));

      // Planets list
      const list =
        chart?.data?.interpretation?.planets ??
        chart?.interpretation?.planets ??
        [];
      for (const p of list) {
        urls.push(getPlanetImageUri(p.planet));
      }

      const unique = Array.from(new Set(urls));
      await Promise.all(
        unique.map((u) => {
          if (u) {
            return Image.prefetch(u).catch(() => null);
          }
          return null;
        })
      );
    } catch {
      // ignore prefetch errors
    }
  };

  const loadChartData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      setChartData(data);
      // Prefetch planet images to reduce flicker
      await prefetchPlanetImages(data);
    } catch (error: any) {
      console.error('Error loading natal chart:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить натальную карту');
    } finally {
      if (!refreshing) setLoading(false);
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

  const goToFullChart = () => {
    navigation.navigate(ROUTES.CHART_STACK.MY_CHART);
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

  // Map localized planet names to PlanetIcon keys
  const planetKeyFromName = (n: string) => {
    const map: Record<string, string> = {
      Солнце: 'sun',
      Луна: 'moon',
      Меркурий: 'mercury',
      Венера: 'venus',
      Марс: 'mars',
      Юпитер: 'jupiter',
      Сатурн: 'saturn',
      Уран: 'uranus',
      Нептун: 'neptune',
      Плутон: 'pluto',
    };
    return map[n] || n;
  };

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

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      >
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header */}
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

          {/* Header Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={goToFullChart}
            >
              <Ionicons name="planet" size={16} color="#fff" />
              <Text style={styles.actionText}>Полная карта</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#8B5CF6" />
              <Text style={[styles.actionText, { color: '#8B5CF6' }]}>
                Обновить
              </Text>
            </TouchableOpacity>
          </View>

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
            <PlanetCard
              title={`${interpretation.sunSign.planet} в ${interpretation.sunSign.sign}`}
              imageSource={getPlanetImageSource('Солнце')}
              interpretation={interpretation.sunSign.interpretation}
              strengths={interpretation.sunSign.strengths}
              challenges={interpretation.sunSign.challenges}
              planetKey={planetKeyFromName(interpretation.sunSign.planet)}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.sunSign.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Moon Sign */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Луна</Text>
            <PlanetCard
              title={`${interpretation.moonSign.planet} в ${interpretation.moonSign.sign}`}
              imageSource={getPlanetImageSource('Луна')}
              interpretation={interpretation.moonSign.interpretation}
              strengths={interpretation.moonSign.strengths}
              challenges={interpretation.moonSign.challenges}
              planetKey={planetKeyFromName(interpretation.moonSign.planet)}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.moonSign.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Ascendant */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Асцендент</Text>
            <PlanetCard
              title={`${interpretation.ascendant.planet} в ${interpretation.ascendant.sign}`}
              imageSource={getPlanetImageSource('Асцендент')}
              interpretation={interpretation.ascendant.interpretation}
              strengths={interpretation.ascendant.strengths}
              challenges={interpretation.ascendant.challenges}
            />
            <View style={styles.keywordsContainer}>
              <Text style={styles.keywordsTitle}>Ключевые слова:</Text>
              <Text style={styles.keywordsText}>
                {interpretation.ascendant.keywords.join(', ')}
              </Text>
            </View>
          </View>

          {/* Planets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Планеты</Text>
            {interpretation.planets.map((p: any, index: number) => (
              <PlanetCard
                key={index}
                title={`${p.planet} в ${p.sign}`}
                imageSource={getPlanetImageSource(p.planet)}
                interpretation={p.interpretation}
                strengths={p.strengths}
                challenges={p.challenges}
                planetKey={planetKeyFromName(p.planet)}
                house={p.house}
              />
            ))}
          </View>

          {/* Aspects */}
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
                  <Text style={styles.aspectText}>{aspect.interpretation}</Text>
                  <Text style={styles.significanceText}>
                    {aspect.significance}
                  </Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* Houses */}
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
                  <Text style={styles.houseText}>{house.interpretation}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* Summary */}
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

          {/* Horoscope */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Гороскоп</Text>

            {horoscopes?.isPremium ? (
              <View style={styles.premiumBadge}>
                <Ionicons name="sparkles" size={14} color="#FFD700" />
                <Text style={styles.premiumText}>Premium интерпретация</Text>
              </View>
            ) : null}

            <View style={styles.horoscopeTabRow}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activePeriod === 'today' && styles.tabButtonActive,
                ]}
                onPress={() => setActivePeriod('today')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activePeriod === 'today' && styles.tabTextActive,
                  ]}
                >
                  Сегодня
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activePeriod === 'tomorrow' && styles.tabButtonActive,
                ]}
                onPress={() => setActivePeriod('tomorrow')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activePeriod === 'tomorrow' && styles.tabTextActive,
                  ]}
                >
                  Завтра
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activePeriod === 'week' && styles.tabButtonActive,
                ]}
                onPress={() => setActivePeriod('week')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activePeriod === 'week' && styles.tabTextActive,
                  ]}
                >
                  Неделя
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activePeriod === 'month' && styles.tabButtonActive,
                ]}
                onPress={() => setActivePeriod('month')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activePeriod === 'month' && styles.tabTextActive,
                  ]}
                >
                  Месяц
                </Text>
              </TouchableOpacity>
            </View>

            {horoscopes && horoscopes[activePeriod] && (
              <Card elevation="sm" style={{ marginTop: 12 }}>
                <Text style={styles.summaryTitle}>Общее:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.general || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Любовь:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.love || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Карьера:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.career || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Здоровье:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.health || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Финансы:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.finance || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Совет:</Text>
                <Text style={styles.summaryText}>
                  {horoscopes[activePeriod]?.advice || '—'}
                </Text>

                <Text style={styles.summaryTitle}>Счастливые числа:</Text>
                <View style={styles.chipRow}>
                  {horoscopes[activePeriod]?.luckyNumbers?.map(
                    (n: number, i: number) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.badgeText}>{n}</Text>
                      </View>
                    )
                  )}
                </View>

                <Text style={styles.summaryTitle}>Счастливые цвета:</Text>
                <View style={styles.chipRow}>
                  {horoscopes[activePeriod]?.luckyColors?.map(
                    (c: string, i: number) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.summaryText}>{c}</Text>
                      </View>
                    )
                  )}
                </View>
              </Card>
            )}
          </View>
        </Animated.View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 8,
  },
  houseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
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
  planetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  houseBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.10)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  horoscopeTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  tabText: {
    color: '#B0B0B0',
    fontWeight: '600',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  actionPrimary: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 12,
  },
});

export default NatalChartScreen;
