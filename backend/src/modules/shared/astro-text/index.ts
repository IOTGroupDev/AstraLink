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
  return (locale === 'en' ? en : ru)[planet] || planet;
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
  return (locale === 'en' ? en : ru)[sign] || (sign as string);
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

// Helper to merge and deduplicate with cap
function mergeTraits(a: string[] = [], b: string[] = [], cap = 6): string[] {
  const uniq = Array.from(new Set([...a, ...b].filter(Boolean)));
  return uniq.slice(0, cap);
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
  // @ts-expect-error - planetInSignExt exists in runtime but not in inferred type
  const byPlanet: Partial<Record<Sign, string[]>> | undefined = d.planetInSignExt?.[planet];
  if (!byPlanet) return [];
  return byPlanet[sign] || [];
}

export function getExtendedAscendant(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const d = dicts(locale);
  // @ts-expect-error - ascendantExt exists in runtime but not in inferred type
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
  // @ts-expect-error - houseSignInterpretationsExt exists in runtime but not in inferred type
  const byHouse: Partial<Record<Sign, string[]>> | undefined = d.houseSignInterpretationsExt?.[houseNum];
  if (!byHouse) return [];
  return byHouse[sign] || [];
}

/**
 * Placeholder: no extended aspect templates yet
 */
export function getExtendedAspect(
  _aspect: AspectType,
  _planetA: PlanetKey,
  _planetB: PlanetKey,
  _locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  return [];
}

// Public API

export function getAspectName(
  aspect: AspectType,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  return d.aspectNames[aspect] || aspect;
}

export function getPlanetInSignText(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const bySign = d.planetInSign[planet] || {};
  // @ts-expect-error - bySign has sign indices but not in inferred type
  const found: string | undefined = bySign[sign];
  if (found) return found;

  // Fallback generic line
  if (locale === 'en') {
    return `${getPlanetName(planet, 'en')} in ${getSignName(sign, 'en')} influences your life in a unique way.`;
  }
  return `${getPlanetName(planet, 'ru')} в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`;
}

export function getKeywords(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P = locale === 'en' ? PLANET_TRAITS_EN : PLANET_TRAITS_RU;
  const S = locale === 'en' ? SIGN_TRAITS_EN : SIGN_TRAITS_RU;
  const pk = (P[planet]?.keywords || []).slice(0, 3);
  const sk = (S[sign]?.keywords || []).slice(0, 3);
  return mergeTraits(pk, sk, 6);
}

export function getStrengths(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P = locale === 'en' ? PLANET_TRAITS_EN : PLANET_TRAITS_RU;
  const S = locale === 'en' ? SIGN_TRAITS_EN : SIGN_TRAITS_RU;
  const ps = (P[planet]?.strengths || []).slice(0, 3);
  const ss = (S[sign]?.strengths || []).slice(0, 3);
  return mergeTraits(ps, ss, 6);
}

export function getChallenges(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string[] {
  const P = locale === 'en' ? PLANET_TRAITS_EN : PLANET_TRAITS_RU;
  const S = locale === 'en' ? SIGN_TRAITS_EN : SIGN_TRAITS_RU;
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
  if (found) return found;
  return locale === 'en'
    ? `Ascendant in ${getSignName(sign, 'en')} shapes your outward image.`
    : `Асцендент в ${getSignName(sign, 'ru')} формирует ваш внешний образ.`;
}

export function getAscendantMeta(
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): { keywords: string[]; strengths: string[]; challenges: string[] } {
  if (locale === 'en') {
    // @ts-expect-error - ASCENDANT_META_EN has sign indices but not in type definition
    const meta: { keywords: string[]; strengths: string[]; challenges: string[] } | undefined = ASCENDANT_META_EN[sign];
    return (
      meta || {
        keywords: ['attractive', 'charismatic', 'confident'],
        strengths: ['Natural charm', 'Self-confidence'],
        challenges: ['Excessive straightforwardness'],
      }
    );
  }
  // @ts-expect-error - ASCENDANT_META_RU has sign indices but not in type definition
  const meta: { keywords: string[]; strengths: string[]; challenges: string[] } | undefined = ASCENDANT_META_RU[sign];

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
    return locale === 'en'
      ? `${houseNum} house in ${getSignName(sign, 'en')} influences an important life area.`
      : `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на важную жизненную сферу.`;
  }
  return locale === 'en'
    ? `${houseNum} house in ${getSignName(sign, 'en')} affects ${theme}`
    : `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на сферу ${theme}`;
}

export function getHouseLifeArea(
  houseNum: number,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  return (
    (d.housesAreas[houseNum] as string | undefined) ||
    (locale === 'en' ? 'Life area' : 'Жизненная сфера')
  );
}

