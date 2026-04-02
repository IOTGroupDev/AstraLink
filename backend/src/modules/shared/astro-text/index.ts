// backend/src/modules/shared/astro-text/index.ts
// Locale router facade over RU/EN dictionaries for interpretations and horoscope templates.

import type { PlanetKey, Sign, AspectType, PeriodFrame, Tone } from './types';
import {
  ASPECT_NAMES_RU,
  PLANET_IN_SIGN_RU,
  ASCENDANT_RU,
  HOUSES_THEMES_RU,
  HOUSES_AREAS_RU,
  GENERAL_TEMPLATES_RU,
  LOVE_PERIOD_PHRASES_RU,
  CAREER_PERIOD_ACTIONS_RU,
  ADVICE_POOLS_RU,
  SIGN_COLORS_RU,
  ASPECT_PAIR_TEMPLATES_RU,
  ASCENDANT_META_RU,
  HOUSE_SIGN_INTERPRETATIONS_RU,
  // Extended RU dictionaries
  PLANET_IN_SIGN_EXT_RU,
  ASCENDANT_EXT_RU,
  HOUSE_SIGN_INTERPRETATIONS_EXT_RU,
} from './ru/data';
import {
  ASPECT_NAMES_EN,
  PLANET_IN_SIGN_EN,
  ASCENDANT_EN,
  HOUSES_THEMES_EN,
  HOUSES_AREAS_EN,
  GENERAL_TEMPLATES_EN,
  LOVE_PERIOD_PHRASES_EN,
  CAREER_PERIOD_ACTIONS_EN,
  ADVICE_POOLS_EN,
  SIGN_COLORS_EN,
  ASPECT_PAIR_TEMPLATES_EN,
  ASCENDANT_META_EN,
  HOUSE_SIGN_INTERPRETATIONS_EN,
  // Extended EN dictionaries
  PLANET_IN_SIGN_EXT_EN,
  ASCENDANT_EXT_EN,
  HOUSE_SIGN_INTERPRETATIONS_EXT_EN,
} from './en/data';
import {
  ASPECT_NAMES_ES,
  PLANET_IN_SIGN_ES,
  ASCENDANT_ES,
  HOUSES_THEMES_ES,
  HOUSES_AREAS_ES,
  GENERAL_TEMPLATES_ES,
  LOVE_PERIOD_PHRASES_ES,
  CAREER_PERIOD_ACTIONS_ES,
  ADVICE_POOLS_ES,
  SIGN_COLORS_ES,
  ASPECT_PAIR_TEMPLATES_ES,
  HOUSE_SIGN_INTERPRETATIONS_ES,
  // Extended ES dictionaries
  PLANET_IN_SIGN_EXT_ES,
  ASCENDANT_EXT_ES,
  HOUSE_SIGN_INTERPRETATIONS_EXT_ES,
} from './es/data';

// Fallbacks
const DEFAULT_COLORS_RU = ['Белый', 'Синий'];
const DEFAULT_COLORS_EN = ['White', 'Blue'];
const DEFAULT_COLORS_ES = ['Blanco', 'Azul'];

const DEFAULT_GENERAL_RU: Record<Tone, string[]> = {
  positive: ['Позитивная астрологическая картина поддерживает ваши начинания.'],
  neutral: ['Стабильный период — действуйте последовательно.'],
  challenging: ['Потребуется терпение и внимание к деталям.'],
};

const DEFAULT_GENERAL_EN: Record<Tone, string[]> = {
  positive: ['Positive configuration supports your initiatives.'],
  neutral: ['A stable period — act consistently.'],
  challenging: ['You will need patience and attention to detail.'],
};

const DEFAULT_GENERAL_ES: Record<Tone, string[]> = {
  positive: ['Configuración favorable apoya tus iniciativas.'],
  neutral: ['Período estable — actúa con constancia.'],
  challenging: ['Se requiere paciencia y atención al detalle.'],
};

// Locale dictionaries router
function dicts(locale: 'ru' | 'en' | 'es') {
  if (locale === 'en') {
    return {
      aspectNames: ASPECT_NAMES_EN,
      planetInSign: PLANET_IN_SIGN_EN,
      ascendant: ASCENDANT_EN,
      housesThemes: HOUSES_THEMES_EN,
      housesAreas: HOUSES_AREAS_EN,
      generalTemplates: GENERAL_TEMPLATES_EN,
      lovePhrases: LOVE_PERIOD_PHRASES_EN,
      careerActions: CAREER_PERIOD_ACTIONS_EN,
      advicePools: ADVICE_POOLS_EN,
      signColors: SIGN_COLORS_EN,
      aspectPairTemplates: ASPECT_PAIR_TEMPLATES_EN,
      houseSignInterpretations: HOUSE_SIGN_INTERPRETATIONS_EN,
      // Expose extended EN dictionaries
      planetInSignExt: PLANET_IN_SIGN_EXT_EN,
      ascendantExt: ASCENDANT_EXT_EN,
      houseSignInterpretationsExt: HOUSE_SIGN_INTERPRETATIONS_EXT_EN,
      defaultGeneral: DEFAULT_GENERAL_EN,
      defaultColors: DEFAULT_COLORS_EN,
    };
  } else if (locale === 'es') {
    return {
      aspectNames: ASPECT_NAMES_ES,
      planetInSign: PLANET_IN_SIGN_ES,
      ascendant: ASCENDANT_ES,
      housesThemes: HOUSES_THEMES_ES,
      housesAreas: HOUSES_AREAS_ES,
      generalTemplates: GENERAL_TEMPLATES_ES,
      lovePhrases: LOVE_PERIOD_PHRASES_ES,
      careerActions: CAREER_PERIOD_ACTIONS_ES,
      advicePools: ADVICE_POOLS_ES,
      signColors: SIGN_COLORS_ES,
      aspectPairTemplates: ASPECT_PAIR_TEMPLATES_ES,
      houseSignInterpretations: HOUSE_SIGN_INTERPRETATIONS_ES,
      // Expose extended ES dictionaries
      planetInSignExt: PLANET_IN_SIGN_EXT_ES,
      ascendantExt: ASCENDANT_EXT_ES,
      houseSignInterpretationsExt: HOUSE_SIGN_INTERPRETATIONS_EXT_ES,
      defaultGeneral: DEFAULT_GENERAL_ES,
      defaultColors: DEFAULT_COLORS_ES,
    };
  }
  return {
    aspectNames: ASPECT_NAMES_RU,
    planetInSign: PLANET_IN_SIGN_RU,
    ascendant: ASCENDANT_RU,
    housesThemes: HOUSES_THEMES_RU,
    housesAreas: HOUSES_AREAS_RU,
    generalTemplates: GENERAL_TEMPLATES_RU,
    lovePhrases: LOVE_PERIOD_PHRASES_RU,
    careerActions: CAREER_PERIOD_ACTIONS_RU,
    advicePools: ADVICE_POOLS_RU,
    signColors: SIGN_COLORS_RU,
    aspectPairTemplates: ASPECT_PAIR_TEMPLATES_RU,
    houseSignInterpretations: HOUSE_SIGN_INTERPRETATIONS_RU,
    // Expose extended RU dictionaries
    planetInSignExt: PLANET_IN_SIGN_EXT_RU,
    ascendantExt: ASCENDANT_EXT_RU,
    houseSignInterpretationsExt: HOUSE_SIGN_INTERPRETATIONS_EXT_RU,
    defaultGeneral: DEFAULT_GENERAL_RU,
    defaultColors: DEFAULT_COLORS_RU,
  };
}

