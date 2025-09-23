import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  PanResponder,
  Animated as RNAnimated,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInUp,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';

import AnimatedStars from '../components/AnimatedStars';
import ShimmerLoader from '../components/ShimmerLoader';
import { chartAPI, getStoredToken } from '../services/api';

const { width, height } = Dimensions.get('window');

interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface TransitData {
  planet: string;
  aspect: string;
  target: string;
  orb: number;
  date: string;
  description: string;
  type: 'harmonious' | 'challenging' | 'neutral';
}

interface HistoricalNote {
  date: string;
  note: string;
  transits: string[];
}

export default function CosmicSimulatorScreen() {
  const [natalChart, setNatalChart] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transitPlanets, setTransitPlanets] = useState<PlanetPosition[]>([]);
  const [activeTransits, setActiveTransits] = useState<TransitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransit, setSelectedTransit] = useState<TransitData | null>(null);
  const [historicalNotes, setHistoricalNotes] = useState<HistoricalNote[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [transitsLoading, setTransitsLoading] = useState(false);

  // Анимации
  const planetRotation = useSharedValue(0);
  const timelinePosition = useSharedValue(0.5); // 0 = прошлое, 1 = будущее
  const chartScale = useSharedValue(1);

  // Временные параметры (5 лет назад - 5 лет вперед)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 5);
  const totalTimeSpan = endDate.getTime() - startDate.getTime();

  useEffect(() => {
    loadNatalChart();
    loadTransitsForDate(currentDate);
  }, []);

  useEffect(() => {
    loadTransitsForDate(currentDate);
  }, [currentDate]);

  const loadNatalChart = async () => {
    try {
      const chart = await chartAPI.getNatalChart();
      setNatalChart(chart);
    } catch (error) {
      console.error('Ошибка загрузки натальной карты:', error);
      // Моковые данные для демонстрации
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
            pluto: { sign: 'Scorpio', degree: 9.1, longitude: 219.1 }
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransitsForDate = async (date: Date) => {
    setTransitsLoading(true);
    try {
      // Небольшая задержка для плавности анимации
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Загружаем транзиты для даты:', date.toDateString());
      console.log('Натальная карта:', natalChart);
      
      // Рассчитываем позиции транзитных планет на основе даты
      const transitPlanets = calculateTransitPlanets(date);
      console.log('Транзитные планеты:', transitPlanets);
      setTransitPlanets(transitPlanets);

      // Рассчитываем активные транзиты на основе натальной карты и транзитных планет
      const activeTransits = calculateActiveTransits(transitPlanets, natalChart, date);
      console.log('Активные транзиты:', activeTransits);
      setActiveTransits(activeTransits);
    } catch (error) {
      console.error('Ошибка загрузки транзитов:', error);
    } finally {
      setTransitsLoading(false);
    }
  };

  // Функция для расчета позиций транзитных планет
  const calculateTransitPlanets = (date: Date): PlanetPosition[] => {
    // Упрощенная модель движения планет (для демонстрации)
    // В реальном приложении здесь будет использоваться Swiss Ephemeris
    
    const daysSinceEpoch = Math.floor((date.getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24));
    
    // Скорости движения планет (градусы в день)
    const planetSpeeds = {
      Saturn: 0.033,    // ~30 лет на круг
      Jupiter: 0.083,    // ~12 лет на круг  
      Uranus: 0.014,    // ~84 года на круг
      Neptune: 0.006,   // ~165 лет на круг
      Pluto: 0.004      // ~248 лет на круг
    };

    // Начальные позиции планет (примерные)
    const initialPositions = {
      Saturn: 280,
      Jupiter: 45,
      Uranus: 75,
      Neptune: 355,
      Pluto: 295
    };

    const planets: PlanetPosition[] = [];

    Object.entries(planetSpeeds).forEach(([planetName, speed]) => {
      const longitude = (initialPositions[planetName as keyof typeof initialPositions] + 
                       (daysSinceEpoch * speed)) % 360;
      
      const sign = getSignFromLongitude(longitude);
      const degree = longitude - (Math.floor(longitude / 30) * 30);

      planets.push({
        name: planetName,
        longitude,
        sign,
        degree: Math.round(degree * 10) / 10
      });
    });

    return planets;
  };

  // Функция для определения знака зодиака по долготе
  const getSignFromLongitude = (longitude: number): string => {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex];
  };

  // Функция для расчета активных транзитов
  const calculateActiveTransits = (transitPlanets: PlanetPosition[], natalChart: any, date: Date): TransitData[] => {
    console.log('calculateActiveTransits вызвана с:', { transitPlanets, natalChart });
    
    // Проверяем разные возможные структуры натальной карты
    let natalPlanets = null;
    if (natalChart?.data?.planets) {
      natalPlanets = natalChart.data.planets;
    } else if (natalChart?.planets) {
      natalPlanets = natalChart.planets;
    } else if (natalChart?.data) {
      natalPlanets = natalChart.data;
    }

    if (!natalPlanets) {
      console.log('Натальные планеты не найдены, используем моковые данные');
      // Используем моковые данные натальной карты для демонстрации
      natalPlanets = {
        sun: { longitude: 135.5, sign: 'Leo', degree: 15.5 },
        moon: { longitude: 98.2, sign: 'Cancer', degree: 8.2 },
        mercury: { longitude: 172.1, sign: 'Virgo', degree: 22.1 },
        venus: { longitude: 123.8, sign: 'Leo', degree: 3.8 },
        mars: { longitude: 228.9, sign: 'Scorpio', degree: 18.9 },
        jupiter: { longitude: 342.3, sign: 'Pisces', degree: 12.3 },
        saturn: { longitude: 295.7, sign: 'Capricorn', degree: 25.7 },
        uranus: { longitude: 67.4, sign: 'Gemini', degree: 7.4 },
        neptune: { longitude: 344.8, sign: 'Pisces', degree: 14.8 },
        pluto: { longitude: 219.1, sign: 'Scorpio', degree: 9.1 }
      };
    }

    console.log('Используем натальные планеты:', natalPlanets);

    const transits: TransitData[] = [];

    // Проверяем аспекты между транзитными и натальными планетами
    transitPlanets.forEach(transitPlanet => {
      Object.entries(natalPlanets).forEach(([natalPlanetKey, natalPlanet]: [string, any]) => {
        const aspect = calculateAspect(transitPlanet.longitude, natalPlanet.longitude);
        
        console.log(`Проверяем аспект: ${transitPlanet.name} -> ${natalPlanetKey}`, aspect);
        
        if (aspect.aspect !== 'none' && aspect.orb <= 10) { // Увеличили орбис до 10 градусов
          transits.push({
            planet: transitPlanet.name,
            aspect: aspect.aspect,
            target: natalPlanetKey.charAt(0).toUpperCase() + natalPlanetKey.slice(1),
            orb: Math.round(aspect.orb * 10) / 10,
            date: date.toDateString(),
            description: getTransitDescription(transitPlanet.name, aspect.aspect, natalPlanetKey),
            type: getAspectType(aspect.aspect)
          });
        }
      });
    });

    console.log('Найдено транзитов:', transits.length);
    
    // Если транзитов нет, создаем демонстрационные
    if (transits.length === 0) {
      console.log('Создаем демонстрационные транзиты');
      const demoTransits: TransitData[] = [
        {
          planet: 'Saturn',
          aspect: 'square',
          target: 'Sun',
          orb: 2.5,
          date: date.toDateString(),
          description: 'Период проверки вашей уверенности в себе на прочность. Время стать более дисциплинированным.',
          type: 'challenging'
        },
        {
          planet: 'Jupiter',
          aspect: 'trine',
          target: 'Venus',
          orb: 1.8,
          date: date.toDateString(),
          description: 'Благоприятное время для любви и творчества. Расширение возможностей в отношениях.',
          type: 'harmonious'
        },
        {
          planet: 'Uranus',
          aspect: 'sextile',
          target: 'Mercury',
          orb: 3.2,
          date: date.toDateString(),
          description: 'Неожиданные идеи и прорывы в общении. Время для инноваций.',
          type: 'harmonious'
        }
      ];
      return demoTransits;
    }
    
    // Сортируем по орбису (более точные аспекты первыми)
    return transits.sort((a, b) => a.orb - b.orb);
  };

  // Функция для расчета аспекта между двумя долготами
  const calculateAspect = (longitude1: number, longitude2: number) => {
    let diff = Math.abs(longitude1 - longitude2);
    if (diff > 180) diff = 360 - diff;

    const aspects = [
      { name: 'conjunction', angle: 0, orb: 10 },
      { name: 'sextile', angle: 60, orb: 8 },
      { name: 'square', angle: 90, orb: 10 },
      { name: 'trine', angle: 120, orb: 10 },
      { name: 'opposition', angle: 180, orb: 10 }
    ];

    for (const aspect of aspects) {
      const orbDiff = Math.abs(diff - aspect.angle);
      if (orbDiff <= aspect.orb) {
        console.log(`Найден аспект: ${aspect.name}, разность: ${orbDiff.toFixed(2)}°`);
        return {
          aspect: aspect.name,
          orb: orbDiff
        };
      }
    }

    console.log(`Аспект не найден, разность: ${diff.toFixed(2)}°`);
    return { aspect: 'none', orb: diff };
  };

  // Функция для определения типа аспекта
  const getAspectType = (aspect: string): 'harmonious' | 'challenging' | 'neutral' => {
    switch (aspect) {
      case 'trine':
      case 'sextile':
        return 'harmonious';
      case 'square':
      case 'opposition':
        return 'challenging';
      case 'conjunction':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  // Функция для генерации описания транзита
  const getTransitDescription = (transitPlanet: string, aspect: string, natalPlanet: string): string => {
    const descriptions = {
      'Saturn': {
        'conjunction': 'Время серьезности и ответственности. Возможны ограничения, но и рост через дисциплину.',
        'square': 'Период испытаний и препятствий. Время пересмотра планов и укрепления основ.',
        'trine': 'Стабильность и структура. Благоприятное время для долгосрочных проектов.',
        'opposition': 'Конфликт между желаниями и обязанностями. Нужно найти баланс.',
        'sextile': 'Возможности для роста через терпение и упорство.'
      },
      'Jupiter': {
        'conjunction': 'Время расширения и роста. Новые возможности и оптимизм.',
        'square': 'Избыток энергии может привести к переоценке. Нужна умеренность.',
        'trine': 'Гармония и благополучие. Удача и успех в делах.',
        'opposition': 'Возможны конфликты из-за излишнего оптимизма.',
        'sextile': 'Благоприятные возможности для развития.'
      },
      'Uranus': {
        'conjunction': 'Время перемен и революций. Неожиданные события и прорывы.',
        'square': 'Напряжение и конфликты. Время для радикальных изменений.',
        'trine': 'Инновации и прогресс. Благоприятное время для экспериментов.',
        'opposition': 'Конфликт между традициями и новшествами.',
        'sextile': 'Возможности для творческих прорывов.'
      },
      'Neptune': {
        'conjunction': 'Время духовного поиска и интуиции. Возможны иллюзии.',
        'square': 'Путаница и неопределенность. Нужна осторожность.',
        'trine': 'Вдохновение и творчество. Духовное развитие.',
        'opposition': 'Конфликт между реальностью и идеалами.',
        'sextile': 'Возможности для духовного роста.'
      },
      'Pluto': {
        'conjunction': 'Время трансформации и возрождения. Глубокие изменения.',
        'square': 'Интенсивные испытания. Время для кардинальных перемен.',
        'trine': 'Мощная энергия для трансформации. Глубокие изменения.',
        'opposition': 'Конфликт между старым и новым.',
        'sextile': 'Возможности для глубокой трансформации.'
      }
    };

    return descriptions[transitPlanet as keyof typeof descriptions]?.[aspect as keyof typeof descriptions[typeof transitPlanet]] || 
           `Транзит ${transitPlanet} создает ${aspect} аспект с ${natalPlanet}.`;
  };

  const handleTimelineChange = (position: number) => {
    const newTime = startDate.getTime() + (position * totalTimeSpan);
    const newDate = new Date(newTime);
    setCurrentDate(newDate);
    timelinePosition.value = position;
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayPosition = (today.getTime() - startDate.getTime()) / totalTimeSpan;
    timelinePosition.value = withSpring(todayPosition);
  };

  const addHistoricalNote = () => {
    if (noteText.trim()) {
      const newNote: HistoricalNote = {
        date: currentDate.toDateString(),
        note: noteText.trim(),
        transits: activeTransits.map(t => `${t.planet} ${t.aspect} ${t.target}`)
      };
      setHistoricalNotes(prev => [...prev, newNote]);
      setNoteText('');
      setShowNoteModal(false);
      Alert.alert('✅', 'Заметка сохранена!');
    }
  };

  const getHistoricalNoteForDate = (date: Date) => {
    return historicalNotes.find(note => note.date === date.toDateString());
  };

  // Timeline PanResponder
  const timelinePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const timelineWidth = width * 0.8;
        const position = Math.max(0, Math.min(1, gestureState.moveX / timelineWidth));
        handleTimelineChange(position);
      },
    })
  ).current;

  const renderAstrologyChart = () => {
    const centerX = width * 0.45;
    const centerY = 200;
    const natalRadius = 80;
    const transitRadius = 120;

    return (
      <View style={styles.chartContainer}>
        <Svg width={width * 0.9} height={400}>
          {/* Внутренний круг - натальная карта */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={natalRadius}
            stroke="#8B5CF6"
            strokeWidth="2"
            fill="rgba(139, 92, 246, 0.1)"
          />
          
          {/* Внешний круг - транзиты */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={transitRadius}
            stroke="#A855F7"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
          />

          {/* Натальные планеты */}
          {natalChart?.data?.planets && Object.entries(natalChart.data.planets).map(([planetKey, planet]: [string, any], index) => {
            const angle = (planet.longitude * Math.PI) / 180;
            const x = centerX + natalRadius * Math.cos(angle - Math.PI / 2);
            const y = centerY + natalRadius * Math.sin(angle - Math.PI / 2);
            
            return (
              <G key={planetKey}>
                <Circle cx={x} cy={y} r="6" fill="#8B5CF6" />
                <SvgText x={x} y={y - 15} textAnchor="middle" fontSize="10" fill="#fff">
                  {planetKey.charAt(0).toUpperCase()}
                </SvgText>
              </G>
            );
          })}

          {/* Транзитные планеты */}
          {transitPlanets.map((planet, index) => {
            const angle = (planet.longitude * Math.PI) / 180;
            const x = centerX + transitRadius * Math.cos(angle - Math.PI / 2);
            const y = centerY + transitRadius * Math.sin(angle - Math.PI / 2);
            
            // Цвет планеты в зависимости от типа
            const planetColor = planet.name === 'Saturn' ? '#C0C0C0' :
                               planet.name === 'Jupiter' ? '#FFD700' :
                               planet.name === 'Uranus' ? '#4FD1C7' :
                               planet.name === 'Neptune' ? '#3B82F6' :
                               planet.name === 'Pluto' ? '#8B5CF6' : '#FFD700';
            
            return (
              <G key={planet.name}>
                <Circle cx={x} cy={y} r="8" fill={planetColor} stroke="#fff" strokeWidth="1" />
                <SvgText x={x} y={y - 20} textAnchor="middle" fontSize="10" fill={planetColor} fontWeight="bold">
                  {planet.name.charAt(0)}
                </SvgText>
              </G>
            );
          })}

          {/* Линии аспектов */}
          {activeTransits.slice(0, 5).map((transit, index) => {
            // Находим позиции планет для точного отображения линий
            const transitPlanet = transitPlanets.find(p => p.name === transit.planet);
            const natalPlanet = natalChart?.data?.planets?.[transit.target.toLowerCase()];
            
            if (!transitPlanet || !natalPlanet) return null;
            
            const transitAngle = (transitPlanet.longitude * Math.PI) / 180;
            const natalAngle = (natalPlanet.longitude * Math.PI) / 180;
            
            const transitX = centerX + transitRadius * Math.cos(transitAngle - Math.PI / 2);
            const transitY = centerY + transitRadius * Math.sin(transitAngle - Math.PI / 2);
            const natalX = centerX + natalRadius * Math.cos(natalAngle - Math.PI / 2);
            const natalY = centerY + natalRadius * Math.sin(natalAngle - Math.PI / 2);
            
            const aspectColor = transit.type === 'harmonious' ? '#22C55E' : 
                               transit.type === 'challenging' ? '#EF4444' : '#6B7280';
            
            return (
              <Line
                key={`${transit.planet}-${transit.target}-${index}`}
                x1={transitX}
                y1={transitY}
                x2={natalX}
                y2={natalY}
                stroke={aspectColor}
                strokeWidth={Math.max(1, 3 - transit.orb)}
                opacity={Math.max(0.3, 1 - transit.orb / 5)}
                strokeDasharray={transit.aspect === 'conjunction' ? '0' : '3,3'}
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  const renderTimeline = () => {
    const timelineWidth = width * 0.8;
    const currentPosition = (currentDate.getTime() - startDate.getTime()) / totalTimeSpan;

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Машина Времени</Text>
        
        <View style={styles.timelineDates}>
          <Text style={styles.timelineDate}>{startDate.getFullYear()}</Text>
          <Text style={styles.currentDate}>
            {currentDate.toLocaleDateString('ru-RU', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </Text>
          <Text style={styles.timelineDate}>{endDate.getFullYear()}</Text>
        </View>

        <View 
          style={[styles.timelineTrack, { width: timelineWidth }]}
          {...timelinePanResponder.panHandlers}
        >
          <View style={styles.timelineProgress} />
          <Animated.View 
            style={[
              styles.timelineHandle,
              { left: currentPosition * timelineWidth - 15 }
            ]}
          >
            <Ionicons name="time" size={20} color="#fff" />
          </Animated.View>
        </View>

        <View style={styles.timelineControls}>
          <TouchableOpacity onPress={goToToday} style={styles.timelineButton}>
            <Ionicons name="today" size={16} color="#8B5CF6" />
            <Text style={styles.timelineButtonText}>Сегодня</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowNoteModal(true)}
            style={[styles.timelineButton, getHistoricalNoteForDate(currentDate) && styles.timelineButtonWithNote]}
          >
            <Ionicons name="document-text" size={16} color="#8B5CF6" />
            <Text style={styles.timelineButtonText}>
              {getHistoricalNoteForDate(currentDate) ? 'Есть заметка' : 'Заметка'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              const nextYear = new Date(currentDate);
              nextYear.setFullYear(nextYear.getFullYear() + 1);
              setCurrentDate(nextYear);
            }}
            style={styles.timelineButton}
          >
            <Ionicons name="calendar" size={16} color="#8B5CF6" />
            <Text style={styles.timelineButtonText}>+1 Год</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderActiveTransits = () => {
    return (
      <View style={styles.transitsContainer}>
        <View style={styles.transitsTitleContainer}>
          <View>
            <Text style={styles.transitsTitle}>Активные Транзиты</Text>
            {!transitsLoading && (
              <Text style={styles.transitsCount}>
                {activeTransits.length} транзитов на {currentDate.toLocaleDateString('ru-RU')}
              </Text>
            )}
          </View>
          <View style={styles.transitsControls}>
            {transitsLoading && (
              <View style={styles.loadingIndicator}>
                <Text style={styles.loadingText}>Обновление...</Text>
              </View>
            )}
            <TouchableOpacity 
              onPress={() => loadTransitsForDate(currentDate)}
              style={styles.refreshTransitsButton}
            >
              <Ionicons name="refresh" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>
        
        {transitsLoading ? (
          <View style={styles.transitsLoading}>
            <ShimmerLoader width={width * 0.8} height={60} borderRadius={15} />
            <View style={{ height: 10 }} />
            <ShimmerLoader width={width * 0.8} height={60} borderRadius={15} />
            <View style={{ height: 10 }} />
            <ShimmerLoader width={width * 0.8} height={60} borderRadius={15} />
          </View>
        ) : (
          <>
            {activeTransits.map((transit, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.transitItem,
              { borderLeftColor: 
                transit.type === 'harmonious' ? '#22C55E' : 
                transit.type === 'challenging' ? '#EF4444' : '#6B7280'
              }
            ]}
            onPress={() => setSelectedTransit(transit)}
          >
            <View style={styles.transitHeader}>
              <Text style={styles.transitTitle}>
                {transit.planet} {transit.aspect} {transit.target}
              </Text>
              <Text style={styles.transitOrb}>±{transit.orb}°</Text>
            </View>
            <Text style={styles.transitDescription} numberOfLines={2}>
              {transit.description}
            </Text>
          </TouchableOpacity>
        ))}

            {activeTransits.length === 0 && (
              <View style={styles.emptyTransits}>
                <Ionicons name="planet-outline" size={40} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyTransitsText}>Нет активных транзитов</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <AnimatedStars />
        <View style={styles.loadingContainer}>
          <ShimmerLoader width={300} height={300} borderRadius={150} />
          <View style={{ height: 20 }} />
          <ShimmerLoader width={width * 0.8} height={60} borderRadius={30} />
          <View style={{ height: 20 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <ShimmerLoader width={width * 0.9} height={80} borderRadius={15} />
            </View>
          ))}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <AnimatedStars />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <Text style={styles.title}>Cosmic Time Machine</Text>
          <Text style={styles.subtitle}>Астрологический Симулятор</Text>
        </Animated.View>

        {/* Астрологическая карта */}
        <Animated.View entering={FadeIn.delay(400)} style={styles.chartSection}>
          {renderAstrologyChart()}
        </Animated.View>

        {/* Временная шкала */}
        <Animated.View entering={SlideInUp.delay(600)} style={styles.timelineSection}>
          {renderTimeline()}
        </Animated.View>

        {/* Активные транзиты */}
        <Animated.View entering={SlideInUp.delay(800)} style={styles.transitsSection}>
          {renderActiveTransits()}
        </Animated.View>

        {/* Кнопка "Почему я это чувствую?" */}
        <Animated.View entering={FadeIn.delay(1000)} style={styles.feelingSection}>
          <TouchableOpacity 
            style={styles.feelingButton}
            onPress={() => {
              Alert.alert(
                "Почему я это чувствую?",
                "Сейчас Сатурн создает напряжение с вашим Солнцем, что может вызывать ощущение ограничений. Юпитер поддерживает Венеру - хорошее время для творчества и любви.",
                [{ text: "Понятно", style: "default" }]
              );
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.feelingGradient}
            >
              <Ionicons name="help-circle" size={24} color="#fff" />
              <Text style={styles.feelingText}>Почему я это чувствую?</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Модал для заметок */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getHistoricalNoteForDate(currentDate) ? 'Ваша заметка' : 'Что было в этот период?'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowNoteModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDate}>
              {currentDate.toLocaleDateString('ru-RU', { 
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
              })}
            </Text>

            {getHistoricalNoteForDate(currentDate) ? (
              <View>
                <Text style={styles.existingNote}>
                  {getHistoricalNoteForDate(currentDate)?.note}
                </Text>
                <Text style={styles.noteTransits}>
                  Активные транзиты: {getHistoricalNoteForDate(currentDate)?.transits.join(', ')}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setNoteText(getHistoricalNoteForDate(currentDate)?.note || '');
                  }}
                  style={styles.editNoteButton}
                >
                  <Text style={styles.editNoteText}>Редактировать</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.modalDescription}>
                  Добавьте заметку о том, что происходило в вашей жизни в этот период. 
                  Это поможет лучше понять влияние астрологических циклов.
                </Text>
                
                <TextInput
                  style={styles.noteInput}
                  placeholder="Что происходило в вашей жизни..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                    onPress={addHistoricalNote}
                    style={styles.modalSaveButton}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.modalSaveGradient}
                    >
                      <Text style={styles.modalSaveText}>Сохранить</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  chartSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  timelineSection: {
    width: '100%',
    marginBottom: 30,
  },
  timelineContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  timelineDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  timelineDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  currentDate: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineTrack: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  timelineProgress: {
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  timelineHandle: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    top: 5,
  },
  timelineControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  timelineButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  timelineButtonWithNote: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  transitsSection: {
    width: '100%',
    marginBottom: 30,
  },
  transitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  transitsTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transitsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  transitsCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  loadingIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  loadingText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshTransitsButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  transitsLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  transitItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transitTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transitOrb: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  transitDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTransits: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTransitsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginTop: 10,
  },
  feelingSection: {
    width: '100%',
    alignItems: 'center',
  },
  feelingButton: {
    borderRadius: 25,
  },
  feelingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
  },
  feelingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Стили для модала заметок
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalDate: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 20,
  },
  existingNote: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  noteTransits: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  editNoteButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  editNoteText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 12,
  },
  modalSaveGradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
