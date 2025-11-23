// Хелпер для расчета позиций планет и астрологических аспектов

export interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
}

export interface AspectResult {
  aspect: string;
  orb: number;
}

/**
 * Расчет позиций транзитных планет на указанную дату
 * Использует упрощенную модель движения планет
 */
export const calculateTransitPlanets = (
  date: Date = new Date()
): PlanetPosition[] => {
  const daysSinceEpoch = Math.floor(
    (date.getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24)
  );

  // Скорости движения планет (градусы в день)
  const planetSpeeds = {
    Saturn: 0.033, // ~30 лет на круг
    Jupiter: 0.083, // ~12 лет на круг
    Uranus: 0.014, // ~84 года на круг
    Neptune: 0.006, // ~165 лет на круг
    Pluto: 0.004, // ~248 лет на круг
  };

  // Начальные позиции планет (примерные на 01.01.2000)
  const initialPositions = {
    Saturn: 280,
    Jupiter: 45,
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
    });
  });

  return planets;
};

/**
 * Определение знака зодиака по долготе (0-360°)
 */
export const getSignFromLongitude = (longitude: number): string => {
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
  return signs[signIndex];
};

/**
 * Русские названия знаков зодиака
 */
export const getSignNameRu = (sign: string): string => {
  const signNames: Record<string, string> = {
    Aries: 'Овен',
    Taurus: 'Телец',
    Gemini: 'Близнецы',
    Cancer: 'Рак',
    Leo: 'Лев',
    Virgo: 'Дева',
    Libra: 'Весы',
    Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец',
    Capricorn: 'Козерог',
    Aquarius: 'Водолей',
    Pisces: 'Рыбы',
  };
  return signNames[sign] || sign;
};

/**
 * Расчет аспекта между двумя планетами по их долготам
 */
export const calculateAspect = (
  longitude1: number,
  longitude2: number
): AspectResult => {
  let diff = Math.abs(longitude1 - longitude2);
  if (diff > 180) diff = 360 - diff;

  const aspects = [
    { name: 'conjunction', angle: 0, orb: 10 },
    { name: 'sextile', angle: 60, orb: 8 },
    { name: 'square', angle: 90, orb: 10 },
    { name: 'trine', angle: 120, orb: 10 },
    { name: 'opposition', angle: 180, orb: 10 },
  ];

  for (const aspect of aspects) {
    const orbDiff = Math.abs(diff - aspect.angle);
    if (orbDiff <= aspect.orb) {
      return {
        aspect: aspect.name,
        orb: orbDiff,
      };
    }
  }

  return { aspect: 'none', orb: diff };
};

/**
 * Определение типа аспекта (гармоничный, напряженный, нейтральный)
 */