export function getHouseSignInterpretation(
  houseNum: number,
  sign: Sign,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const d = dicts(locale);
  const byHouse = d.houseSignInterpretations[houseNum];
  if (!byHouse) {
    return locale === 'en'
      ? `${houseNum} house in ${getSignName(sign, 'en')} influences your life in a unique way.`
      : `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`;
  }
  const found = byHouse[sign];
  if (found) return found;
  return locale === 'en'
    ? `${houseNum} house in ${getSignName(sign, 'en')} influences your life in a unique way.`
    : `${houseNum}-й дом в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`;
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
): { positive: string; neutral: string; negative: string } {
  const d = dicts(locale);
  const entry = d.lovePhrases[frame] as
    | { positive: string[]; neutral: string[]; negative: string[] }
    | undefined;

  const pick = (arr: string[] | undefined, fallback: string) =>
    Array.isArray(arr) && arr.length ? arr[0] : fallback;

  if (entry) {
    return {
      positive: pick(
        entry.positive,
        locale === 'en'
          ? 'creates a romantic atmosphere'
          : 'поддерживает теплоту в отношениях',
      ),
      neutral: pick(
        entry.neutral,
        locale === 'en' ? 'influences emotions' : 'влияет на эмоции',
      ),
      negative: pick(
        entry.negative,
        locale === 'en' ? 'requires patience' : 'требует терпения',
      ),
    };
  }
  return {
    positive:
      locale === 'en'
        ? 'creates a romantic atmosphere'
        : 'поддерживает теплоту в отношениях',
    neutral: locale === 'en' ? 'influences emotions' : 'влияет на эмоции',
    negative: locale === 'en' ? 'requires patience' : 'требует терпения',
  };
}

export function getCareerActions(
  frame: PeriodFrame,
  locale: 'ru' | 'en' | 'es' = 'ru',
): { jupiter: string; saturn: string; mars: string; neutral: string } {
  const d = dicts(locale);
  const entry = d.careerActions[frame] as
    | { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
    | undefined;

  const pick = (arr: string[] | undefined, fallback: string) =>
    Array.isArray(arr) && arr.length ? arr[0] : fallback;

  if (entry) {
    return {
      jupiter: pick(
        entry.jupiter,
        locale === 'en' ? 'is favorable for' : 'период благоприятен для',
      ),
      saturn: pick(entry.saturn, locale === 'en' ? 'requires' : 'понадобится'),
      mars: pick(
        entry.mars,
        locale === 'en' ? 'brings energy for' : 'есть энергия для',
      ),
      neutral: pick(
        entry.neutral,
        locale === 'en' ? 'continue working on' : 'продолжайте работу над',
      ),
    };
  }
  return {
    jupiter: locale === 'en' ? 'is favorable for' : 'период благоприятен для',
    saturn: locale === 'en' ? 'requires' : 'понадобится',
    mars: locale === 'en' ? 'brings energy for' : 'есть энергия для',
    neutral: locale === 'en' ? 'continue working on' : 'продолжайте работу над',
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
  aspect: AspectType,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string | undefined {
  const d = dicts(locale);
  const byAspect = d.aspectPairTemplates[aspect];
  if (!byAspect) return undefined;
  return byAspect[planetA]?.[planetB] || byAspect[planetB]?.[planetA];
}

/**
 * Aspect narrative with pair template fallback to generic
 */
export function getAspectInterpretation(
  aspect: AspectType,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' | 'es' = 'ru',
): string {
  const specific = getAspectPairTemplate(aspect, planetA, planetB, locale);
  if (specific) return specific;

  const a = getPlanetName(planetA, locale);
  const b = getPlanetName(planetB, locale);
  const aspectName = getAspectName(aspect, locale);

  if (locale === 'en') {
    return `${a} ${aspectName} ${b}, affecting your character and life path.`;
  }
  return `${a} ${aspectName} ${b}, что влияет на ваш характер и жизненный путь.`;
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
      return locale === 'en'
        ? `${spec} Area: ${area}.`
        : `${spec} Сфера: ${area}.`;
    }
    return locale === 'en'
      ? `${getPlanetName(planet, 'en')} activates the area: ${area}.`
      : `${getPlanetName(planet, 'ru')} активирует сферу: ${area}.`;
  } catch {
    return locale === 'en'
      ? `${getPlanetName(planet, 'en')} activates an important life area.`
      : `${getPlanetName(planet, 'ru')} активирует важную жизненную сферу.`;
  }
}

// Legacy RU helpers maintained for backward compatibility
export function getPlanetNameRu(planet: PlanetKey): string {
  return getPlanetName(planet, 'ru');
}

export function getSignRu(sign: Sign): string {
  return getSignName(sign, 'ru');
}
