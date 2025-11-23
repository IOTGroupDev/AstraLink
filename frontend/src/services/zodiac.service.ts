// services/zodiac.service.ts
// Сервис для работы со знаками зодиака, стихиями и описаниями

export type ZodiacSignKey =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type ElementType = 'fire' | 'earth' | 'air' | 'water';

export interface ZodiacSign {
  key: ZodiacSignKey;
  nameRu: string;
  nameEn: string;
  element: ElementType;
  elementRu: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  shortDescription: string;
  traits: string[];
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    key: 'aries',
    nameRu: 'ОВЕН',
    nameEn: 'Aries',
    element: 'fire',
    elementRu: 'Огонь',
    startDate: { month: 3, day: 21 },
    endDate: { month: 4, day: 19 },
    shortDescription:
      'Энергичный первопроходец с неиссякаемой жаждой действия. Рождённые под этим знаком обладают силой воли и смелостью начинать новое.',
    traits: ['Смелость', 'Энергия', 'Лидерство', 'Импульсивность'],
  },
  {
    key: 'taurus',
    nameRu: 'ТЕЛЕЦ',
    nameEn: 'Taurus',
    element: 'earth',
    elementRu: 'Земля',
    startDate: { month: 4, day: 20 },
    endDate: { month: 5, day: 20 },
    shortDescription:
      'Надёжный и практичный знак, ценящий стабильность и красоту. Тельцы обладают терпением и умением создавать материальное благополучие.',
    traits: ['Надёжность', 'Терпение', 'Чувственность', 'Упорство'],
  },
  {
    key: 'gemini',
    nameRu: 'БЛИЗНЕЦЫ',
    nameEn: 'Gemini',
    element: 'air',
    elementRu: 'Воздух',
    startDate: { month: 5, day: 21 },
    endDate: { month: 6, day: 20 },
    shortDescription:
      'Любознательный и коммуникабельный знак с живым умом. Близнецы легко адаптируются и обладают даром красноречия.',
    traits: ['Любознательность', 'Коммуникабельность', 'Гибкость', 'Остроумие'],
  },
  {
    key: 'cancer',
    nameRu: 'РАК',
    nameEn: 'Cancer',
    element: 'water',
    elementRu: 'Вода',
    startDate: { month: 6, day: 21 },
    endDate: { month: 7, day: 22 },
    shortDescription:
      'Эмоциональный и заботливый знак с развитой интуицией. Раки глубоко чувствуют и создают уют вокруг себя.',
    traits: ['Эмпатия', 'Интуиция', 'Забота', 'Чувствительность'],
  },
  {
    key: 'leo',
    nameRu: 'ЛЕВ',
    nameEn: 'Leo',
    element: 'fire',
    elementRu: 'Огонь',
    startDate: { month: 7, day: 23 },
    endDate: { month: 8, day: 22 },
    shortDescription:
      'Яркий и великодушный знак с природным магнетизмом. Львы вдохновляют окружающих и стремятся к самовыражению.',
    traits: ['Щедрость', 'Харизма', 'Креативность', 'Уверенность'],
  },
  {
    key: 'virgo',
    nameRu: 'ДЕВА',
    nameEn: 'Virgo',
    element: 'earth',
    elementRu: 'Земля',
    startDate: { month: 8, day: 23 },
    endDate: { month: 9, day: 22 },
    shortDescription:
      'Аналитичный и совершенствующий знак с вниманием к деталям. Девы обладают практичностью и стремлением к порядку.',
    traits: ['Аналитика', 'Практичность', 'Перфекционизм', 'Служение'],
  },
  {
    key: 'libra',
    nameRu: 'ВЕСЫ',
    nameEn: 'Libra',
    element: 'air',
    elementRu: 'Воздух',
    startDate: { month: 9, day: 23 },
    endDate: { month: 10, day: 22 },
    shortDescription:
      'Гармоничный и дипломатичный знак, стремящийся к балансу. Весы обладают чувством справедливости и эстетики.',
    traits: ['Дипломатия', 'Гармония', 'Справедливость', 'Обаяние'],
  },
  {
    key: 'scorpio',
    nameRu: 'СКОРПИОН',
    nameEn: 'Scorpio',
    element: 'water',
    elementRu: 'Вода',
    startDate: { month: 10, day: 23 },
    endDate: { month: 11, day: 21 },
    shortDescription:
      'Интенсивный и трансформирующий знак с мощной энергией. Скорпионы видят глубину вещей и обладают внутренней силой.',
    traits: ['Страстность', 'Проницательность', 'Трансформация', 'Сила воли'],
  },
  {
    key: 'sagittarius',
    nameRu: 'СТРЕЛЕЦ',
    nameEn: 'Sagittarius',
    element: 'fire',
    elementRu: 'Огонь',
    startDate: { month: 11, day: 22 },
    endDate: { month: 12, day: 21 },
    shortDescription:
      'Оптимистичный искатель истины с широким кругозором. Стрельцы стремятся к познанию мира и философским открытиям.',
    traits: ['Оптимизм', 'Свобода', 'Философия', 'Приключения'],
  },
  {
    key: 'capricorn',
    nameRu: 'КОЗЕРОГ',
    nameEn: 'Capricorn',
    element: 'earth',
    elementRu: 'Земля',
    startDate: { month: 12, day: 22 },
    endDate: { month: 1, day: 19 },
    shortDescription:
      'Целеустремлённый и дисциплинированный знак с долгосрочным видением. Козероги строят прочные основы для успеха.',
    traits: ['Амбиции', 'Дисциплина', 'Ответственность', 'Мудрость'],
  },
  {
    key: 'aquarius',
    nameRu: 'ВОДОЛЕЙ',
    nameEn: 'Aquarius',
    element: 'air',
    elementRu: 'Воздух',
    startDate: { month: 1, day: 20 },
    endDate: { month: 2, day: 18 },
    shortDescription:
      'Прогрессивный и независимый знак с оригинальным мышлением. Водолеи стремятся к инновациям и гуманитарным идеалам.',
    traits: ['Оригинальность', 'Гуманизм', 'Независимость', 'Инновации'],
  },
  {
    key: 'pisces',
    nameRu: 'РЫБЫ',
    nameEn: 'Pisces',
    element: 'water',
    elementRu: 'Вода',
    startDate: { month: 2, day: 19 },
    endDate: { month: 3, day: 20 },
    shortDescription:
      'Чуткий и творческий знак с богатым внутренним миром. Рыбы обладают состраданием и способностью к духовному постижению.',
    traits: ['Интуиция', 'Сострадание', 'Креативность', 'Духовность'],
  },
];