// Helpers: localized planet/sign names for generic fallbacks
function getPlanetName(planet: PlanetKey, locale: 'ru' | 'en' | 'es'): string {
  const ru: Record<PlanetKey, string> = {
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
    north_node: 'Северный Узел',
    south_node: 'Южный Узел',
    lilith: 'Лилит',
    chiron: 'Хирон',
  };
  const en: Record<PlanetKey, string> = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
    north_node: 'North Node',
    south_node: 'South Node',
    lilith: 'Lilith',
    chiron: 'Chiron',
  };
  const es: Record<PlanetKey, string> = {
    sun: 'Sol',
    moon: 'Luna',
    mercury: 'Mercurio',
    venus: 'Venus',
    mars: 'Marte',
    jupiter: 'Júpiter',
    saturn: 'Saturno',
    uranus: 'Urano',
    neptune: 'Neptuno',
    pluto: 'Plutón',
    north_node: 'Nodo Norte',
    south_node: 'Nodo Sur',
    lilith: 'Lilith',
    chiron: 'Quirón',
  };
  return (locale === 'en' ? en : locale === 'es' ? es : ru)[planet] || planet;
}

function getSignName(sign: Sign, locale: 'ru' | 'en' | 'es'): string {
  const ru: Record<Sign, string> = {
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
  const en: Record<Sign, string> = {
    Aries: 'Aries',
    Taurus: 'Taurus',
    Gemini: 'Gemini',
    Cancer: 'Cancer',
    Leo: 'Leo',
    Virgo: 'Virgo',
    Libra: 'Libra',
    Scorpio: 'Scorpio',
    Sagittarius: 'Sagittarius',
    Capricorn: 'Capricorn',
    Aquarius: 'Aquarius',
    Pisces: 'Pisces',
  };
  const es: Record<Sign, string> = {
    Aries: 'Aries',
    Taurus: 'Tauro',
    Gemini: 'Géminis',
    Cancer: 'Cáncer',
    Leo: 'Leo',
    Virgo: 'Virgo',
    Libra: 'Libra',
    Scorpio: 'Escorpio',
    Sagittarius: 'Sagitario',
    Capricorn: 'Capricornio',
    Aquarius: 'Acuario',
    Pisces: 'Piscis',
  };
  return (
    (locale === 'en' ? en : locale === 'es' ? es : ru)[sign] || (sign as string)
  );
}

/**
 * Trait dictionaries to generate non-repetitive keywords/strengths/challenges
 * per planet × sign. Kept intentionally concise but distinct.
 */
type Trait = { keywords: string[]; strengths: string[]; challenges: string[] };

const PLANET_TRAITS_RU: Record<PlanetKey, Trait> = {
  sun: {
    keywords: ['самовыражение', 'воля', 'эго'],
    strengths: ['Лидерство', 'Уверенность', 'Творчество'],
    challenges: ['Эгоцентризм', 'Доминирование'],
  },
  moon: {
    keywords: ['эмоции', 'интуиция', 'привычки'],
    strengths: ['Сочувствие', 'Забота', 'Адаптивность'],
    challenges: ['Перепады настроения', 'Ранимость'],
  },
  mercury: {
    keywords: ['мышление', 'речь', 'обучение'],
    strengths: ['Аналитичность', 'Коммуникабельность'],
    challenges: ['Поспешность выводов', 'Болтливость'],
  },
  venus: {
    keywords: ['привязанности', 'ценности', 'эстетика'],
    strengths: ['Дипломатия', 'Чуткость', 'Обаяние'],
    challenges: ['Избалованность', 'Идеализация'],
  },
  mars: {
    keywords: ['действие', 'энергия', 'воля'],
    strengths: ['Решительность', 'Смелость'],
    challenges: ['Импульсивность', 'Конфликтность'],
  },
  jupiter: {
    keywords: ['рост', 'смысл', 'удача'],
    strengths: ['Оптимизм', 'Широта взглядов'],
    challenges: ['Излишний риск', 'Самоуверенность'],
  },
  saturn: {
    keywords: ['структура', 'границы', 'ответственность'],
    strengths: ['Дисциплина', 'Стойкость'],
    challenges: ['Жесткость', 'Страх ошибок'],
  },
  uranus: {
    keywords: ['свобода', 'инновации', 'революция'],
    strengths: ['Оригинальность', 'Независимость'],
    challenges: ['Непредсказуемость', 'Отстраненность'],
  },
  neptune: {
    keywords: ['воображение', 'вера', 'растворение'],
    strengths: ['Интуиция', 'Вдохновение'],
    challenges: ['Иллюзии', 'Границы размыты'],
  },
  pluto: {
    keywords: ['сила', 'кризис', 'трансформация'],
    strengths: ['Проницательность', 'Регенерация'],
    challenges: ['Контроль', 'Одержимость'],
  },
  north_node: {
    keywords: ['рост', 'вектор', 'предназначение'],
    strengths: ['Устремленность'],
    challenges: ['Неуверенность пути'],
  },
  south_node: {
    keywords: ['опыт', 'инерция', 'прошлое'],
    strengths: ['Наследованные навыки'],
    challenges: ['Застревание в старом'],
  },
  lilith: {
    keywords: ['тень', 'инстинкт', 'свобода'],
    strengths: ['Аутентичность'],
    challenges: ['Крайности', 'Бунтарство'],
  },
  chiron: {
    keywords: ['рана', 'исцеление', 'мудрость'],
    strengths: ['Эмпатия', 'Наставничество'],
    challenges: ['Гиперчувствительность'],
  },
};

const PLANET_TRAITS_EN: Record<PlanetKey, Trait> = {
  sun: {
    keywords: ['self-expression', 'will', 'identity'],
    strengths: ['Leadership', 'Confidence', 'Creativity'],
    challenges: ['Egocentrism', 'Dominance'],
  },
  moon: {
    keywords: ['emotions', 'intuition', 'habits'],
    strengths: ['Empathy', 'Care', 'Adaptability'],
    challenges: ['Mood swings', 'Sensitivity'],
  },
  mercury: {
    keywords: ['thinking', 'speech', 'learning'],
    strengths: ['Analytic', 'Communication'],
    challenges: ['Hasty conclusions', 'Chatter'],
  },
  venus: {
    keywords: ['attachments', 'values', 'aesthetics'],
    strengths: ['Diplomacy', 'Sensitivity', 'Charm'],
    challenges: ['Indulgence', 'Idealization'],
  },
  mars: {
    keywords: ['action', 'energy', 'drive'],
    strengths: ['Decisiveness', 'Courage'],
    challenges: ['Impulsiveness', 'Aggression'],
  },
  jupiter: {
    keywords: ['growth', 'meaning', 'luck'],
    strengths: ['Optimism', 'Broad outlook'],
    challenges: ['Over-risk', 'Overconfidence'],
  },
  saturn: {
    keywords: ['structure', 'limits', 'duty'],
    strengths: ['Discipline', 'Endurance'],
    challenges: ['Rigidity', 'Fear of failure'],
  },
  uranus: {
    keywords: ['freedom', 'innovation', 'revolt'],
    strengths: ['Originality', 'Independence'],
    challenges: ['Unpredictability', 'Detachment'],
  },
  neptune: {
    keywords: ['imagination', 'faith', 'dissolution'],
    strengths: ['Intuition', 'Inspiration'],
    challenges: ['Illusions', 'Weak boundaries'],
  },
  pluto: {
    keywords: ['power', 'crisis', 'transformation'],
    strengths: ['Insight', 'Regeneration'],
    challenges: ['Control', 'Obsession'],
  },
  north_node: {
    keywords: ['growth', 'vector', 'purpose'],
    strengths: ['Aspiration'],
    challenges: ['Path uncertainty'],
  },
  south_node: {
    keywords: ['experience', 'inertia', 'past'],
    strengths: ['Inherited skills'],
    challenges: ['Stuck in old'],
  },
  lilith: {
    keywords: ['shadow', 'instinct', 'freedom'],
    strengths: ['Authenticity'],
    challenges: ['Extremes', 'Rebellion'],
  },
  chiron: {
    keywords: ['wound', 'healing', 'wisdom'],
    strengths: ['Empathy', 'Mentorship'],
    challenges: ['Hypersensitivity'],
  },
};

const PLANET_TRAITS_ES: Record<PlanetKey, Trait> = {
  sun: {
    keywords: ['autoexpresión', 'voluntad', 'identidad'],
    strengths: ['Liderazgo', 'Confianza', 'Creatividad'],
    challenges: ['Egocentrismo', 'Dominio'],
  },
  moon: {
    keywords: ['emociones', 'intuición', 'hábitos'],
    strengths: ['Empatía', 'Cuidado', 'Adaptabilidad'],
    challenges: ['Cambios de humor', 'Sensibilidad'],
  },
  mercury: {
    keywords: ['pensamiento', 'comunicación', 'aprendizaje'],
    strengths: ['Análisis', 'Comunicación'],
    challenges: ['Conclusiones apresuradas', 'Verborragia'],
  },
  venus: {
    keywords: ['afectos', 'valores', 'estética'],
    strengths: ['Diplomacia', 'Sensibilidad', 'Encanto'],
    challenges: ['Indulgencia', 'Idealización'],
  },
  mars: {
    keywords: ['acción', 'energía', 'impulso'],
    strengths: ['Decisión', 'Valentía'],
    challenges: ['Impulsividad', 'Agresividad'],
  },
  jupiter: {
    keywords: ['crecimiento', 'sentido', 'suerte'],
    strengths: ['Optimismo', 'Visión amplia'],
    challenges: ['Riesgo excesivo', 'Exceso de confianza'],
  },
  saturn: {
    keywords: ['estructura', 'límites', 'responsabilidad'],
    strengths: ['Disciplina', 'Resistencia'],
    challenges: ['Rigidez', 'Miedo al fracaso'],
  },
  uranus: {
    keywords: ['libertad', 'innovación', 'rebelión'],
    strengths: ['Originalidad', 'Independencia'],
    challenges: ['Imprevisibilidad', 'Distanciamiento'],
  },
  neptune: {
    keywords: ['imaginación', 'fe', 'disolución'],
    strengths: ['Intuición', 'Inspiración'],
    challenges: ['Ilusiones', 'Límites débiles'],
  },
  pluto: {
    keywords: ['poder', 'crisis', 'transformación'],
    strengths: ['Perspicacia', 'Regeneración'],
    challenges: ['Control', 'Obsesión'],
  },
  north_node: {
    keywords: ['crecimiento', 'dirección', 'propósito'],
    strengths: ['Aspiración'],
    challenges: ['Incertidumbre del camino'],
  },
  south_node: {
    keywords: ['experiencia', 'inercia', 'pasado'],
    strengths: ['Habilidades heredadas'],
    challenges: ['Estancamiento en lo viejo'],
  },
  lilith: {
    keywords: ['sombra', 'instinto', 'libertad'],
    strengths: ['Autenticidad'],
    challenges: ['Extremos', 'Rebeldía'],
  },
  chiron: {
    keywords: ['herida', 'sanación', 'sabiduría'],
    strengths: ['Empatía', 'Mentoría'],
    challenges: ['Hipersensibilidad'],
  },
};

const SIGN_TRAITS_RU: Record<Sign, Trait> = {
  Aries: {
    keywords: ['инициатива', 'прямота', 'скорость'],
    strengths: ['Смелость', 'Предприимчивость'],
    challenges: ['Поспешность', 'Резкость'],
  },
  Taurus: {
    keywords: ['устойчивость', 'практика', 'ценности'],
    strengths: ['Надежность', 'Терпение'],
    challenges: ['Упрямство', 'Инертность'],
  },
  Gemini: {
    keywords: ['коммуникация', 'гибкость', 'ум'],
    strengths: ['Обучаемость', 'Связность'],
    challenges: ['Поверхностность', 'Разброс'],
  },
  Cancer: {
    keywords: ['забота', 'интуиция', 'семья'],
    strengths: ['Сочувствие', 'Хранительство'],
    challenges: ['Ранимость', 'Зависимость'],
  },
  Leo: {
    keywords: ['яркость', 'творчество', 'сцена'],
    strengths: ['Харизма', 'Щедрость'],
    challenges: ['Пафос', 'Гордость'],
  },
  Virgo: {
    keywords: ['детали', 'служение', 'анализ'],
    strengths: ['Системность', 'Точность'],
    challenges: ['Критичность', 'Тревожность'],
  },
  Libra: {
    keywords: ['баланс', 'партнерство', 'эстетика'],
    strengths: ['Тактичность', 'Дипломатия'],
    challenges: ['Нерешительность', 'Зависимость от мнений'],
  },
  Scorpio: {
    keywords: ['глубина', 'сила', 'правда'],
    strengths: ['Проницательность', 'Стойкость'],
    challenges: ['Подозрительность', 'Ревность'],
  },
  Sagittarius: {
    keywords: ['смысл', 'поиск', 'свобода'],
    strengths: ['Оптимизм', 'Честность'],
    challenges: ['Излишняя прямота', 'Неусидчивость'],
  },
  Capricorn: {
    keywords: ['структура', 'цели', 'долг'],
    strengths: ['Ответственность', 'Стратегичность'],
    challenges: ['Жесткость', 'Холодность'],
  },
  Aquarius: {
    keywords: ['новаторство', 'сообщество', 'независимость'],
    strengths: ['Идеи', 'Объективность'],
    challenges: ['Отстраненность', 'Упрямство'],
  },
  Pisces: {
    keywords: ['эмпатия', 'воображение', 'духовность'],
    strengths: ['Интуиция', 'Сочувствие'],
    challenges: ['Рассеянность', 'Идеализация'],
  },
};

const SIGN_TRAITS_EN: Record<Sign, Trait> = {
  Aries: {
    keywords: ['initiative', 'direct', 'fast'],
    strengths: ['Courage', 'Enterprise'],
    challenges: ['Haste', 'Bluntness'],
  },
  Taurus: {
    keywords: ['stability', 'practical', 'values'],
    strengths: ['Reliability', 'Patience'],
    challenges: ['Stubbornness', 'Inertia'],
  },
  Gemini: {
    keywords: ['communication', 'flexible', 'mind'],
    strengths: ['Learnability', 'Connectedness'],
    challenges: ['Superficiality', 'Scattered'],
  },
  Cancer: {
    keywords: ['care', 'intuition', 'family'],
    strengths: ['Empathy', 'Nurturing'],
    challenges: ['Sensitivity', 'Dependency'],
  },
  Leo: {
    keywords: ['brightness', 'creativity', 'stage'],
    strengths: ['Charisma', 'Generosity'],
    challenges: ['Pomposity', 'Pride'],
  },
  Virgo: {
    keywords: ['details', 'service', 'analysis'],
    strengths: ['System', 'Precision'],
    challenges: ['Criticism', 'Anxiety'],
  },
  Libra: {
    keywords: ['balance', 'partnership', 'aesthetics'],
    strengths: ['Tact', 'Diplomacy'],
    challenges: ['Indecision', 'Dependence on opinions'],
  },
  Scorpio: {
    keywords: ['depth', 'power', 'truth'],
    strengths: ['Insight', 'Resilience'],
    challenges: ['Suspicion', 'Jealousy'],
  },
  Sagittarius: {
    keywords: ['meaning', 'quest', 'freedom'],
    strengths: ['Optimism', 'Honesty'],
    challenges: ['Over-frankness', 'Restlessness'],
  },
  Capricorn: {
    keywords: ['structure', 'goals', 'duty'],
    strengths: ['Responsibility', 'Strategic thinking'],
    challenges: ['Rigidity', 'Coldness'],
  },
  Aquarius: {
    keywords: ['innovation', 'community', 'independence'],
    strengths: ['Ideas', 'Objectivity'],
    challenges: ['Detachment', 'Stubbornness'],
  },
  Pisces: {
    keywords: ['empathy', 'imagination', 'spirituality'],
    strengths: ['Intuition', 'Compassion'],
    challenges: ['Distractibility', 'Idealization'],
  },
};

const SIGN_TRAITS_ES: Record<Sign, Trait> = {
  Aries: {
    keywords: ['iniciativa', 'directo', 'rápido'],
    strengths: ['Valentía', 'Emprendimiento'],
    challenges: ['Prisa', 'Brusquedad'],
  },
  Taurus: {
    keywords: ['estabilidad', 'práctico', 'valores'],
    strengths: ['Fiabilidad', 'Paciencia'],
    challenges: ['Terquedad', 'Inercia'],
  },
  Gemini: {
    keywords: ['comunicación', 'flexible', 'mente'],
    strengths: ['Aprendizaje', 'Conexión'],
    challenges: ['Superficialidad', 'Dispersión'],
  },
  Cancer: {
    keywords: ['cuidado', 'intuición', 'familia'],
    strengths: ['Empatía', 'Protección'],
    challenges: ['Sensibilidad', 'Dependencia'],
  },
  Leo: {
    keywords: ['brillo', 'creatividad', 'escena'],
    strengths: ['Carisma', 'Generosidad'],
    challenges: ['Pomposidad', 'Orgullo'],
  },
  Virgo: {
    keywords: ['detalles', 'servicio', 'análisis'],
    strengths: ['Orden', 'Precisión'],
    challenges: ['Crítica', 'Ansiedad'],
  },
  Libra: {
    keywords: ['equilibrio', 'alianza', 'estética'],
    strengths: ['Tacto', 'Diplomacia'],
    challenges: ['Indecisión', 'Dependencia de opiniones'],
  },
  Scorpio: {
    keywords: ['profundidad', 'poder', 'verdad'],
    strengths: ['Perspicacia', 'Resiliencia'],
    challenges: ['Suspicacia', 'Celos'],
  },
  Sagittarius: {
    keywords: ['sentido', 'búsqueda', 'libertad'],
    strengths: ['Optimismo', 'Honestidad'],
    challenges: ['Exceso de franqueza', 'Inquietud'],
  },
  Capricorn: {
    keywords: ['estructura', 'metas', 'deber'],
    strengths: ['Responsabilidad', 'Estrategia'],
    challenges: ['Rigidez', 'Frialdad'],
  },
  Aquarius: {
    keywords: ['innovación', 'comunidad', 'independencia'],
    strengths: ['Ideas', 'Objetividad'],
    challenges: ['Distanciamiento', 'Terquedad'],
  },
  Pisces: {
    keywords: ['empatía', 'imaginación', 'espiritualidad'],
    strengths: ['Intuición', 'Compasión'],
    challenges: ['Distracción', 'Idealización'],
  },
};

// Helper to merge and deduplicate with cap
function mergeTraits(a: string[] = [], b: string[] = [], cap = 6): string[] {
  const uniq = Array.from(new Set([...a, ...b].filter(Boolean)));
  return uniq.slice(0, cap);
}

function normalizeExtendedLine(line: string): string {
  return line
    .replace(/^[•\-\s]+/, '')
    .replace(/[.]+$/g, '')
    .trim();
}

function buildSupplementalText(
  baseText: string,
  extendedLines: string[] | undefined,
  locale: 'ru' | 'en' | 'es',
): string {
  if (!baseText || !extendedLines?.length) return baseText;

  const normalizedBase = baseText.toLowerCase();
  const cleaned = extendedLines
    .map(normalizeExtendedLine)
    .filter(Boolean)
    .filter((line) => !normalizedBase.includes(line.toLowerCase()));

  if (!cleaned.length) return baseText;

  const maxAdditions = baseText.length < 120 ? 2 : 1;
  const additions = cleaned.slice(0, maxAdditions);
  if (!additions.length) return baseText;

  const punctuated = additions.map((line) =>
    /[.!?…]$/.test(line) ? line : `${line}.`,
  );

  if (locale === 'en') {
    return `${baseText} ${punctuated.join(' ')}`.trim();
  }
  if (locale === 'es') {
    return `${baseText} ${punctuated.join(' ')}`.trim();
  }
  return `${baseText} ${punctuated.join(' ')}`.trim();
}

/**
 * Extended details (15 lines max recommended)
 */
export function getExtendedPlanetInSign(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  const byPlanet: Partial<Record<Sign, string[]>> | undefined =
    d.planetInSignExt?.[planet];
  if (!byPlanet) return [];
  return byPlanet[sign] || [];
}

export function getExtendedAscendant(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  const ext: Partial<Record<Sign, string[]>> | undefined = d.ascendantExt;
  if (!ext) return [];
  return ext[sign] || [];
}

export function getExtendedHouseSign(
  houseNum: number,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  const byHouse: Partial<Record<Sign, string[]>> | undefined =
    d.houseSignInterpretationsExt?.[houseNum];
  if (!byHouse) return [];
  return byHouse[sign] || [];
}

function getPlanetDomain(
  planet: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const ru: Record<PlanetKey, string> = {
    sun: 'воля, идентичность и способ проявлять себя',
    moon: 'эмоции, потребности и чувство безопасности',
    mercury: 'мышление, речь и способ обрабатывать информацию',
    venus: 'привязанности, ценности и стиль отношений',
    mars: 'энергия, напор и способ действовать',
    jupiter: 'рост, вера и расширение горизонтов',
    saturn: 'ответственность, границы и внутренний каркас',
    uranus: 'свобода, перемены и стремление к обновлению',
    neptune: 'воображение, идеалы и тонкая чувствительность',
    pluto: 'сила, кризисы и глубокая трансформация',
    north_node: 'вектор развития и задачи роста',
    south_node: 'привычные сценарии и прошлый опыт',
    lilith: 'сырая инстинктивная сила и тема запретного',
    chiron: 'уязвимость, исцеление и путь мудрости',
  };
  const en: Record<PlanetKey, string> = {
    sun: 'will, identity, and conscious self-expression',
    moon: 'emotions, needs, and inner safety',
    mercury: 'thinking, speech, and information processing',
    venus: 'attachment, values, and relating style',
    mars: 'energy, drive, and action',
    jupiter: 'growth, faith, and expansion',
    saturn: 'responsibility, structure, and boundaries',
    uranus: 'freedom, change, and awakening',
    neptune: 'imagination, ideals, and subtle sensitivity',
    pluto: 'power, crisis, and deep transformation',
    north_node: 'growth direction and developmental tasks',
    south_node: 'habit patterns and familiar past tendencies',
    lilith: 'raw instinct, taboo, and uncompromising truth',
    chiron: 'vulnerability, healing, and earned wisdom',
  };
  const es: Record<PlanetKey, string> = {
    sun: 'voluntad, identidad y autoexpresión consciente',
    moon: 'emociones, necesidades y seguridad interior',
    mercury: 'pensamiento, habla y procesamiento de información',
    venus: 'afecto, valores y estilo de vínculo',
    mars: 'energía, impulso y forma de actuar',
    jupiter: 'crecimiento, fe y expansión',
    saturn: 'responsabilidad, estructura y límites',
    uranus: 'libertad, cambio y despertar',
    neptune: 'imaginación, ideales y sensibilidad sutil',
    pluto: 'poder, crisis y transformación profunda',
    north_node: 'dirección evolutiva y tareas de crecimiento',
    south_node: 'patrones conocidos y experiencia pasada',
    lilith: 'instinto crudo, tabú y verdad incómoda',
    chiron: 'vulnerabilidad, sanación y sabiduría adquirida',
  };

  return (locale === 'en' ? en : locale === 'es' ? es : ru)[planet];
}

function getAspectCoreMeaning(
  aspect: string,
  locale: 'ru' | 'en' | 'es' = 'ru',
): {
  dynamic: string;
  gift: string;
  challenge: string;
  practice: string;
} {
  const ru: Record<
    AspectType,
    { dynamic: string; gift: string; challenge: string; practice: string }
  > = {
    conjunction: {
      dynamic: 'сливает две энергии в один мощный узел',
      gift: 'дает цельность, концентрацию и сильную включенность',
      challenge: 'может делать реакцию слишком прямой и неразделенной',
      practice:
        'учиться различать, где заканчивается один импульс и начинается другой',
    },
    sextile: {
      dynamic: 'создает рабочую совместимость и возможность сотрудничества',
      gift: 'дает полезные шансы, легкость контакта и обучаемость',
      challenge: 'часто остается потенциалом, если не делать конкретный шаг',
      practice:
        'активно использовать возникающие возможности, а не ждать идеального момента',
    },
    square: {
      dynamic: 'создает внутреннее трение и требует перестройки привычек',
      gift: 'дает силу роста, характер и высокую мотивацию к развитию',
      challenge:
        'может включать защитные реакции, раздражение и чувство постоянного давления',
      practice:
        'переводить напряжение в дисциплину, а не в самосаботаж или конфликт',
    },
    trine: {
      dynamic: 'связывает энергии естественно и плавно',
      gift: 'дает талант, внутреннюю поддержку и ощущение потока',
      challenge:
        'может создавать избыточную расслабленность и привычку полагаться только на легкость',
      practice: 'осознанно превращать природный дар в навык и результат',
    },
    opposition: {
      dynamic: 'ставит две энергии на разные полюса и требует баланса',
      gift: 'дает объемный взгляд, способность видеть обе стороны и развивать зрелость',
      challenge:
        'часто переживается как качели, проекция на других или внутренний раскол',
      practice:
        'не выбирать один полюс против другого, а искать живой диалог между ними',
    },
  };
  const en: Record<
    AspectType,
    { dynamic: string; gift: string; challenge: string; practice: string }
  > = {
    conjunction: {
      dynamic: 'fuses two energies into one concentrated knot',
      gift: 'brings focus, intensity, and strong involvement',
      challenge: 'can make reactions too merged and immediate',
      practice: 'learn to separate one impulse from the other before acting',
    },
    sextile: {
      dynamic: 'creates workable cooperation and an opening for growth',
      gift: 'brings useful opportunities, ease of contact, and learnability',
      challenge: 'often stays only potential if no concrete step is taken',
      practice: 'use openings actively instead of waiting for a perfect moment',
    },
    square: {
      dynamic: 'creates friction and demands a restructuring of habits',
      gift: 'builds character, momentum, and development through effort',
      challenge: 'can trigger defensiveness, irritation, and pressure',
      practice:
        'turn tension into discipline instead of conflict or self-sabotage',
    },
    trine: {
      dynamic: 'links two energies naturally and fluently',
      gift: 'brings talent, support, and a sense of flow',
      challenge: 'can become complacent if you rely only on ease',
      practice: 'turn natural gifts into conscious skill and consistent output',
    },
    opposition: {
      dynamic: 'places two energies on opposite poles and asks for balance',
      gift: 'offers perspective, maturity, and the ability to see both sides',
      challenge: 'can feel like oscillation, projection, or inner division',
      practice:
        'build dialogue between both poles instead of choosing one against the other',
    },
  };
  const es: Record<
    AspectType,
    { dynamic: string; gift: string; challenge: string; practice: string }
  > = {
    conjunction: {
      dynamic: 'fusiona dos energías en un mismo núcleo',
      gift: 'da concentración, intensidad y gran implicación',
      challenge: 'puede volver la reacción demasiado inmediata o mezclada',
      practice: 'aprender a distinguir un impulso del otro antes de actuar',
    },
    sextile: {
      dynamic: 'crea cooperación útil y una apertura para crecer',
      gift: 'trae oportunidades, facilidad de contacto y aprendizaje',
      challenge:
        'a menudo queda solo como potencial si no se concreta en acción',
      practice:
        'usar activamente las oportunidades en vez de esperar el momento perfecto',
    },
    square: {
      dynamic: 'genera fricción y exige reestructurar hábitos',
      gift: 'fortalece carácter, impulso y crecimiento mediante esfuerzo',
      challenge:
        'puede activar irritación, defensa y sensación de presión constante',
      practice:
        'convertir la tensión en disciplina y no en conflicto o autosabotaje',
    },
    trine: {
      dynamic: 'conecta dos energías de forma natural y fluida',
      gift: 'aporta talento, apoyo interno y sensación de flujo',
      challenge: 'puede volver cómoda la zona conocida y frenar desarrollo',
      practice:
        'transformar el talento natural en habilidad consciente y resultados',
    },
    opposition: {
      dynamic: 'coloca dos energías en polos distintos y pide equilibrio',
      gift: 'aporta perspectiva, madurez y capacidad de ver ambos lados',
      challenge: 'puede sentirse como vaivén, proyección o división interna',
      practice:
        'crear diálogo entre ambos polos en lugar de elegir uno contra el otro',
    },
  };

  const fallback =
    locale === 'en'
      ? {
          dynamic: 'connects two energies through a more nuanced pattern',
          gift: 'can reveal subtle coordination and a non-obvious growth path',
          challenge:
            'may be harder to read immediately because the effect is less direct',
          practice:
            'watch repeated situations where both planetary themes activate together',
        }
      : locale === 'es'
        ? {
            dynamic: 'conecta dos energías mediante un patrón más matizado',
            gift: 'puede revelar coordinación sutil y una vía de crecimiento menos evidente',
            challenge:
              'puede ser más difícil de leer de inmediato porque su efecto es menos directo',
            practice:
              'observa situaciones repetidas donde ambos temas planetarios se activan al mismo tiempo',
          }
        : {
            dynamic:
              'связывает две энергии через более тонкий и неочевидный рисунок',
            gift: 'может показывать скрытый ресурс и дополнительную точку роста',
            challenge:
              'часто читается не сразу, потому что действует менее прямолинейно',
            practice:
              'наблюдать повторяющиеся ситуации, где темы обеих планет включаются одновременно',
          };

  return (
    (locale === 'en' ? en : locale === 'es' ? es : ru)[aspect as AspectType] ||
    fallback
  );
}

export function getExtendedAspect(
  aspect: string,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const specific = getAspectPairTemplate(aspect, planetA, planetB, locale);
  const a = getPlanetName(planetA, locale);
  const b = getPlanetName(planetB, locale);
  const aDomain = getPlanetDomain(planetA, locale);
  const bDomain = getPlanetDomain(planetB, locale);
  const core = getAspectCoreMeaning(aspect, locale);

  if (locale === 'en') {
    return [
      specific || `${a} and ${b}: this aspect ${core.dynamic}.`,
      `${a} describes ${aDomain}, while ${b} speaks about ${bDomain}. Their contact shows how these two parts of the psyche interact in real life.`,
      `Gift of the aspect: it ${core.gift}.`,
      `Main difficulty: it ${core.challenge}.`,
      `In practice, this aspect works best when you ${core.practice}.`,
      `Pay attention to moments when the themes of ${a} and ${b} are activated at the same time: they often reveal one of the key inner patterns of the chart.`,
    ];
  }

  if (locale === 'es') {
    return [
      specific || `${a} y ${b}: este aspecto ${core.dynamic}.`,
      `${a} habla de ${aDomain}, mientras ${b} muestra ${bDomain}. Su contacto revela cómo interactúan en la vida real estas dos partes de la psique.`,
      `Potencial del aspecto: ${core.gift}.`,
      `Dificultad principal: ${core.challenge}.`,
      `En la práctica, este aspecto funciona mejor cuando logras ${core.practice}.`,
      `Observa los momentos en que los temas de ${a} y ${b} se activan a la vez: ahí suele aparecer uno de los patrones centrales de la carta.`,
    ];
  }

  return [
    specific || `${a} и ${b}: этот аспект ${core.dynamic}.`,
    `${a} показывает ${aDomain}, а ${b} связан с темой ${bDomain}. Их контакт раскрывает, как в жизни взаимодействуют две важные части вашей психики.`,
    `Потенциал аспекта: он ${core.gift}.`,
    `Главная сложность: он ${core.challenge}.`,
    `На практике этот аспект раскрывается лучше всего, когда вы ${core.practice}.`,
    `Особенно важно отслеживать ситуации, где темы ${a} и ${b} включаются одновременно: в них часто виден один из центральных внутренних сценариев карты.`,
  ];
}

// Public API

export function getAspectName(
  aspect: string,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  return d.aspectNames[aspect as AspectType] || aspect;
}

export function getPlanetInSignText(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const bySign = d.planetInSign[planet] || {};
  const found: string | undefined = bySign[sign];
  const ext = getExtendedPlanetInSign(planet, sign, locale);
  if (found) return buildSupplementalText(found, ext, locale);

  // Fallback generic line
  if (locale === 'en') {
    return buildSupplementalText(
      `${getPlanetName(planet, 'en')} in ${getSignName(sign, 'en')} influences your life in a unique way.`,
      ext,
      locale,
    );
  }
  if (locale === 'es') {
    return buildSupplementalText(
      `${getPlanetName(planet, 'es')} en ${getSignName(sign, 'es')} influye en tu vida de manera única.`,
      ext,
      locale,
    );
  }
  return buildSupplementalText(
    `${getPlanetName(planet, 'ru')} в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`,
    ext,
    locale,
  );
}

export function getKeywords(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P =
    locale === 'en'
      ? PLANET_TRAITS_EN
      : locale === 'es'
        ? PLANET_TRAITS_ES
        : PLANET_TRAITS_RU;
  const S =
    locale === 'en'
      ? SIGN_TRAITS_EN
      : locale === 'es'
        ? SIGN_TRAITS_ES
        : SIGN_TRAITS_RU;
  const pk = (P[planet]?.keywords || []).slice(0, 3);
  const sk = (S[sign]?.keywords || []).slice(0, 3);
  return mergeTraits(pk, sk, 6);
}

export function getStrengths(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P =
    locale === 'en'
      ? PLANET_TRAITS_EN
      : locale === 'es'
        ? PLANET_TRAITS_ES
        : PLANET_TRAITS_RU;
  const S =
    locale === 'en'
      ? SIGN_TRAITS_EN
      : locale === 'es'
        ? SIGN_TRAITS_ES
        : SIGN_TRAITS_RU;
  const ps = (P[planet]?.strengths || []).slice(0, 3);
  const ss = (S[sign]?.strengths || []).slice(0, 3);
  return mergeTraits(ps, ss, 6);
}

export function getChallenges(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P =
    locale === 'en'
      ? PLANET_TRAITS_EN
      : locale === 'es'
        ? PLANET_TRAITS_ES
        : PLANET_TRAITS_RU;
  const S =
    locale === 'en'
      ? SIGN_TRAITS_EN
      : locale === 'es'
        ? SIGN_TRAITS_ES
        : SIGN_TRAITS_RU;
  const pc = (P[planet]?.challenges || []).slice(0, 3);
  const sc = (S[sign]?.challenges || []).slice(0, 3);
  return mergeTraits(pc, sc, 6);
}

export function getAscendantText(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const found = d.ascendant[sign];
  const ext = getExtendedAscendant(sign, locale);
  if (found) return buildSupplementalText(found, ext, locale);
  if (locale === 'en') {
    return buildSupplementalText(
      `Ascendant in ${getSignName(sign, 'en')} shapes your outward image.`,
      ext,
      locale,
    );
  }
  if (locale === 'es') {
    return buildSupplementalText(
      `Ascendente en ${getSignName(sign, 'es')} moldea tu imagen externa.`,
      ext,
      locale,
    );
  }
  return buildSupplementalText(
    `Асцендент в ${getSignName(sign, 'ru')} формирует ваш внешний образ.`,
    ext,
    locale,
  );
}

export function getAscendantMeta(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): { keywords: string[]; strengths: string[]; challenges: string[] } {
  if (locale === 'en') {
    const meta:
      | { keywords: string[]; strengths: string[]; challenges: string[] }
      | undefined = ASCENDANT_META_EN[sign];
    return (
      meta || {
        keywords: ['attractive', 'charismatic', 'confident'],
        strengths: ['Natural charm', 'Self-confidence'],
        challenges: ['Excessive straightforwardness'],
      }
    );
  }
  if (locale === 'es') {
    return {
      keywords: ['atractivo', 'carismático', 'seguro'],
      strengths: ['Encanto natural', 'Confianza en sí'],
      challenges: ['Excesiva franqueza'],
    };
  }
  const meta:
    | { keywords: string[]; strengths: string[]; challenges: string[] }
    | undefined = ASCENDANT_META_RU[sign];

  return (
    meta || {
      keywords: ['привлекательный', 'харизматичный', 'уверенный'],
      strengths: ['Природное обаяние', 'Уверенность в себе'],
      challenges: ['Излишняя прямолинейность'],
    }
  );
}

export function getHouseTheme(
  houseNum: number,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const theme = d.housesThemes[houseNum] as string | undefined;
  if (!theme) {
    if (locale === 'en') {
      return `${houseNum} house in ${getSignName(sign, 'en')} influences an important life area.`;
    }
    if (locale === 'es') {
      return `${houseNum} casa en ${getSignName(sign, 'es')} influye en un área importante de la vida.`;
    }
    return `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на важную жизненную сферу.`;
  }
  if (locale === 'en') {
    return `${houseNum} house in ${getSignName(sign, 'en')} affects ${theme}`;
  }
  if (locale === 'es') {
    return `${houseNum} casa en ${getSignName(sign, 'es')} afecta ${theme}`;
  }
  return `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на сферу ${theme}`;
}

export function getHouseLifeArea(
  houseNum: number,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  return (
    (d.housesAreas[houseNum] as string | undefined) ||
    (locale === 'en'
      ? 'Life area'
      : locale === 'es'
        ? 'Área de vida'
        : 'Жизненная сфера')
  );
}

export function getHouseSignInterpretation(
  houseNum: number,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const byHouse = d.houseSignInterpretations[houseNum];
  const ext = getExtendedHouseSign(houseNum, sign, locale);
  if (!byHouse) {
    if (locale === 'en') {
      return buildSupplementalText(
        `${houseNum} house in ${getSignName(sign, 'en')} influences your life in a unique way.`,
        ext,
        locale,
      );
    }
    if (locale === 'es') {
      return buildSupplementalText(
        `${houseNum} casa en ${getSignName(sign, 'es')} influye en tu vida de manera única.`,
        ext,
        locale,
      );
    }
    return buildSupplementalText(
      `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`,
      ext,
      locale,
    );
  }
  const found = byHouse[sign];
  if (found) return buildSupplementalText(found, ext, locale);
  if (locale === 'en') {
    return buildSupplementalText(
      `${houseNum} house in ${getSignName(sign, 'en')} influences your life in a unique way.`,
      ext,
      locale,
    );
  }
  if (locale === 'es') {
    return buildSupplementalText(
      `${houseNum} casa en ${getSignName(sign, 'es')} influye en tu vida de manera única.`,
      ext,
      locale,
    );
  }
  return buildSupplementalText(
    `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`,
    ext,
    locale,
  );
}

export function getGeneralTemplates(
  frame: PeriodFrame,
  locale: 'ru' | 'en' | 'es' = 'ru',
): Record<Tone, string[]> {
  const d = dicts(locale);
  return d.generalTemplates[frame] || d.defaultGeneral;
}

export function getLovePhrases(
  frame: PeriodFrame,
  locale: 'ru' | 'en' | 'es' = 'ru',
  seed?: string,
): { positive: string; neutral: string; negative: string } {
  const d = dicts(locale);
  const entry = d.lovePhrases[frame] as
    | { positive: string[]; neutral: string[]; negative: string[] }
    | undefined;

  const hash = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
      h = (h * 31 + value.charCodeAt(i)) >>> 0;
    }
    return h;
  };
  const pick = (arr: string[] | undefined, fallback: string, key: string) => {
    if (!Array.isArray(arr) || !arr.length) return fallback;
    if (!seed) return arr[0];
    const idx = hash(`${seed}:${key}`) % arr.length;
    return arr[idx];
  };

  if (entry) {
    return {
      positive: pick(
        entry.positive,
        locale === 'en'
          ? 'creates a romantic atmosphere'
          : locale === 'es'
            ? 'crea un ambiente romántico'
            : 'поддерживает теплоту в отношениях',
        'positive',
      ),
      neutral: pick(
        entry.neutral,
        locale === 'en'
          ? 'influences emotions'
          : locale === 'es'
            ? 'influye en las emociones'
            : 'влияет на эмоции',
        'neutral',
      ),
      negative: pick(
        entry.negative,
        locale === 'en'
          ? 'requires patience'
          : locale === 'es'
            ? 'requiere paciencia'
            : 'требует терпения',
        'negative',
      ),
    };
  }
  return {
    positive:
      locale === 'en'
        ? 'creates a romantic atmosphere'
        : locale === 'es'
          ? 'crea un ambiente romántico'
          : 'поддерживает теплоту в отношениях',
    neutral:
      locale === 'en'
        ? 'influences emotions'
        : locale === 'es'
          ? 'influye en las emociones'
          : 'влияет на эмоции',
    negative:
      locale === 'en'
        ? 'requires patience'
        : locale === 'es'
          ? 'requiere paciencia'
          : 'требует терпения',
  };
}

