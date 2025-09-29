import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  SlideInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { chartAPI, getStoredToken } from '../services/api';
import { Chart, TransitsResponse } from '../types/chart';
import AnimatedStars from '../components/AnimatedStars';
import AstrologicalChart from '../components/AstrologicalChart';
import PlanetIcon from '../components/PlanetIcon';
import EnergyIndicator from '../components/EnergyIndicator';
import MoonPhase from '../components/MoonPhase';
import Biorhythms from '../components/Biorhythms';
import ShimmerLoader from '../components/ShimmerLoader';
import SolarSystem from '../components/SolarSystem';
import HoroscopeWidget from '../components/HoroscopeWidget';

const { width, height } = Dimensions.get('window');

const MyChartScreen: React.FC = () => {
  const navigation = useNavigation();
  const [chart, setChart] = useState<Chart | null>(null);
  const [transits, setTransits] = useState<TransitsResponse | null>(null);
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Проверяем, есть ли токен
      const token = await getStoredToken();
      if (!token) {
        console.log('❌ Токен не найден, требуется авторизация');
        // Перенаправляем на страницу входа
        navigation.navigate('Login');
        return;
      }

      // Для авторизованных пользователей - реальные API вызовы
      try {
        console.log(
          '🔍 Загружаю реальные данные карты для токена:',
          token.substring(0, 20) + '...'
        );

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
        console.log('🔍 Структура chartData:', {
          hasPlanets: !!chartData.planets,
          planetsType: typeof chartData.planets,
          planetsValue: chartData.planets,
          hasData: !!chartData.data,
          dataType: typeof chartData.data,
          dataValue: chartData.data,
        });

        setChart(chartData);
        setTransits(transitsData);
        setCurrentPlanets(planetsData.planets);
      } catch (error) {
        console.error('Error loading real chart data:', error);
        // Если нет данных профиля или карты не создана, создаем автоматически
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
      console.log('🔍 Текущее состояние:', {
        chart: !!chart,
        currentPlanets: !!currentPlanets,
      });

      const [dayPredictions, tomorrowPredictions, weekPredictions] =
        await Promise.all([
          chartAPI.getPredictions('day'),
          chartAPI.getPredictions('tomorrow'),
          chartAPI.getPredictions('week'),
        ]);

      console.log('✅ Получены прогнозы:', {
        day: dayPredictions,
        tomorrow: tomorrowPredictions,
        week: weekPredictions,
      });

      const newPredictions = {
        day: dayPredictions.predictions || {},
        tomorrow: tomorrowPredictions.predictions || {},
        week: weekPredictions.predictions || {},
      };

      console.log('🔮 Устанавливаю прогнозы:', newPredictions);
      setPredictions(newPredictions);
    } catch (error) {
      console.error('❌ Ошибка загрузки прогнозов:', error);
      // Устанавливаем пустые прогнозы при ошибке
      setPredictions({
        day: { general: 'Ошибка загрузки прогноза на сегодня' },
        tomorrow: { general: 'Ошибка загрузки прогноза на завтра' },
        week: { general: 'Ошибка загрузки прогноза на неделю' },
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    console.log('🔍 useEffect для loadAllPredictions:', {
      currentPlanets: !!currentPlanets,
      chart: !!chart,
      predictions: !!predictions,
    });
    if (currentPlanets && chart) {
      console.log('🚀 Вызываю loadAllPredictions...');
      loadAllPredictions();
    }
  }, [currentPlanets, chart]);

  const getCurrentEnergy = () => {
    if (!chart) return 75;

    // Для реальных данных карты используем аспекты из chart.data.aspects
    if (chart.data && chart.data.aspects) {
      let energy = 50;
      const aspectCount = chart.data.aspects.length;
      energy += aspectCount * 2;

      // Добавляем бонус за гармоничные аспекты и их силу
      const harmoniousAspects = chart.data.aspects.filter((aspect) =>
        ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
      );

      const harmonyBonus = harmoniousAspects.reduce(
        (sum, aspect) => sum + (aspect.strength || 0.5) * 15,
        0
      );

      energy += harmonyBonus;

      return Math.min(100, Math.max(0, Math.round(energy)));
    }

    // Fallback для старого формата
    if (transits && transits.transits && transits.transits.length > 0) {
      let energy = 50;
      const transitCount = transits.transits.length;
      energy += transitCount * 5;

      const harmoniousAspects = transits.transits.filter((transit) =>
        ['trine', 'sextile', 'conjunction'].includes(transit.aspect || '')
      ).length;
      energy += harmoniousAspects * 10;

      return Math.min(100, Math.max(0, energy));
    }

    return 75; // Дефолтное значение
  };

  const getMainTransit = () => {
    console.log('🔍 getMainTransit - chart:', !!chart);
    console.log('🔍 getMainTransit - chart.data:', !!chart?.data);
    console.log(
      '🔍 getMainTransit - aspects:',
      chart?.data?.aspects?.length || 0
    );
    console.log('🔍 getMainTransit - transits:', !!transits);

    // Для реальных данных используем самый сильный аспект из натальной карты
    if (
      chart &&
      chart.data &&
      chart.data.aspects &&
      chart.data.aspects.length > 0
    ) {
      // Находим самый сильный аспект
      const strongestAspect = chart.data.aspects.reduce((strongest, current) =>
        (current.strength || 0) > (strongest.strength || 0)
          ? current
          : strongest
      );

      console.log('✅ Найден сильнейший аспект:', strongestAspect);

      // Переводим названия планет на русский
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

    // Fallback для старого формата транзитов
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

    console.log('❌ Нет данных для главного транзита');
    return null;
  };

  const getDailyAdvice = () => {
    const energy = getCurrentEnergy();
    const mainTransit = getMainTransit();

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

  if (loading) {
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
        <Animated.View
          entering={SlideInUp.delay(400)}
          style={styles.energyCard}
        >
          <View style={styles.energyHeader}>
            <Text style={styles.cardTitle}>Энергия дня</Text>
            <Text style={styles.energyAdvice}>{getDailyAdvice()}</Text>
          </View>
          <View style={styles.energyContent}>
            <EnergyIndicator energy={getCurrentEnergy()} />
            <View style={styles.energyDetails}>
              <Text style={styles.energyLevel}>
                {getCurrentEnergy() > 80
                  ? 'Высокая'
                  : getCurrentEnergy() > 60
                    ? 'Хорошая'
                    : getCurrentEnergy() > 40
                      ? 'Средняя'
                      : 'Низкая'}
              </Text>
              <Text style={styles.energyDescription}>
                {getCurrentEnergy() > 80
                  ? 'Отличное время для активных действий'
                  : getCurrentEnergy() > 60
                    ? 'Хорошее время для планирования'
                    : getCurrentEnergy() > 40
                      ? 'Время для размышлений'
                      : 'Время для отдыха и восстановления'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Main Transit Card */}
        <Animated.View
          entering={SlideInUp.delay(600)}
          style={styles.transitCard}
        >
          <Text style={styles.cardTitle}>Главный транзит</Text>
          {getMainTransit() ? (
            <View style={styles.transitContent}>
              <PlanetIcon planetName={getMainTransit()!.name} size={40} />
              <View style={styles.transitInfo}>
                <Text style={styles.planetName}>
                  {getMainTransit()!.description}
                </Text>
                {getMainTransit()!.strength && (
                  <Text style={styles.planetSign}>
                    Сила: {Math.round((getMainTransit()!.strength || 0) * 100)}%
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>Загрузка аспектов...</Text>
          )}
        </Animated.View>

        {/* Horoscope Widget - Overlay */}
        <HoroscopeWidget
          predictions={predictions}
          currentPlanets={currentPlanets}
          isLoading={loading || !predictions || !currentPlanets}
        />

        {/* Daily Advice Card */}
        <Animated.View
          entering={SlideInUp.delay(800)}
          style={styles.adviceCard}
        >
          <Text style={styles.cardTitle}>Совет дня</Text>
          <View style={styles.scrollContainer}>
            <Text style={styles.adviceText}>{getDailyAdvice()}</Text>
          </View>
        </Animated.View>

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
            <View style={styles.widget}>
              <Ionicons name="sunny" size={30} color="#FFD700" />
              <Text style={styles.widgetLabel}>Солнце</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.sun?.sign || 'Лев'}
              </Text>
            </View>

            {/* Moon Sign Widget */}
            <View style={styles.widget}>
              <Ionicons name="moon" size={30} color="#C0C0C0" />
              <Text style={styles.widgetLabel}>Луна</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.moon?.sign || 'Рак'}
              </Text>
            </View>

            {/* Ascendant Widget */}
            <View style={styles.widget}>
              <Ionicons name="trending-up" size={30} color="#8B5CF6" />
              <Text style={styles.widgetLabel}>Асцендент</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.houses?.[1]?.sign || 'Овен'}
              </Text>
            </View>

            {/* Venus Widget */}
            <View style={styles.widget}>
              <Ionicons name="heart" size={30} color="#FFC649" />
              <Text style={styles.widgetLabel}>Венера</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.venus?.sign || 'Лев'}
              </Text>
            </View>

            {/* Mars Widget */}
            <View style={styles.widget}>
              <Ionicons name="fitness" size={30} color="#C1440E" />
              <Text style={styles.widgetLabel}>Марс</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.mars?.sign || 'Скорпион'}
              </Text>
            </View>

            {/* Moon Phase Widget */}
            <View style={styles.widget}>
              <MoonPhase phase={0.3} size={40} />
              <Text style={styles.widgetLabel}>Фаза Луны</Text>
              <Text style={styles.widgetValue}>Растущая</Text>
            </View>

            {/* Jupiter Widget */}
            <View style={styles.widget}>
              <Ionicons name="leaf" size={30} color="#D8CA9D" />
              <Text style={styles.widgetLabel}>Юпитер</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.jupiter?.sign || 'Рыбы'}
              </Text>
            </View>

            {/* Mercury Retrograde Widget */}
            <View style={styles.widget}>
              <Ionicons name="swap-horizontal" size={30} color="#8C7853" />
              <Text style={styles.widgetLabel}>Меркурий</Text>
              <Text style={styles.widgetValue}>Прямой</Text>
            </View>

            {/* Saturn Widget */}
            <View style={styles.widget}>
              <Ionicons name="time" size={30} color="#FAD5A5" />
              <Text style={styles.widgetLabel}>Сатурн</Text>
              <Text style={styles.widgetValue}>
                {chart?.data?.planets?.saturn?.sign || 'Козерог'}
              </Text>
            </View>
          </ScrollView>

          {/* Biorhythms Widget - отдельная строка */}
          <View style={styles.biorhythmsRow}>
            <View style={styles.biorhythmsWidget}>
              <Biorhythms
                physical={75}
                emotional={60}
                intellectual={85}
                size={60}
              />
              <Text style={styles.widgetLabel}>Биоритмы</Text>
            </View>
          </View>
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
    paddingBottom: 80, // Увеличиваем отступ для нижнего меню
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
    padding: 15, // Уменьшил padding
    marginHorizontal: 15, // Добавил горизонтальные отступы
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
  adviceCard: {
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
  scrollContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adviceText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
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
  noDataText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
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
