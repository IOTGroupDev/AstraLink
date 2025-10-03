import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  SlideInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { chartAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Chart, TransitsResponse } from '../types/chart';
import AnimatedStars from '../components/AnimatedStars';
import AstrologicalChart from '../components/AstrologicalChart';
import PlanetIcon from '../components/PlanetIcon';
import EnergyIndicator from '../components/EnergyIndicator';
import Biorhythms from '../components/Biorhythms';
import ShimmerLoader from '../components/ShimmerLoader';
import SolarSystem from '../components/SolarSystem';
import HoroscopeWidget from '../components/HoroscopeWidget';
import { LunarCalendarWidget } from '../components/LunarCalendarWidget';

const { width, height } = Dimensions.get('window');

const MyChartScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [chart, setChart] = useState<Chart | null>(null);
  const [transits, setTransits] = useState<TransitsResponse | null>(null);
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biorhythms, setBiorhythms] = useState<{
    physical: number;
    emotional: number;
    intellectual: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!isAuthenticated) {
        console.log('❌ Пользователь не авторизован, перенаправление на вход');
        navigation.navigate('Login' as never);
        return;
      }

      try {
        console.log('🔍 Загружаю реальные данные карты...');

        const [chartData, transitsData, planetsData] = await Promise.all([
          chartAPI.getNatalChart(),
          chartAPI.getTransits(
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          ),
          chartAPI.getCurrentPlanets(),
        ]);

        console.log('✅ Получены реальные данные карты:', chartData);
        console.log('✅ Получены реальные транзиты:', transitsData);
        console.log('✅ Получены текущие планеты:', planetsData);

        setChart(chartData);
        setTransits(transitsData);
        setCurrentPlanets(planetsData.planets);

        //Реальные биоритмы с backend (Swiss Ephemeris JD)
        try {
          const b = await chartAPI.getBiorhythms();
          setBiorhythms({
            physical: b.physical,
            emotional: b.emotional,
            intellectual: b.intellectual,
          });
        } catch (e) {
          console.error('Ошибка загрузки биоритмов:', e);
        }
      } catch (error) {
        console.error('Error loading real chart data:', error);

        if (error.response?.status === 401) {
          console.log(
            '🔄 Перенаправление на страницу входа из-за отсутствия токена'
          );
          navigation.navigate('Login' as never);
          return;
        }

        if (error.response?.status === 404) {
          console.log('Chart not found, creating new chart');
          try {
            const newChart = await chartAPI.createNatalChart({});
            setChart(newChart);
            console.log('Chart created successfully');
          } catch (createError) {
            console.error('Error creating chart:', createError);
            Alert.alert(
              'Необходимо создать натальную карту',
              'Пожалуйста, заполните данные о рождении в профиле для создания астрологической карты.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadAllPredictions = async () => {
    try {
      console.log('🔮 Загружаю прогнозы...');

      const [dayResponse, tomorrowResponse, weekResponse] = await Promise.all([
        chartAPI.getHoroscope('day'),
        chartAPI.getHoroscope('tomorrow'),
        chartAPI.getHoroscope('week'),
      ]);

      console.log('✅ Получены прогнозы:', {
        day: dayResponse,
        tomorrow: tomorrowResponse,
        week: weekResponse,
      });

      const extractPredictions = (response: any) => {
        if (response.predictions && typeof response.predictions === 'object') {
          return response.predictions;
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
        };
      };

      const newPredictions = {
        day: extractPredictions(dayResponse),
        tomorrow: extractPredictions(tomorrowResponse),
        week: extractPredictions(weekResponse),
      };

      console.log('🔮 Устанавливаю прогнозы:', newPredictions);
      setPredictions(newPredictions);
    } catch (error) {
      console.error('❌ Ошибка загрузки прогнозов:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось загрузить прогнозы. Попробуйте обновить страницу.',
        [{ text: 'OK' }]
      );
    }
  };

  // Вычисление биоритмов на основе даты рождения (реальные данные, без моков)
  const computeBiorhythms = (
    birthDateISO: string
  ): {
    physical: number;
    emotional: number;
    intellectual: number;
  } => {
    try {
      const birth = new Date(birthDateISO);
      const today = new Date();
      const days =
        Math.floor(
          (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
        ) || 0;

      const cycle = (period: number) =>
        Math.round(((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100);

      return {
        physical: Math.min(100, Math.max(0, cycle(23))),
        emotional: Math.min(100, Math.max(0, cycle(28))),
        intellectual: Math.min(100, Math.max(0, cycle(33))),
      };
    } catch (_e) {
      return { physical: 0, emotional: 0, intellectual: 0 };
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (currentPlanets && chart) {
      console.log('🚀 Вызываю loadAllPredictions...');
      loadAllPredictions();
    }
  }, [currentPlanets, chart]);

  // Обновляем биоритмы при наличии даты рождения в карте
  useEffect(() => {
    const birthISO =
      (chart as any)?.data?.birthDate || (chart as any)?.data?.birth_date;
    if (birthISO) {
      setBiorhythms(computeBiorhythms(birthISO));
    }
  }, [chart]);

  const getCurrentEnergy = () => {
    if (!chart?.data?.aspects) return null;

    let energy = 50;
    const aspectCount = chart.data.aspects.length;
    energy += aspectCount * 2;

    const harmoniousAspects = chart.data.aspects.filter((aspect) =>
      ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
    );

    const harmonyBonus = harmoniousAspects.reduce(
      (sum, aspect) => sum + (aspect.strength || 0.5) * 15,
      0
    );

    energy += harmonyBonus;

    return Math.min(100, Math.max(0, Math.round(energy)));
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

      const planetNames = {
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

      const aspectNames = {
        conjunction: 'соединении',
        opposition: 'оппозиции',
        trine: 'тригоне',
        square: 'квадрате',
        sextile: 'секстиле',
      };

      const planetA =
        planetNames[strongestAspect.planetA] || strongestAspect.planetA;
      const planetB =
        planetNames[strongestAspect.planetB] || strongestAspect.planetB;
      const aspect =
        aspectNames[strongestAspect.aspect] || strongestAspect.aspect;

      return {
        name: planetA,
        aspect: strongestAspect.aspect,
        targetPlanet: planetB,
        strength: strongestAspect.strength,
        description: `${planetA} в ${aspect} с ${planetB}`,
      };
    }

    if (transits && transits.transits && transits.transits.length > 0) {
      const mainTransit = transits.transits[0];
      return {
        name: mainTransit.planet,
        sign: mainTransit.sign,
        degree: mainTransit.degree,
        house: mainTransit.house,
        aspect: mainTransit.aspect,
        description: mainTransit.description,
      };
    }

    return null;
  };

  const getDailyAdvice = () => {
    const energy = getCurrentEnergy();

    if (!energy) return null;

    if (energy > 80) {
      return 'Сегодня отличный день для новых начинаний! Ваша энергия на пике.';
    } else if (energy > 60) {
      return 'Хорошее время для планирования и реализации текущих проектов.';
    } else if (energy > 40) {
      return 'День для размышлений и внутренней работы. Отдохните и восстановите силы.';
    } else {
      return 'Время для медитации и восстановления. Слушайте свой внутренний голос.';
    }
  };

  if (authLoading || loading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f0f23']}
        style={styles.container}
      >
        <AnimatedStars />
        <ScrollView contentContainerStyle={styles.loadingContent}>
          <Animated.View
            entering={FadeIn.delay(200)}
            style={styles.loadingHeader}
          >
            <ShimmerLoader width={200} height={40} borderRadius={20} />
            <ShimmerLoader width={150} height={20} borderRadius={10} />
          </Animated.View>

          <Animated.View
            entering={SlideInUp.delay(400)}
            style={styles.loadingCards}
          >
            <ShimmerLoader width="100%" height={120} borderRadius={15} />
            <ShimmerLoader width="100%" height={100} borderRadius={15} />
            <ShimmerLoader width="100%" height={80} borderRadius={15} />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Если пользователь не авторизован, не показываем экран
  if (!isAuthenticated) {
    return null;
  }

  const energy = getCurrentEnergy();
  const mainTransit = getMainTransit();
  const dailyAdvice = getDailyAdvice();

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f0f23']}
      style={styles.container}
    >
      <AnimatedStars />
      <AstrologicalChart />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <Ionicons name="planet" size={60} color="#8B5CF6" />
          <Text style={styles.title}>Моя Карта</Text>
          <Text style={styles.subtitle}>Астрологический дашборд</Text>
          {currentPlanets && (
            <Text style={styles.planetsInfo}>
              Позиции на{' '}
              {currentPlanets.date
                ? new Date(currentPlanets.date).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : new Date().toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
            </Text>
          )}
        </Animated.View>

        {currentPlanets && (
          <Animated.View entering={SlideInUp.delay(300)}>
            <View style={styles.lunarCalendarContainer}>
              <LunarCalendarWidget />
            </View>
          </Animated.View>
        )}

        {/* Solar System Widget */}
        {currentPlanets && (
          <Animated.View
            entering={SlideInUp.delay(300)}
            style={styles.solarSystemWidget}
          >
            <Text style={styles.widgetTitle}>Текущее положение планет</Text>
            <View style={styles.solarSystemContainer}>
              <SolarSystem
                currentPlanets={currentPlanets}
                isLoading={loading}
              />
            </View>
          </Animated.View>
        )}

        {/* Energy Card */}
        {energy !== null && (
          <Animated.View
            entering={SlideInUp.delay(400)}
            style={styles.energyCard}
          >
            <View style={styles.energyHeader}>
              <Text style={styles.cardTitle}>Энергия дня</Text>
              {dailyAdvice && (
                <Text style={styles.energyAdvice}>{dailyAdvice}</Text>
              )}
            </View>
            <View style={styles.energyContent}>
              <EnergyIndicator energy={energy} />
              <View style={styles.energyDetails}>
                <Text style={styles.energyLevel}>
                  {energy > 80
                    ? 'Высокая'
                    : energy > 60
                      ? 'Хорошая'
                      : energy > 40
                        ? 'Средняя'
                        : 'Низкая'}
                </Text>
                <Text style={styles.energyDescription}>
                  {energy > 80
                    ? 'Отличное время для активных действий'
                    : energy > 60
                      ? 'Хорошее время для планирования'
                      : energy > 40
                        ? 'Время для размышлений'
                        : 'Время для отдыха и восстановления'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Main Transit Card */}
        <Animated.View
          entering={SlideInUp.delay(600)}
          style={styles.transitCard}
        >
          <Text style={styles.cardTitle}>Главный транзит</Text>
          {mainTransit ? (
            <View style={styles.transitContent}>
              <PlanetIcon planetName={mainTransit.name} size={40} />
              <View style={styles.transitInfo}>
                <Text style={styles.planetName}>{mainTransit.description}</Text>
                {mainTransit.strength && (
                  <Text style={styles.planetSign}>
                    Сила: {Math.round((mainTransit.strength || 0) * 100)}%
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>Нет данных о транзитах</Text>
          )}
        </Animated.View>

        {/* Horoscope Widget */}
        <HoroscopeWidget
          predictions={predictions}
          currentPlanets={currentPlanets}
          isLoading={loading || !predictions || !currentPlanets}
        />

        {/* Разделитель */}
        <View style={styles.divider} />

        {/* Widgets */}
        <Animated.View
          entering={SlideInRight.delay(1000)}
          style={styles.widgetsContainer}
        >
          <Text style={styles.widgetsTitle}>🌟 Астрологические виджеты 🌟</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.widgetsScroll}
          >
            {/* Sun Sign Widget */}
            {chart?.data?.planets?.sun?.sign && (
              <View style={styles.widget}>
                <Ionicons name="sunny" size={30} color="#FFD700" />
                <Text style={styles.widgetLabel}>Солнце</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.sun.sign}
                </Text>
              </View>
            )}

            {/* Moon Sign Widget */}
            {chart?.data?.planets?.moon?.sign && (
              <View style={styles.widget}>
                <Ionicons name="moon" size={30} color="#C0C0C0" />
                <Text style={styles.widgetLabel}>Луна</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.moon.sign}
                </Text>
              </View>
            )}

            {/* Ascendant Widget */}
            {chart?.data?.houses?.[1]?.sign && (
              <View style={styles.widget}>
                <Ionicons name="trending-up" size={30} color="#8B5CF6" />
                <Text style={styles.widgetLabel}>Асцендент</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.houses[1].sign}
                </Text>
              </View>
            )}

            {/* Venus Widget */}
            {chart?.data?.planets?.venus?.sign && (
              <View style={styles.widget}>
                <Ionicons name="heart" size={30} color="#FFC649" />
                <Text style={styles.widgetLabel}>Венера</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.venus.sign}
                </Text>
              </View>
            )}

            {/* Mars Widget */}
            {chart?.data?.planets?.mars?.sign && (
              <View style={styles.widget}>
                <Ionicons name="fitness" size={30} color="#C1440E" />
                <Text style={styles.widgetLabel}>Марс</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.mars.sign}
                </Text>
              </View>
            )}

            {/* Jupiter Widget */}
            {chart?.data?.planets?.jupiter?.sign && (
              <View style={styles.widget}>
                <Ionicons name="leaf" size={30} color="#D8CA9D" />
                <Text style={styles.widgetLabel}>Юпитер</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.jupiter.sign}
                </Text>
              </View>
            )}

            {/* Saturn Widget */}
            {chart?.data?.planets?.saturn?.sign && (
              <View style={styles.widget}>
                <Ionicons name="time" size={30} color="#FAD5A5" />
                <Text style={styles.widgetLabel}>Сатурн</Text>
                <Text style={styles.widgetValue}>
                  {chart.data.planets.saturn.sign}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Biorhythms Widget */}
          {chart?.data && (
            <View style={styles.biorhythmsRow}>
              <View style={styles.biorhythmsWidget}>
                {biorhythms ? (
                  <Biorhythms
                    physical={biorhythms.physical}
                    emotional={biorhythms.emotional}
                    intellectual={biorhythms.intellectual}
                    size={100}
                  />
                ) : (
                  <ShimmerLoader
                    width={width - 80}
                    height={100}
                    borderRadius={20}
                  />
                )}
                <Text style={styles.widgetLabel}>Биоритмы</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80,
  },
  loadingContent: {
    padding: 20,
    paddingTop: 60,
  },
  loadingHeader: {
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  loadingCards: {
    gap: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  energyCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  transitCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  transitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitInfo: {
    marginLeft: 15,
    alignItems: 'center',
  },
  planetName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  planetSign: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  noDataText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.6,
    textAlign: 'center',
  },
  divider: {
    height: 20,
    width: '100%',
  },
  widgetsContainer: {
    marginTop: 10,
    marginBottom: 20,
    zIndex: 1,
  },
  widgetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
    marginTop: 5,
  },
  widgetsScroll: {
    flexDirection: 'row',
  },
  widget: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  widgetLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
    marginTop: 8,
  },
  widgetValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  biorhythmsRow: {
    marginTop: 15,
    alignItems: 'center',
  },
  biorhythmsWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: width - 40,
    minHeight: 120,
  },
  solarSystemWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(139, 92, 246, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  lunarCalendarContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  solarSystemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    overflow: 'hidden',
  },
  planetsInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  energyHeader: {
    marginBottom: 15,
  },
  energyAdvice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  energyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  energyDetails: {
    flex: 1,
    marginLeft: 15,
  },
  energyLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 5,
  },
  energyDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
});

export default MyChartScreen;