export function getCareerActions(
  frame: PeriodFrame,
  locale: 'ru' | 'en' | 'es' = 'ru',
  seed?: string,
): { jupiter: string; saturn: string; mars: string; neutral: string } {
  const d = dicts(locale);
  const entry = d.careerActions[frame] as
    | { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
    | undefined;

  const hash = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
      h = (h * 31 + value.charCodeAt(i)) >>> 0;
    }
    return h;
  };
  const pick = (arr: string[] | undefined, fallback: string, key: string) => {
    if (!Array.isArray(arr) || !arr.length) return fallback;
    if (!seed) return arr[0];
    const idx = hash(`${seed}:${key}`) % arr.length;
    return arr[idx];
  };

  if (entry) {
    return {
      jupiter: pick(
        entry.jupiter,
        locale === 'en'
          ? 'is favorable for'
          : locale === 'es'
            ? 'es favorable para'
            : 'период благоприятен для',
        'jupiter',
      ),
      saturn: pick(
        entry.saturn,
        locale === 'en'
          ? 'requires'
          : locale === 'es'
            ? 'requiere'
            : 'понадобится',
        'saturn',
      ),
      mars: pick(
        entry.mars,
        locale === 'en'
          ? 'brings energy for'
          : locale === 'es'
            ? 'aporta energía para'
            : 'есть энергия для',
        'mars',
      ),
      neutral: pick(
        entry.neutral,
        locale === 'en'
          ? 'continue working on'
          : locale === 'es'
            ? 'continúa trabajando en'
            : 'продолжайте работу над',
        'neutral',
      ),
    };
  }
  return {
    jupiter:
      locale === 'en'
        ? 'is favorable for'
        : locale === 'es'
          ? 'es favorable para'
          : 'период благоприятен для',
    saturn:
      locale === 'en'
        ? 'requires'
        : locale === 'es'
          ? 'requiere'
          : 'понадобится',
    mars:
      locale === 'en'
        ? 'brings energy for'
        : locale === 'es'
          ? 'aporta energía para'
          : 'есть энергия для',
    neutral:
      locale === 'en'
        ? 'continue working on'
        : locale === 'es'
          ? 'continúa trabajando en'
          : 'продолжайте работу над',
  };
}