// Утилита для проверки попадания даты в диапазон
function isDateInRange(
  month: number,
  day: number,
  start: { month: number; day: number },
  end: { month: number; day: number }
): boolean {
  // Если диапазон переваливает через новый год (Козерог)
  if (start.month > end.month) {
    return (
      month > start.month ||
      (month === start.month && day >= start.day) ||
      month < end.month ||
      (month === end.month && day <= end.day)
    );
  }

  // Обычный диапазон в пределах года
  if (month < start.month || month > end.month) {
    return false;
  }
  if (month === start.month && day < start.day) {
    return false;
  }
  if (month === end.month && day > end.day) {
    return false;
  }
  return true;
}

// Основная функция определения знака зодиака
export function getZodiacSign(day: number, month: number): ZodiacSign {
  const sign = ZODIAC_SIGNS.find((sign) =>
    isDateInRange(month, day, sign.startDate, sign.endDate)
  );

  // Fallback на первый знак (не должно случиться при корректных данных)
  return sign || ZODIAC_SIGNS[0];
}

// Форматирование диапазона дат на русском
export function formatDateRange(sign: ZodiacSign): string {
  const months = [
    'ЯНВ',
    'ФЕВ',
    'МАР',
    'АПР',
    'МАЙ',
    'ИЮН',
    'ИЮЛ',
    'АВГ',
    'СЕН',
    'ОКТ',
    'НОЯ',
    'ДЕК',
  ];

  const startStr = `${String(sign.startDate.day).padStart(2, '0')} ${
    months[sign.startDate.month - 1]
  }`;
  const endStr = `${String(sign.endDate.day).padStart(2, '0')} ${
    months[sign.endDate.month - 1]
  }`;

  return `${startStr} - ${endStr}`;
}

// Получить все знаки определённой стихии
export function getSignsByElement(element: ElementType): ZodiacSign[] {
  return ZODIAC_SIGNS.filter((sign) => sign.element === element);
}

// Получить описание стихии
export function getElementDescription(element: ElementType): string {
  const descriptions = {
    fire: 'Огненные знаки — источник энергии, страсти и инициативы. Они вдохновляют и ведут за собой.',
    earth:
      'Земные знаки — основа стабильности и практичности. Они создают материальную реальность.',
    air: 'Воздушные знаки — носители идей и коммуникации. Они связывают людей и распространяют знания.',
    water:
      'Водные знаки — хранители эмоций и интуиции. Они чувствуют глубину и понимают невидимое.',
  };

  return descriptions[element];
}

// Экспорт всех знаков для использования в других компонентах
export const getAllZodiacSigns = (): ZodiacSign[] => ZODIAC_SIGNS;