export const getAspectType = (
  aspect: string
): 'harmonious' | 'challenging' | 'neutral' => {
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

/**
 * Русские названия аспектов
 */
export const getAspectNameRu = (aspect: string): string => {
  const aspectNames: Record<string, string> = {
    conjunction: 'Соединение',
    sextile: 'Секстиль',
    square: 'Квадрат',
    trine: 'Трин',
    opposition: 'Оппозиция',
    none: 'Нет аспекта',
  };
  return aspectNames[aspect] || aspect;
};

/**
 * Цвет планеты для визуализации
 */
export const getPlanetColor = (planetName: string): string => {
  const colors: Record<string, string> = {
    Saturn: '#C0C0C0',
    Jupiter: '#FFD700',
    Uranus: '#4FD1C7',
    Neptune: '#3B82F6',
    Pluto: '#8B5CF6',
    Sun: '#FFA500',
    Moon: '#E0E0E0',
    Mercury: '#A0A0A0',
    Venus: '#FF69B4',
    Mars: '#FF4500',
  };
  return colors[planetName] || '#FFD700';
};

/**
 * Цвет аспекта для визуализации
 */
export const getAspectColor = (
  aspectType: 'harmonious' | 'challenging' | 'neutral'
): string => {
  switch (aspectType) {
    case 'harmonious':
      return '#22C55E';
    case 'challenging':
      return '#EF4444';
    case 'neutral':
      return '#6B7280';
  }
};

/**
 * Моковые натальные планеты для демонстрации
 */
export const getMockNatalPlanets = () => ({
  sun: { longitude: 135.5, sign: 'Leo', degree: 15.5 },
  moon: { longitude: 98.2, sign: 'Cancer', degree: 8.2 },
  mercury: { longitude: 172.1, sign: 'Virgo', degree: 22.1 },
  venus: { longitude: 123.8, sign: 'Leo', degree: 3.8 },
  mars: { longitude: 228.9, sign: 'Scorpio', degree: 18.9 },
  jupiter: { longitude: 342.3, sign: 'Pisces', degree: 12.3 },
  saturn: { longitude: 295.7, sign: 'Capricorn', degree: 25.7 },
  uranus: { longitude: 67.4, sign: 'Gemini', degree: 7.4 },
  neptune: { longitude: 344.8, sign: 'Pisces', degree: 14.8 },
  pluto: { longitude: 219.1, sign: 'Scorpio', degree: 9.1 },
});

export interface TransitData {
  planet: string;
  aspect: string;
  target: string;
  orb: number;
  date: string;
  description: string;
  type: 'harmonious' | 'challenging' | 'neutral';
}

/**
 * Расчет активных транзитов между транзитными и натальными планетами
 */
export const calculateActiveTransits = (
  transitPlanets: PlanetPosition[],
  natalPlanets: Record<
    string,
    { longitude: number; sign: string; degree: number }
  >,
  date: Date = new Date()
): TransitData[] => {
  const transits: TransitData[] = [];

  // Проверяем аспекты между транзитными и натальными планетами
  transitPlanets.forEach((transitPlanet) => {
    Object.entries(natalPlanets).forEach(([natalPlanetKey, natalPlanet]) => {
      const aspect = calculateAspect(
        transitPlanet.longitude,
        natalPlanet.longitude
      );

      // Орбис до 8 градусов для значимых аспектов
      if (aspect.aspect !== 'none' && aspect.orb <= 8) {
        transits.push({
          planet: transitPlanet.name,
          aspect: aspect.aspect,
          target:
            natalPlanetKey.charAt(0).toUpperCase() + natalPlanetKey.slice(1),
          orb: Math.round(aspect.orb * 10) / 10,
          date: date.toDateString(),
          description: getTransitDescription(
            transitPlanet.name,
            aspect.aspect,
            natalPlanetKey
          ),
          type: getAspectType(aspect.aspect),
        });
      }
    });
  });

  // Сортируем по орбису (более точные аспекты первыми)
  return transits.sort((a, b) => a.orb - b.orb);
};

/**
 * Генерация описания транзита
 */
const getTransitDescription = (
  transitPlanet: string,
  aspect: string,
  natalPlanet: string
): string => {
  const descriptions: Record<string, Record<string, string>> = {
    Saturn: {
      conjunction:
        'Время серьезности и ответственности. Возможны ограничения, но и рост через дисциплину.',
      square:
        'Период испытаний и препятствий. Время пересмотра планов и укрепления основ.',
      trine:
        'Стабильность и структура. Благоприятное время для долгосрочных проектов.',
      opposition:
        'Конфликт между желаниями и обязанностями. Нужно найти баланс.',
      sextile: 'Возможности для роста через терпение и упорство.',
    },
    Jupiter: {
      conjunction: 'Время расширения и роста. Новые возможности и оптимизм.',
      square: 'Избыток энергии может привести к переоценке. Нужна умеренность.',
      trine: 'Гармония и благополучие. Удача и успех в делах.',
      opposition: 'Возможны конфликты из-за излишнего оптимизма.',
      sextile: 'Благоприятные возможности для развития.',
    },
    Uranus: {
      conjunction: 'Время перемен и революций. Неожиданные события и прорывы.',
      square: 'Напряжение и конфликты. Время для радикальных изменений.',
      trine: 'Инновации и прогресс. Благоприятное время для экспериментов.',
      opposition: 'Конфликт между традициями и новшествами.',
      sextile: 'Возможности для творческих прорывов.',
    },
    Neptune: {
      conjunction: 'Время духовного поиска и интуиции. Возможны иллюзии.',
      square: 'Путаница и неопределенность. Нужна осторожность.',
      trine: 'Вдохновение и творчество. Духовное развитие.',
      opposition: 'Конфликт между реальностью и идеалами.',
      sextile: 'Возможности для духовного роста.',
    },
    Pluto: {
      conjunction: 'Время трансформации и возрождения. Глубокие изменения.',
      square: 'Интенсивные испытания. Время для кардинальных перемен.',
      trine: 'Мощная энергия для трансформации. Глубокие изменения.',
      opposition: 'Конфликт между старым и новым.',
      sextile: 'Возможности для глубокой трансформации.',
    },
  };

  return (
    descriptions[transitPlanet]?.[aspect] ||
    `Транзит ${transitPlanet} создает ${aspect} аспект с ${natalPlanet}.`
  );
};
