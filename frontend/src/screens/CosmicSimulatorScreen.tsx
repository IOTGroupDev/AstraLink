import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AstralDateTimePicker from '../components/shared/DateTimePicker';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { chartAPI } from '../services/api';
import {
  ASTRO_LESSONS,
  getLessonsByCategory,
} from '../services/lessons-database';
import { AstroLesson } from '../types/lessons';
import { LessonCard } from '../components/lessons/LessonCard';
import { ChartVisualization } from '../components/simulator/Chartvisualization';
import { logger } from '../services/logger';

const { width } = Dimensions.get('window');

interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
  speed?: number;
  isRetrograde?: boolean;
}

interface TransitData {
  planet: string;
  aspect: string;
  target: string;
  orb: number;
  date: string;
  description: string;
  type: 'harmonious' | 'challenging' | 'neutral';
  strength?: number;
}

interface HistoricalNote {
  date: string;
  note: string;
  transits: string[];
}

// Добавляем "lessons" в типы вкладок
type SimulatorTab = 'transits' | 'planets' | 'timeline' | 'lessons';

export default function CosmicSimulatorScreen() {
  // Константы (до всех хуков)
  const screenWidth = width;

  // Данные
  const [natalChart, setNatalChart] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transitPlanets, setTransitPlanets] = useState<PlanetPosition[]>([]);
  const [activeTransits, setActiveTransits] = useState<TransitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitsLoading, setTransitsLoading] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [hasAIAccess, setHasAIAccess] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  // UI состояния
  const [activeTab, setActiveTab] = useState<SimulatorTab>('transits');
  const [selectedTransit, setSelectedTransit] = useState<TransitData | null>(
    null
  );
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [historicalNotes, setHistoricalNotes] = useState<HistoricalNote[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailContent, setDetailContent] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState('');

  // Уроки
  const [showDailyLesson, setShowDailyLesson] = useState(true);
  const [dailyLesson, setDailyLesson] = useState<AstroLesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<string>>(
    new Set()
  );

  // Фильтры
  const [showOnlyMajor, setShowOnlyMajor] = useState(false);
  const [minOrb, setMinOrb] = useState(10);

  // Анимации
  const fadeAnim = useSharedValue(0);
  const datePickerAnimation = useSharedValue(1);

  // Временной диапазон (±5 лет)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 5);
  const totalTimeSpan = endDate.getTime() - startDate.getTime();

  // Маппинг планет
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
    trine: 'Трин',
    square: 'Квадрат',
    sextile: 'Секстиль',
  };

  useEffect(() => {
    loadNatalChart();
    selectDailyLesson();
    fadeAnim.value = withTiming(1, { duration: 800 });

    // Инициализация значения датапикера
    const y = currentDate.getFullYear();
    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const d = currentDate.getDate().toString().padStart(2, '0');
    setDatePickerValue(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    if (natalChart) {
      loadTransitsForDate(currentDate);
    }
  }, [currentDate, natalChart]);

  // Выбрать урок дня
  const selectDailyLesson = () => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const lessonIndex = dayOfYear % ASTRO_LESSONS.length;
    setDailyLesson(ASTRO_LESSONS[lessonIndex]);
  };

  // Найти релевантный урок для транзита
  const findRelevantLesson = (transit: TransitData): AstroLesson | null => {
    // Поиск урока по аспекту
    const aspectLesson = ASTRO_LESSONS.find(
      (lesson) =>
        lesson.category === 'aspects' &&
        lesson.title
          .toLowerCase()
          .includes(aspectRu[transit.aspect]?.toLowerCase() || '')
    );

    if (aspectLesson) return aspectLesson;

    // Поиск урока по планете
    const planetLesson = ASTRO_LESSONS.find(
      (lesson) =>
        lesson.category === 'planets' &&
        lesson.title.toLowerCase().includes(transit.planet.toLowerCase())
    );

    return planetLesson || null;
  };

  const loadNatalChart = async () => {
    try {
      setLoading(true);
      const data = await chartAPI.getNatalChartWithInterpretation();
      setNatalChart(data);
    } catch (error) {
      logger.error('Ошибка загрузки натальной карты', error);
      // Mock данные
      setNatalChart({
        data: {
          planets: {
            sun: { sign: 'Leo', degree: 15.5, longitude: 135.5 },
            moon: { sign: 'Cancer', degree: 8.2, longitude: 98.2 },
            mercury: { sign: 'Virgo', degree: 22.1, longitude: 172.1 },
            venus: { sign: 'Leo', degree: 3.8, longitude: 123.8 },
            mars: { sign: 'Scorpio', degree: 18.9, longitude: 228.9 },
            jupiter: { sign: 'Pisces', degree: 12.3, longitude: 342.3 },
            saturn: { sign: 'Capricorn', degree: 25.7, longitude: 295.7 },
            uranus: { sign: 'Gemini', degree: 7.4, longitude: 67.4 },
            neptune: { sign: 'Pisces', degree: 14.8, longitude: 344.8 },
            pluto: { sign: 'Scorpio', degree: 9.1, longitude: 219.1 },
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransitsForDate = async (date: Date) => {
    setTransitsLoading(true);
    try {
      // Загружаем AI интерпретацию транзитов (с проверкой подписки на backend)
      const dateStr = date.toISOString().split('T')[0];
      const interpretationData =
        await chartAPI.getTransitInterpretation(dateStr);

      // Сохраняем AI интерпретацию
      setAiInterpretation(interpretationData.aiInterpretation);
      setHasAIAccess(interpretationData.hasAIAccess);
      setSubscriptionTier(interpretationData.subscriptionTier);

      // Конвертируем планеты в формат UI
      const planets: PlanetPosition[] = Object.entries(
        interpretationData.transitPlanets || {}
      ).map(([name, data]: [string, any]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        longitude: data.longitude || 0,
        sign: data.sign || '',
        degree: data.degree || 0,
        speed: data.speed,
        isRetrograde: data.isRetrograde || false,
      }));

      setTransitPlanets(planets);

      // Используем аспекты с backend
      const transits: TransitData[] = interpretationData.aspects.map(
        (aspect) => ({
          planet:
            aspect.transitPlanet.charAt(0).toUpperCase() +
            aspect.transitPlanet.slice(1),
          aspect: aspect.aspect,
          target: planetRu[aspect.natalPlanet] || aspect.natalPlanet,
          orb: Math.round(aspect.orb * 10) / 10,
          date: date.toDateString(),
          description: getTransitDescription(
            aspect.transitPlanet.charAt(0).toUpperCase() +
              aspect.transitPlanet.slice(1),
            aspect.aspect,
            aspect.natalPlanet
          ),
          type: getAspectType(aspect.aspect),
          strength: aspect.strength,
        })
      );

      setActiveTransits(
        transits.sort((a, b) => (b.strength || 0) - (a.strength || 0))
      );
    } catch (error) {
      logger.error('Ошибка загрузки транзитов', error);
      // Fallback на расчётные данные
      const transitPlanets = calculateTransitPlanets(date);
      setTransitPlanets(transitPlanets);

      const activeTransits = calculateActiveTransits(
        transitPlanets,
        natalChart,
        date
      );
      setActiveTransits(activeTransits);
    } finally {
      setTransitsLoading(false);
    }
  };

  const calculateTransitPlanets = (date: Date): PlanetPosition[] => {
    const daysSinceEpoch = Math.floor(
      (date.getTime() - new Date('2000-01-01').getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const planetSpeeds = {
      Sun: 0.985,
      Moon: 13.176,
      Mercury: 1.383,
      Venus: 1.602,
      Mars: 0.524,
      Jupiter: 0.083,
      Saturn: 0.033,
      Uranus: 0.014,
      Neptune: 0.006,
      Pluto: 0.004,
    };

    const initialPositions = {
      Sun: 280,
      Moon: 45,
      Mercury: 290,
      Venus: 300,
      Mars: 180,
      Jupiter: 45,
      Saturn: 280,
      Uranus: 75,
      Neptune: 355,
      Pluto: 295,
    };

    const planets: PlanetPosition[] = [];

    Object.entries(planetSpeeds).forEach(([planetName, speed]) => {
      const longitude =
        (initialPositions[planetName as keyof typeof initialPositions] +
          daysSinceEpoch * speed) %
        360;

      const sign = getSignFromLongitude(longitude);
      const degree = longitude - Math.floor(longitude / 30) * 30;

      planets.push({
        name: planetName,
        longitude,
        sign,
        degree: Math.round(degree * 10) / 10,
        speed,
        isRetrograde: planetName === 'Mercury' && Math.random() > 0.7, // Demo
      });
    });

    return planets;
  };

  const getSignFromLongitude = (longitude: number): string => {
    const signs = [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ];
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex % 12];
  };

  const calculateActiveTransits = (
    transitPlanets: PlanetPosition[],
    natalChart: any,
    date: Date
  ): TransitData[] => {
    let natalPlanets = natalChart?.data?.planets || natalChart?.planets;

    if (!natalPlanets) {
      return [];
    }

    const transits: TransitData[] = [];

    transitPlanets.forEach((transitPlanet) => {
      Object.entries(natalPlanets).forEach(
        ([natalPlanetKey, natalPlanet]: [string, any]) => {
          const aspect = calculateAspect(
            transitPlanet.longitude,
            natalPlanet.longitude
          );

          if (aspect.aspect !== 'none' && aspect.orb <= minOrb) {
            transits.push({
              planet: transitPlanet.name,
              aspect: aspect.aspect,
              target: planetRu[natalPlanetKey] || natalPlanetKey,
              orb: Math.round(aspect.orb * 10) / 10,
              date: date.toDateString(),
              description: getTransitDescription(
                transitPlanet.name,
                aspect.aspect,
                natalPlanetKey
              ),
              type: getAspectType(aspect.aspect),
              strength: aspect.strength,
            });
          }
        }
      );
    });

    return transits.sort((a, b) => (b.strength || 0) - (a.strength || 0));
  };

  const calculateAspect = (longitude1: number, longitude2: number) => {
    const diff = Math.abs(longitude1 - longitude2);
    const angle = diff > 180 ? 360 - diff : diff;

    const aspects = [
      { name: 'conjunction', angle: 0, orb: 10, strength: 1.0 },
      { name: 'sextile', angle: 60, orb: 6, strength: 0.7 },
      { name: 'square', angle: 90, orb: 8, strength: 0.9 },
      { name: 'trine', angle: 120, orb: 8, strength: 0.8 },
      { name: 'opposition', angle: 180, orb: 10, strength: 0.9 },
    ];

    for (const asp of aspects) {
      const orbDiff = Math.abs(angle - asp.angle);
      if (orbDiff <= asp.orb) {
        return {
          aspect: asp.name,
          orb: orbDiff,
          strength: asp.strength * (1 - orbDiff / asp.orb),
        };
      }
    }

    return { aspect: 'none', orb: 999, strength: 0 };
  };

  const getTransitDescription = (
    planet: string,
    aspect: string,
    target: string
  ): string => {
    return `Транзитный ${planet} формирует ${aspectRu[aspect] || aspect} с натальным ${planetRu[target] || target}`;
  };

  const getAspectType = (
    aspect: string
  ): 'harmonious' | 'challenging' | 'neutral' => {
    if (['trine', 'sextile'].includes(aspect)) return 'harmonious';
    if (['square', 'opposition'].includes(aspect)) return 'challenging';
    return 'neutral';
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);

    // Обновляем значение для датапикера
    const y = newDate.getFullYear();
    const m = (newDate.getMonth() + 1).toString().padStart(2, '0');
    const d = newDate.getDate().toString().padStart(2, '0');
    setDatePickerValue(`${y}-${m}-${d}`);
  };

  const handleDatePickerChange = (value: string) => {
    setDatePickerValue(value);

    // Парсим дату из формата YYYY-MM-DD
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const newDate = new Date(year, month, day);
      setCurrentDate(newDate);
    }
  };

  const openTransitDetails = async (transit: TransitData) => {
    setSelectedTransit(transit);
    setShowDetailModal(true);

    try {
      // Используем реальный API для получения деталей интерпретации
      const details = await chartAPI.getInterpretationDetails({
        type: 'aspect',
        aspect: transit.aspect,
        planetA: transit.planet.toLowerCase(),
        planetB:
          Object.keys(planetRu).find(
            (key) => planetRu[key] === transit.target
          ) || transit.target.toLowerCase(),
        locale: 'ru',
      });

      setDetailContent(details);
    } catch (error) {
      logger.error('Ошибка загрузки деталей', error);
      // Fallback на базовую информацию
      setDetailContent({
        lines: [
          transit.description,
          `Орб: ${transit.orb}°`,
          `Сила: ${Math.round((transit.strength || 0) * 100)}%`,
          'Это аспект между транзитной и натальной планетой.',
        ],
      });
    }
  };

  const saveNote = () => {
    if (!noteText.trim()) return;

    const newNote: HistoricalNote = {
      date: currentDate.toISOString(),
      note: noteText,
      transits: activeTransits
        .slice(0, 3)
        .map((t) => `${t.planet} ${t.aspect} ${t.target}`),
    };

    setHistoricalNotes([...historicalNotes, newNote]);
    setNoteText('');
    setShowNoteModal(false);
  };

  const handleLessonComplete = (lessonId: string) => {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
  };

  const handleLessonBookmark = (lessonId: string) => {
    setBookmarkedLessons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const filteredTransits = activeTransits.filter((transit) => {
    if (
      showOnlyMajor &&
      !['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(
        transit.planet
      )
    ) {
      return false;
    }
    return true;
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  if (loading) {
    return (
      <TabScreenLayout>
        <View style={styles.loadingContainer}>
          <Ionicons name="planet" size={64} color="#8B5CF6" />
          <Text style={styles.loadingText}>Загрузка симулятора...</Text>
        </View>
      </TabScreenLayout>
    );
  }

  return (
    <TabScreenLayout>
      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <View style={styles.headerIconContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.headerIcon}
                >
                  <Ionicons name="planet" size={32} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Космический симулятор</Text>
                <Text style={styles.headerSubtitle}>
                  {currentDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                onPress={() => adjustDate(-7)}
                style={styles.quickButton}
              >
                <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                <Text style={styles.quickButtonText}>-7д</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustDate(-1)}
                style={styles.quickButton}
              >
                <Text style={styles.quickButtonText}>-1д</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.calendarButton}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.calendarGradient}
                >
                  <Ionicons name="calendar" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustDate(1)}
                style={styles.quickButton}
              >
                <Text style={styles.quickButtonText}>+1д</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => adjustDate(7)}
                style={styles.quickButton}
              >
                <Text style={styles.quickButtonText}>+7д</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* 📚 УРОК ДНЯ - КОМПАКТНАЯ КАРТОЧКА */}
          {showDailyLesson && dailyLesson && (
            <BlurView intensity={10} tint="dark" style={styles.dailyLessonCard}>
              <View style={styles.dailyLessonHeader}>
                <View style={styles.dailyLessonIconContainer}>
                  <LinearGradient
                    colors={dailyLesson.gradient}
                    style={styles.dailyLessonIcon}
                  >
                    <Text style={styles.dailyLessonEmoji}>
                      {dailyLesson.emoji}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.dailyLessonContent}>
                  <Text style={styles.dailyLessonLabel}>📚 Урок дня</Text>
                  <Text style={styles.dailyLessonTitle} numberOfLines={1}>
                    {dailyLesson.title}
                  </Text>
                  <Text style={styles.dailyLessonSubtitle} numberOfLines={2}>
                    {dailyLesson.shortText}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowDailyLesson(false)}
                  style={styles.dailyLessonClose}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setActiveTab('lessons')}
                style={styles.dailyLessonButton}
              >
                <Text style={styles.dailyLessonButtonText}>Изучить</Text>
                <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </BlurView>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabs}
            >
              {(
                ['transits', 'planets', 'timeline', 'lessons'] as SimulatorTab[]
              ).map((tab) => {
                const icons = {
                  transits: 'swap-horizontal',
                  planets: 'planet',
                  timeline: 'calendar',
                  lessons: 'book',
                };
                const labels = {
                  transits: 'Транзиты',
                  planets: 'Планеты',
                  timeline: 'История',
                  lessons: 'Обучение',
                };

                const isActive = activeTab === tab;

                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tab, isActive && styles.tabActive]}
                  >
                    {isActive ? (
                      <View style={styles.activeTabContent}>
                        <Ionicons
                          name={icons[tab] as any}
                          size={20}
                          color="#FFFFFF"
                        />
                      </View>
                    ) : (
                      <>
                        <Ionicons
                          name={icons[tab] as any}
                          size={20}
                          color="rgba(255,255,255,0.5)"
                        />
                        <Text style={styles.tabText}>{labels[tab]}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ВКЛАДКА: ТРАНЗИТЫ */}
          {activeTab === 'transits' && (
            <>
              {/* AI Интерпретация */}
              {aiInterpretation && (
                <BlurView
                  intensity={10}
                  tint="dark"
                  style={styles.aiInterpretationCard}
                >
                  <View style={styles.aiHeader}>
                    <View style={styles.aiIconContainer}>
                      <LinearGradient
                        colors={
                          hasAIAccess
                            ? ['#8B5CF6', '#6366F1']
                            : ['#6B7280', '#4B5563']
                        }
                        style={styles.aiIcon}
                      >
                        <Ionicons
                          name={hasAIAccess ? 'sparkles' : 'information-circle'}
                          size={20}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    </View>
                    <View style={styles.aiTitleContainer}>
                      <Text style={styles.aiTitle}>
                        {hasAIAccess
                          ? 'AI Интерпретация транзитов'
                          : 'Базовая интерпретация'}
                      </Text>
                      {!hasAIAccess && (
                        <Text style={styles.aiSubtitle}>
                          Обновите подписку для AI-анализа
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.aiInterpretationText}>
                    {aiInterpretation}
                  </Text>
                  {!hasAIAccess && (
                    <TouchableOpacity style={styles.upgradeButton}>
                      <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.upgradeGradient}
                      >
                        <Text style={styles.upgradeText}>Получить Premium</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </BlurView>
              )}

              <BlurView intensity={10} tint="dark" style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <View style={styles.contentTitleContainer}>
                    <Text style={styles.contentTitle}>Активные транзиты</Text>
                    <View style={styles.contentBadge}>
                      <Text style={styles.contentBadgeText}>
                        {filteredTransits.length}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowOnlyMajor(!showOnlyMajor)}
                    style={[
                      styles.filterButton,
                      showOnlyMajor && styles.filterButtonActive,
                    ]}
                  >
                    <Ionicons
                      name="filter"
                      size={16}
                      color={
                        showOnlyMajor ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
                      }
                    />
                  </TouchableOpacity>
                </View>

                {transitsLoading ? (
                  <View style={styles.loadingTransits}>
                    <Text style={styles.loadingTransitsText}>
                      Расчёт транзитов...
                    </Text>
                  </View>
                ) : filteredTransits.length === 0 ? (
                  <View style={styles.emptyTransits}>
                    <Ionicons
                      name="planet-outline"
                      size={48}
                      color="rgba(255,255,255,0.3)"
                    />
                    <Text style={styles.emptyTransitsText}>
                      Нет активных транзитов
                    </Text>
                  </View>
                ) : (
                  <View style={styles.transitsList}>
                    {filteredTransits.map((transit, index) => {
                      const relevantLesson = findRelevantLesson(transit);

                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => openTransitDetails(transit)}
                          style={[
                            styles.transitItem,
                            {
                              borderLeftColor:
                                transit.type === 'harmonious'
                                  ? '#10B981'
                                  : transit.type === 'challenging'
                                    ? '#EF4444'
                                    : '#6B7280',
                            },
                          ]}
                        >
                          <View style={styles.transitHeader}>
                            <Text style={styles.transitTitle}>
                              {transit.planet} {aspectRu[transit.aspect]}{' '}
                              {transit.target}
                            </Text>
                            <View style={styles.transitOrbBadge}>
                              <Text style={styles.transitOrb}>
                                {transit.orb}°
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={styles.transitDescription}
                            numberOfLines={2}
                          >
                            {transit.description}
                          </Text>

                          {/* 💡 КНОПКА "УЗНАТЬ БОЛЬШЕ" */}
                          {relevantLesson && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                setActiveTab('lessons');
                              }}
                              style={styles.learnMoreButton}
                            >
                              <Ionicons
                                name="bulb-outline"
                                size={14}
                                color="#FBBF24"
                              />
                              <Text style={styles.learnMoreText}>
                                Узнать больше об аспекте "
                                {aspectRu[transit.aspect]}"
                              </Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </BlurView>
            </>
          )}

          {/* ВКЛАДКА: ПЛАНЕТЫ */}
          {activeTab === 'planets' && (
            <BlurView intensity={10} tint="dark" style={styles.contentCard}>
              <Text style={styles.contentTitle}>Транзитные планеты</Text>

              {/* Визуализация карты */}
              <View style={styles.chartVisualizationContainer}>
                <ChartVisualization
                  natalPlanets={
                    natalChart?.data?.planets || natalChart?.planets || {}
                  }
                  transitPlanets={transitPlanets}
                  activeTransits={activeTransits}
                  size={screenWidth - 48}
                  showTransits={true}
                  showAspects={true}
                />
              </View>

              {/* Список планет */}
              <View style={styles.planetsList}>
                {transitPlanets.map((planet, index) => (
                  <View key={index} style={styles.planetItem}>
                    <View style={styles.planetInfo}>
                      <Text style={styles.planetName}>{planet.name}</Text>
                      {planet.isRetrograde && (
                        <View style={styles.retroBadge}>
                          <Text style={styles.retroText}>℞</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planetPosition}>
                      {planet.sign} {planet.degree.toFixed(1)}°
                    </Text>
                  </View>
                ))}
              </View>
            </BlurView>
          )}

          {/* ВКЛАДКА: ИСТОРИЯ */}
          {activeTab === 'timeline' && (
            <BlurView intensity={10} tint="dark" style={styles.contentCard}>
              <View style={styles.contentHeader}>
                <Text style={styles.contentTitle}>Исторические заметки</Text>
                <TouchableOpacity
                  onPress={() => setShowNoteModal(true)}
                  style={styles.addNoteButton}
                >
                  <Ionicons name="add" size={20} color="#8B5CF6" />
                </TouchableOpacity>
              </View>

              {historicalNotes.length === 0 ? (
                <View style={styles.emptyNotes}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color="rgba(255,255,255,0.3)"
                  />
                  <Text style={styles.emptyNotesText}>Пока нет заметок</Text>
                </View>
              ) : (
                <View style={styles.notesList}>
                  {historicalNotes.map((note, index) => (
                    <View key={index} style={styles.noteItem}>
                      <Text style={styles.noteDate}>
                        {new Date(note.date).toLocaleDateString('ru-RU')}
                      </Text>
                      <Text style={styles.noteText}>{note.note}</Text>
                      {note.transits.length > 0 && (
                        <Text style={styles.noteTransits}>
                          Транзиты: {note.transits.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </BlurView>
          )}

          {/* 📚 ВКЛАДКА: ОБУЧЕНИЕ (НОВАЯ) */}
          {activeTab === 'lessons' && (
            <View style={styles.lessonsContainer}>
              <BlurView intensity={10} tint="dark" style={styles.lessonsHeader}>
                <View>
                  <Text style={styles.lessonsTitle}>Обучение астрологии</Text>
                  <Text style={styles.lessonsSubtitle}>
                    {completedLessons.size} из {ASTRO_LESSONS.length} уроков
                    пройдено
                  </Text>
                </View>
              </BlurView>

              {/* Прогресс бар */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={[
                      styles.progressFill,
                      {
                        width: `${(completedLessons.size / ASTRO_LESSONS.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(
                    (completedLessons.size / ASTRO_LESSONS.length) * 100
                  )}
                  %
                </Text>
              </View>

              {/* Категории уроков */}
              {(
                [
                  'basics',
                  'planets',
                  'aspects',
                  'transits',
                  'practical',
                ] as const
              ).map((category) => {
                const categoryLessons = getLessonsByCategory(category);
                const categoryLabels = {
                  basics: 'Основы',
                  planets: 'Планеты',
                  aspects: 'Аспекты',
                  transits: 'Транзиты',
                  practical: 'Практика',
                };

                return (
                  <View key={category} style={styles.lessonCategory}>
                    <Text style={styles.categoryTitle}>
                      {categoryLabels[category]} ({categoryLessons.length})
                    </Text>
                    {categoryLessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        isCompleted={completedLessons.has(lesson.id)}
                        isBookmarked={bookmarkedLessons.has(lesson.id)}
                        onComplete={handleLessonComplete}
                        onBookmark={handleLessonBookmark}
                        compact={false}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Note Modal */}
        <Modal
          visible={showNoteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Добавить заметку</Text>
                <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDate}>
                {currentDate.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <TextInput
                style={styles.noteInput}
                placeholder="Что произошло в этот день?"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowNoteModal(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>Отмена</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveNote}
                  style={styles.modalSaveButton}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.modalSaveGradient}
                  >
                    <Text style={styles.modalSaveText}>Сохранить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal
          visible={showDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.detailModal}>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.detailCloseButton}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <ScrollView style={styles.detailContent}>
                {selectedTransit && (
                  <>
                    <Text style={styles.detailTitle}>
                      {selectedTransit.planet}{' '}
                      {aspectRu[selectedTransit.aspect]}{' '}
                      {selectedTransit.target}
                    </Text>

                    <View style={styles.detailMeta}>
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>Орб:</Text>
                        <Text style={styles.detailMetaValue}>
                          {selectedTransit.orb}°
                        </Text>
                      </View>
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>Сила:</Text>
                        <Text style={styles.detailMetaValue}>
                          {Math.round((selectedTransit.strength || 0) * 100)}%
                        </Text>
                      </View>
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>Тип:</Text>
                        <Text
                          style={[
                            styles.detailMetaValue,
                            {
                              color:
                                selectedTransit.type === 'harmonious'
                                  ? '#10B981'
                                  : selectedTransit.type === 'challenging'
                                    ? '#EF4444'
                                    : '#6B7280',
                            },
                          ]}
                        >
                          {selectedTransit.type === 'harmonious'
                            ? 'Гармоничный'
                            : selectedTransit.type === 'challenging'
                              ? 'Напряжённый'
                              : 'Нейтральный'}
                        </Text>
                      </View>
                    </View>

                    {detailContent?.lines && (
                      <View style={styles.detailDescription}>
                        {detailContent.lines.map(
                          (line: string, index: number) => (
                            <Text key={index} style={styles.detailLine}>
                              {line}
                            </Text>
                          )
                        )}
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </BlurView>
          </View>
        </Modal>

        {/* DatePicker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.datePickerModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выбрать дату</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <AstralDateTimePicker
                value={datePickerValue}
                onChangeText={handleDatePickerChange}
                placeholder="Дата"
                icon="calendar"
                mode="date"
                animationValue={datePickerAnimation}
              />

              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerDoneButton}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.datePickerDoneGradient}
                >
                  <Text style={styles.datePickerDoneText}>Готово</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      </Animated.View>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },

  // Header
  headerContainer: {
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  headerIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  calendarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  todayGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  todayText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 📚 УРОК ДНЯ
  dailyLessonCard: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  dailyLessonHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dailyLessonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  dailyLessonIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyLessonEmoji: {
    fontSize: 24,
  },
  dailyLessonContent: {
    flex: 1,
  },
  dailyLessonLabel: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyLessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dailyLessonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  dailyLessonClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyLessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  dailyLessonButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Tabs
  tabsContainer: {
    marginTop: 16,
    marginHorizontal: 8,
  },
  tabs: {
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
  },
  activeTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // Content Card
  contentCard: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentBadge: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  contentBadgeText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(139,92,246,0.3)',
  },
  addNoteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Transits
  loadingTransits: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingTransitsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyTransits: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyTransitsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  transitsList: {
    gap: 12,
  },
  transitItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  transitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  transitOrbBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transitOrb: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  transitDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },

  // 💡 КНОПКА "УЗНАТЬ БОЛЬШЕ"
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  learnMoreText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '500',
  },

  // Planets
  planetsList: {
    marginTop: 12,
    gap: 10,
  },
  chartVisualizationContainer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  planetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  planetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  retroBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retroText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  planetPosition: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // Notes
  emptyNotes: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyNotesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  notesList: {
    marginTop: 12,
    gap: 12,
  },
  noteItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  noteDate: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 8,
  },
  noteTransits: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },

  // 📚 ВКЛАДКА УРОКОВ
  lessonsContainer: {
    marginHorizontal: 8,
    marginTop: 16,
    gap: 16,
  },
  lessonsHeader: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lessonsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lessonsSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    minWidth: 40,
  },
  lessonCategory: {
    gap: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDate: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Detail Modal
  detailModal: {
    flex: 1,
    borderRadius: 20,
    marginTop: 60,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    marginTop: 40,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  detailMetaItem: {
    flex: 1,
  },
  detailMetaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  detailMetaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailDescription: {
    gap: 12,
  },
  detailLine: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },

  // DatePicker Modal
  datePickerModal: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  datePickerDoneButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerDoneGradient: {
    padding: 14,
    alignItems: 'center',
  },
  datePickerDoneText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // AI Interpretation Card
  aiInterpretationCard: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  aiIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitleContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  aiInterpretationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 12,
  },
  upgradeButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
