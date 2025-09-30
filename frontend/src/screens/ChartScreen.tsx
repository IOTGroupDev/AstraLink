import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

import { chartAPI } from '../services/api';
import AnimatedStars from '../components/AnimatedStars';
import ShimmerLoader from '../components/ShimmerLoader';

import HoroscopeWidget from '../components/HoroscopeWidget';
interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  distance: number;
  sign: string;
  degree: number;
}

interface TransitData {
  planet: string;
  aspect: string;
  target: string;
  date: string;
  description: string;
}

interface HoroscopeData {
  period: string;
  date: string;
  predictions: {
    general: string;
    love: string;
    career: string;
    health: string;
    advice: string;
  };
  currentPlanets: any;
}

export default function ChartScreen() {
  const [natalChart, setNatalChart] = useState<any>(null);
  const [currentPlanets, setCurrentPlanets] = useState<PlanetPosition[]>([]);
  const [transits, setTransits] = useState<TransitData[]>([]);
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [loading, setLoading] = useState({
    natal: false,
    planets: false,
    transits: false,
    horoscope: false,
  });
  const [activeTab, setActiveTab] = useState<
    'natal' | 'transits' | 'horoscope'
  >('natal');

  useEffect(() => {
    // Принудительно сбрасываем состояние загрузки
    setLoading({
      natal: false,
      planets: false,
      transits: false,
      horoscope: false,
    });

    loadNatalChart();
    loadCurrentPlanets();
    loadTransits();
    loadHoroscope();
  }, []);

  const loadNatalChart = async () => {
    setLoading((prev) => ({ ...prev, natal: true }));
    try {
      const chart = await chartAPI.getNatalChart();
      console.log('Натальная карта загружена:', chart);
      setNatalChart(chart);
    } catch (error) {
      console.error('Ошибка загрузки натальной карты:', error);

      // Если натальная карта не найдена, пытаемся создать её
      if ((error as any).response?.status === 404) {
        try {
          console.log('Пытаемся создать натальную карту...');
          const newChart = await chartAPI.createNatalChart({});
          setNatalChart(newChart);
          Alert.alert('✅', 'Натальная карта успешно создана!');
        } catch (createError) {
          console.error('Ошибка создания натальной карты:', createError);

          // Если не удалось создать, показываем моковые данные
          const mockChart = {
            planets: [
              { name: 'Солнце', sign: 'Лев', degree: 15 },
              { name: 'Луна', sign: 'Рак', degree: 8 },
              { name: 'Меркурий', sign: 'Лев', degree: 22 },
              { name: 'Венера', sign: 'Дева', degree: 3 },
              { name: 'Марс', sign: 'Скорпион', degree: 18 },
              { name: 'Юпитер', sign: 'Рыбы', degree: 12 },
              { name: 'Сатурн', sign: 'Козерог', degree: 25 },
              { name: 'Уран', sign: 'Близнецы', degree: 7 },
              { name: 'Нептун', sign: 'Рыбы', degree: 14 },
              { name: 'Плутон', sign: 'Скорпион', degree: 9 },
            ],
          };
          setNatalChart(mockChart);
          Alert.alert(
            'ℹ️',
            'Показаны демонстрационные данные. Для создания реальной натальной карты заполните данные профиля.'
          );
        }
      } else {
        // Для других ошибок показываем моковые данные
        const mockChart = {
          planets: [
            { name: 'Солнце', sign: 'Лев', degree: 15 },
            { name: 'Луна', sign: 'Рак', degree: 8 },
            { name: 'Меркурий', sign: 'Лев', degree: 22 },
            { name: 'Венера', sign: 'Дева', degree: 3 },
            { name: 'Марс', sign: 'Скорпион', degree: 18 },
            { name: 'Юпитер', sign: 'Рыбы', degree: 12 },
            { name: 'Сатурн', sign: 'Козерог', degree: 25 },
            { name: 'Уран', sign: 'Близнецы', degree: 7 },
            { name: 'Нептун', sign: 'Рыбы', degree: 14 },
            { name: 'Плутон', sign: 'Скорпион', degree: 9 },
          ],
        };
        setNatalChart(mockChart);
      }
    } finally {
      setLoading((prev) => ({ ...prev, natal: false }));
    }
  };

  const loadCurrentPlanets = async () => {
    setLoading((prev) => ({ ...prev, planets: true }));
    try {
      const planets = await chartAPI.getCurrentPlanets();
      setCurrentPlanets(planets);
    } catch (error) {
      console.error('Ошибка загрузки планет:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить текущие позиции планет');
    } finally {
      setLoading((prev) => ({ ...prev, planets: false }));
    }
  };

  const loadTransits = async () => {
    setLoading((prev) => ({ ...prev, transits: true }));
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const transitsData = await chartAPI.getTransits(
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0]
      );
      // Преобразуем данные транзитов в нужный формат
      const formattedTransits: TransitData[] = (
        transitsData.transits || []
      ).map((transit: any) => ({
        planet:
          transit.planet ||
          transit.transitPlanet ||
          transit.planetA ||
          'Планета',
        aspect: transit.aspect || transit.type || 'Аспект',
        target: transit.target || transit.natalPlanet || transit.planetB || '',
        date: transit.date || '',
        description: transit.description || 'Аспект между планетами',
      }));
      setTransits(formattedTransits);
    } catch (error) {
      console.error('Ошибка загрузки транзитов:', error);

      // Если транзиты не найдены из-за отсутствия натальной карты, пытаемся создать её
      if ((error as any).response?.status === 404) {
        try {
          console.log('Создаем натальную карту для расчета транзитов...');
          await chartAPI.createNatalChart({});
          // После создания натальной карты повторяем запрос транзитов
          const today = new Date();
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

          const transitsData = await chartAPI.getTransits(
            today.toISOString().split('T')[0],
            nextWeek.toISOString().split('T')[0]
          );

          const formattedTransits: TransitData[] = (
            transitsData.transits || []
          ).map((transit: any) => ({
            planet:
              transit.planet ||
              transit.transitPlanet ||
              transit.planetA ||
              'Планета',
            aspect: transit.aspect || transit.type || 'Аспект',
            target:
              transit.target || transit.natalPlanet || transit.planetB || '',
            date: transit.date || '',
            description: transit.description || 'Аспект между планетами',
          }));
          setTransits(formattedTransits);
          Alert.alert('✅', 'Натальная карта создана! Транзиты рассчитаны.');
          return;
        } catch (createError) {
          console.error(
            'Ошибка создания натальной карты для транзитов:',
            createError
          );
        }
      }

      // Используем моковые данные для демонстрации
      const mockTransits: TransitData[] = [
        {
          planet: 'Марс',
          aspect: 'Квадрат',
          target: 'Солнце',
          date: '2025-09-23',
          description:
            'Повышенная активность и энергия. Время для решительных действий.',
        },
        {
          planet: 'Венера',
          aspect: 'Трин',
          target: 'Луна',
          date: '2025-09-24',
          description:
            'Гармония в отношениях и творчестве. Благоприятное время для романтики.',
        },
        {
          planet: 'Меркурий',
          aspect: 'Секстиль',
          target: 'Юпитер',
          date: '2025-09-25',
          description:
            'Улучшение коммуникации и обучения. Хорошее время для новых знаний.',
        },
        {
          planet: 'Сатурн',
          aspect: 'Оппозиция',
          target: 'Марс',
          date: '2025-09-26',
          description:
            'Период ограничений и дисциплины. Важно быть терпеливым.',
        },
        {
          planet: 'Юпитер',
          aspect: 'Соединение',
          target: 'Нептун',
          date: '2025-09-27',
          description:
            'Расширение духовного сознания. Время для медитации и размышлений.',
        },
      ];
      setTransits(mockTransits);
    } finally {
      setLoading((prev) => ({ ...prev, transits: false }));
    }
  };

  const loadHoroscope = async () => {
    setLoading((prev) => ({ ...prev, horoscope: true }));
    try {
      const horoscopeData = await chartAPI.getPredictions('day');
      setHoroscope(horoscopeData);
    } catch (error) {
      console.error('Ошибка загрузки гороскопа:', error);

      // Если гороскоп не найден из-за отсутствия натальной карты, пытаемся создать её
      if ((error as any).response?.status === 404) {
        try {
          console.log('Создаем натальную карту для расчета гороскопа...');
          await chartAPI.createNatalChart({});
          // После создания натальной карты повторяем запрос гороскопа
          const horoscopeData = await chartAPI.getPredictions('day');
          setHoroscope(horoscopeData);
          Alert.alert('✅', 'Натальная карта создана! Гороскоп рассчитан.');
          return;
        } catch (createError) {
          console.error(
            'Ошибка создания натальной карты для гороскопа:',
            createError
          );
        }
      }

      // Используем моковые данные для демонстрации
      const mockHoroscope: HoroscopeData = {
        period: 'day',
        date: new Date().toISOString(),
        predictions: {
          general:
            'Сегодня звезды благоволят вам! Энергия Марса в квадрате к вашему Солнцу принесет повышенную активность и решительность.',
          love: 'Это отличное время для начала новых проектов и принятия важных решений. Венера в трине к Луне создает гармонию в отношениях.',
          career:
            'На этой неделе вас ждут значительные изменения в карьере. Юпитер в секстиле к Меркурию принесет новые возможности.',
          health:
            'Этот месяц будет особенно благоприятным для творческих проектов и самовыражения.',
          advice:
            'Сегодня слушайте свою интуицию и доверяйте внутреннему голосу.',
        },
        currentPlanets: {},
      };
      setHoroscope(mockHoroscope);
    } finally {
      setLoading((prev) => ({ ...prev, horoscope: false }));
    }
  };

  const renderNatalChart = () => {
    console.log('Рендер натальной карты:', {
      loading: loading.natal,
      natalChart,
    });

    if (loading.natal) {
      return (
        <View style={styles.loadingContainer}>
          <ShimmerLoader width={300} height={200} borderRadius={15} />
        </View>
      );
    }

    if (!natalChart) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="planet-outline"
            size={60}
            color="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.emptyText}>Натальная карта не найдена</Text>
          <Text style={styles.emptySubtext}>
            Создайте натальную карту на основе ваших данных
          </Text>
          <TouchableOpacity
            onPress={loadNatalChart}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>Создать натальную карту</Text>
          </TouchableOpacity>
        </View>
      );
    }

    console.log('Отображаем натальную карту:', natalChart);
    console.log('Планеты:', natalChart.data?.planets);

    return (
      <Animated.View entering={FadeIn} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Ваша натальная карта</Text>
        <View style={styles.planetsList}>
          {natalChart.data?.planets
            ? Object.entries(natalChart.data.planets).map(
                ([planetKey, planet]: [string, any], index: number) => {
                  const planetNames: { [key: string]: string } = {
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

                  return (
                    <View key={index} style={styles.planetRow}>
                      <Text style={styles.planetName}>
                        {planetNames[planetKey] || planetKey}
                      </Text>
                      <Text style={styles.planetPosition}>
                        {planet.sign} {planet.degree?.toFixed(1)}°
                      </Text>
                    </View>
                  );
                }
              )
            : natalChart.planets?.map((planet: any, index: number) => (
                <View key={index} style={styles.planetRow}>
                  <Text style={styles.planetName}>{planet.name}</Text>
                  <Text style={styles.planetPosition}>
                    {planet.sign} {planet.degree}°
                  </Text>
                </View>
              ))}
        </View>
      </Animated.View>
    );
  };

  const renderTransits = () => {
    if (loading.transits) {
      return (
        <View style={styles.loadingContainer}>
          <ShimmerLoader width={300} height={150} borderRadius={15} />
        </View>
      );
    }

    if (!transits || transits.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="time-outline"
            size={60}
            color="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.emptyText}>Транзиты не найдены</Text>
          <TouchableOpacity onPress={loadTransits} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Обновить</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.View entering={FadeIn} style={styles.transitsContainer}>
        <Text style={styles.chartTitle}>Текущие транзиты</Text>
        {transits.slice(0, 5).map((transit, index) => (
          <View key={index} style={styles.transitItem}>
            <View style={styles.transitHeader}>
              <Text style={styles.transitPlanet}>{transit.planet}</Text>
              <Text style={styles.transitAspect}>{transit.aspect}</Text>
              <Text style={styles.transitTarget}>{transit.target}</Text>
            </View>
            <Text style={styles.transitDescription}>{transit.description}</Text>
            <Text style={styles.transitDate}>{transit.date}</Text>
          </View>
        ))}
      </Animated.View>
    );
  };

  const renderHoroscope = () => {
    return (
      <HoroscopeWidget
        predictions={undefined as any}
        currentPlanets={currentPlanets}
        isLoading={loading.horoscope}
      />
    );
  };

  return (
    <LinearGradient
      colors={['#1a0a2a', '#3a1a5a', '#000000']}
      style={styles.container}
    >
      <AnimatedStars />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Заголовок */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <Ionicons name="planet" size={60} color="#8B5CF6" />
          <Text style={styles.title}>Астрологическая Карта</Text>
          <Text style={styles.subtitle}>Ваши звездные влияния</Text>
        </Animated.View>

        {/* Табы */}
        <Animated.View
          entering={SlideInUp.delay(400)}
          style={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'natal' && styles.activeTab]}
            onPress={() => setActiveTab('natal')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'natal' && styles.activeTabText,
              ]}
            >
              Натальная карта
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'transits' && styles.activeTab]}
            onPress={() => setActiveTab('transits')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'transits' && styles.activeTabText,
              ]}
            >
              Транзиты
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'horoscope' && styles.activeTab]}
            onPress={() => setActiveTab('horoscope')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'horoscope' && styles.activeTabText,
              ]}
            >
              Гороскоп
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Кнопка обновления */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setLoading({
              natal: true,
              planets: true,
              transits: true,
              horoscope: true,
            });
            loadNatalChart();
            loadCurrentPlanets();
            loadTransits();
            loadHoroscope();
          }}
        >
          <Text style={styles.refreshText}>🔄 Обновить</Text>
        </TouchableOpacity>

        {/* Контент */}
        <Animated.View
          entering={SlideInUp.delay(600)}
          style={styles.contentContainer}
        >
          {activeTab === 'natal' && renderNatalChart()}
          {activeTab === 'transits' && renderTransits()}
          {activeTab === 'horoscope' && renderHoroscope()}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    minHeight: 300,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  refreshText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  planetsList: {
    gap: 10,
  },
  planetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  planetName: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planetPosition: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  transitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  transitItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transitPlanet: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transitAspect: {
    color: '#EC4899',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transitTarget: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transitDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  transitDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  horoscopeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  horoscopeContent: {
    gap: 15,
  },
  predictionSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  predictionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
});