export function getAdvicePool(
  frame: PeriodFrame,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  return (
    (d.advicePools[frame] as string[] | undefined) || d.defaultGeneral.neutral
  );
}

export function getSignColors(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  const found = d.signColors[sign] as string[] | undefined;
  if (found && found.length) return found;
  return locale === 'en'
    ? DEFAULT_COLORS_EN
    : locale === 'es'
      ? DEFAULT_COLORS_ES
      : DEFAULT_COLORS_RU;
}

/**
 * Aspect pair exact template, if defined in dictionaries
 */
export function getAspectPairTemplate(
  aspect: string,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string | undefined {
  const d = dicts(locale);
  const byAspect = d.aspectPairTemplates[aspect as AspectType];
  if (!byAspect) return undefined;
  return byAspect[planetA]?.[planetB] || byAspect[planetB]?.[planetA];
}

/**
 * Aspect narrative with pair template fallback to generic
 */
export function getAspectInterpretation(
  aspect: string,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const specific = getAspectPairTemplate(aspect, planetA, planetB, locale);
  if (specific) return specific;

  const a = getPlanetName(planetA, locale);
  const b = getPlanetName(planetB, locale);
  const core = getAspectCoreMeaning(aspect, locale);

  if (locale === 'en') {
    return `${a} and ${b} form an aspect that ${core.dynamic}. This connection ${core.gift}.`;
  }
  if (locale === 'es') {
    return `${a} y ${b} forman un aspecto que ${core.dynamic}. Esta conexión ${core.gift}.`;
  }
  return `${a} и ${b} образуют аспект, который ${core.dynamic}. Эта связь ${core.gift}.`;
}

/**
 * Planet × House short domain focus text
 */
export function getPlanetHouseFocus(
  planet: PlanetKey,
  houseNum: number,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  try {
    const area = getHouseLifeArea(houseNum, locale);
    const ruSpecials: Partial<Record<PlanetKey, Record<number, string>>> = {
      venus: {
        5: 'Венера усиливает творческую романтику и радость.',
        7: 'Венера гармонизирует партнерские отношения.',
      },
      jupiter: {
        10: 'Юпитер расширяет карьерные горизонты и статус.',
        2: 'Юпитер поддерживает финансовый рост.',
      },
      mars: {
        6: 'Марс требует умеренности в нагрузках и дисциплины для здоровья.',
        10: 'Марс придает напор в профессиональных задачах.',
      },
      saturn: {
        10: 'Сатурн требует ответственности и системности в карьере.',
        2: 'Сатурн дисциплинирует финансовую сферу.',
      },
    };
    const enSpecials: Partial<Record<PlanetKey, Record<number, string>>> = {
      venus: {
        5: 'Venus enhances creative romance and joy.',
        7: 'Venus harmonizes partnerships.',
      },
      jupiter: {
        10: 'Jupiter expands career horizons and status.',
        2: 'Jupiter supports financial growth.',
      },
      mars: {
        6: 'Mars requires moderation and discipline for health.',
        10: 'Mars empowers drive in professional matters.',
      },
      saturn: {
        10: 'Saturn demands responsibility and system in career.',
        2: 'Saturn disciplines the financial sphere.',
      },
    };

    const spec = (locale === 'en' ? enSpecials : ruSpecials)[planet]?.[
      houseNum
    ];

    if (spec) {
      if (locale === 'en') {
        return `${spec} Area: ${area}.`;
      }
      if (locale === 'es') {
        return `${spec} Área: ${area}.`;
      }
      return `${spec} Сфера: ${area}.`;
    }
    if (locale === 'en') {
      return `${getPlanetName(planet, 'en')} activates the area: ${area}.`;
    }
    if (locale === 'es') {
      return `${getPlanetName(planet, 'es')} activa el área: ${area}.`;
    }
    return `${getPlanetName(planet, 'ru')} активирует сферу: ${area}.`;
  } catch {
    if (locale === 'en') {
      return `${getPlanetName(planet, 'en')} activates an important life area.`;
    }
    if (locale === 'es') {
      return `${getPlanetName(planet, 'es')} activa un área importante de la vida.`;
    }
    return `${getPlanetName(planet, 'ru')} активирует важную жизненную сферу.`;
  }
}

// Legacy RU helpers maintained for backward compatibility
export function getPlanetNameLocalized(
  planet: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  return getPlanetName(planet, locale);
}

export function getSignNameLocalized(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  return getSignName(sign, locale);
}

export function getPlanetNameRu(planet: PlanetKey): string {
  return getPlanetName(planet, 'ru');
}

export function getSignRu(sign: Sign): string {
  return getSignName(sign, 'ru');
}
