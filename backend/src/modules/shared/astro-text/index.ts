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
} from './en/data';

// Fallbacks
const DEFAULT_COLORS_RU = ['Белый', 'Синий'];
const DEFAULT_COLORS_EN = ['White', 'Blue'];

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

// Locale dictionaries router
function dicts(locale: 'ru' | 'en') {
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
      defaultGeneral: DEFAULT_GENERAL_EN,
      defaultColors: DEFAULT_COLORS_EN,
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
    defaultGeneral: DEFAULT_GENERAL_RU,
    defaultColors: DEFAULT_COLORS_RU,
  };
}

// Helpers: localized planet/sign names for generic fallbacks
function getPlanetName(planet: PlanetKey, locale: 'ru' | 'en'): string {
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
  };
  return (locale === 'en' ? en : ru)[planet] || planet;
}

function getSignName(sign: Sign, locale: 'ru' | 'en'): string {
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

// Public API

export function getAspectName(aspect: AspectType, locale: 'ru' | 'en' = 'ru'): string {
  const d = dicts(locale);
  return d.aspectNames[aspect] || aspect;
}

export function getPlanetInSignText(
  planet: PlanetKey,
  sign: Sign,
  locale: 'ru' | 'en' = 'ru',
): string {
  const d = dicts(locale);
  const bySign = d.planetInSign[planet] || {};
  const found = (bySign as any)?.[sign];
  if (found) return found as string;

  // Fallback generic line
  if (locale === 'en') {
    return `${getPlanetName(planet, 'en')} in ${getSignName(sign, 'en')} influences your life in a unique way.`;
  }
  return `${getPlanetName(planet, 'ru')} в ${getSignName(sign, 'ru')} влияет на вашу жизнь уникальным образом.`;
}

export function getKeywords(
  _planet: PlanetKey,
  _sign: Sign,
  locale: 'ru' | 'en' = 'ru',
): string[] {
  // Until per-planet tables are introduced
  return locale === 'en'
    ? ['energetic', 'goal-oriented', 'creative', 'intuitive']
    : ['энергичный', 'целеустремленный', 'творческий', 'интуитивный'];
}

export function getStrengths(
  _planet: PlanetKey,
  _sign: Sign,
  locale: 'ru' | 'en' = 'ru',
): string[] {
  return locale === 'en'
    ? ['Leadership', 'Creativity', 'Decisiveness']
    : ['Лидерские качества', 'Креативность', 'Решительность'];
}

export function getChallenges(
  _planet: PlanetKey,
  _sign: Sign,
  locale: 'ru' | 'en' = 'ru',
): string[] {
  return locale === 'en'
    ? ['Impulsiveness', 'Impatience']
    : ['Импульсивность', 'Нетерпеливость'];
}

export function getAscendantText(sign: Sign, locale: 'ru' | 'en' = 'ru'): string {
  const d = dicts(locale);
  const found = d.ascendant[sign] as string | undefined;
  if (found) return found;
  return locale === 'en'
    ? `Ascendant in ${getSignName(sign, 'en')} shapes your outward image.`
    : `Асцендент в ${getSignName(sign, 'ru')} формирует ваш внешний образ.`;
}

export function getAscendantMeta(
  sign: Sign,
  locale: 'ru' | 'en' = 'ru',
): { keywords: string[]; strengths: string[]; challenges: string[] } {
  if (locale === 'en') {
    const meta = (ASCENDANT_META_EN as any)?.[sign] as
      | { keywords: string[]; strengths: string[]; challenges: string[] }
      | undefined;
    return (
      meta || {
        keywords: ['attractive', 'charismatic', 'confident'],
        strengths: ['Natural charm', 'Self-confidence'],
        challenges: ['Excessive straightforwardness'],
      }
    );
  }
  const meta = (ASCENDANT_META_RU as any)?.[sign] as
    | { keywords: string[]; strengths: string[]; challenges: string[] }
    | undefined;

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
  locale: 'ru' | 'en' = 'ru',
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

export function getHouseLifeArea(houseNum: number, locale: 'ru' | 'en' = 'ru'): string {
  const d = dicts(locale);
  return (d.housesAreas[houseNum] as string | undefined) || (locale === 'en' ? 'Life area' : 'Жизненная сфера');
}

export function getGeneralTemplates(
  frame: PeriodFrame,
  locale: 'ru' | 'en' = 'ru',
): Record<Tone, string[]> {
  const d = dicts(locale);
  return (d.generalTemplates[frame] as Record<Tone, string[]>) || d.defaultGeneral;
}

export function getLovePhrases(
  frame: PeriodFrame,
  locale: 'ru' | 'en' = 'ru',
): { positive: string; neutral: string; negative: string } {
  const d = dicts(locale);
  const entry = d.lovePhrases[frame] as
    | { positive: string[]; neutral: string[]; negative: string[] }
    | undefined;

  const pick = (arr: string[] | undefined, fallback: string) =>
    Array.isArray(arr) && arr.length ? arr[0] : fallback;

  if (entry) {
    return {
      positive: pick(entry.positive, locale === 'en' ? 'creates a romantic atmosphere' : 'поддерживает теплоту в отношениях'),
      neutral: pick(entry.neutral, locale === 'en' ? 'influences emotions' : 'влияет на эмоции'),
      negative: pick(entry.negative, locale === 'en' ? 'requires patience' : 'требует терпения'),
    };
  }
  return {
    positive: locale === 'en' ? 'creates a romantic atmosphere' : 'поддерживает теплоту в отношениях',
    neutral: locale === 'en' ? 'influences emotions' : 'влияет на эмоции',
    negative: locale === 'en' ? 'requires patience' : 'требует терпения',
  };
}

export function getCareerActions(
  frame: PeriodFrame,
  locale: 'ru' | 'en' = 'ru',
): { jupiter: string; saturn: string; mars: string; neutral: string } {
  const d = dicts(locale);
  const entry = d.careerActions[frame] as
    | { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
    | undefined;

  const pick = (arr: string[] | undefined, fallback: string) =>
    Array.isArray(arr) && arr.length ? arr[0] : fallback;

  if (entry) {
    return {
      jupiter: pick(entry.jupiter, locale === 'en' ? 'is favorable for' : 'период благоприятен для'),
      saturn: pick(entry.saturn, locale === 'en' ? 'requires' : 'понадобится'),
      mars: pick(entry.mars, locale === 'en' ? 'brings energy for' : 'есть энергия для'),
      neutral: pick(entry.neutral, locale === 'en' ? 'continue working on' : 'продолжайте работу над'),
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
  locale: 'ru' | 'en' = 'ru',
): string[] {
  const d = dicts(locale);
  return (d.advicePools[frame] as string[] | undefined) || d.defaultGeneral.neutral;
}

export function getSignColors(sign: Sign, locale: 'ru' | 'en' = 'ru'): string[] {
  const d = dicts(locale);
  const found = d.signColors[sign] as string[] | undefined;
  if (found && found.length) return found;
  return locale === 'en' ? DEFAULT_COLORS_EN : DEFAULT_COLORS_RU;
}

/**
 * Aspect pair exact template, if defined in dictionaries
 */
export function getAspectPairTemplate(
  aspect: AspectType,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' = 'ru',
): string | undefined {
  const d = dicts(locale);
  const byAspect = d.aspectPairTemplates[aspect] as
    | Partial<Record<PlanetKey, Partial<Record<PlanetKey, string>>>>
    | undefined;
  if (!byAspect) return undefined;
  return (byAspect[planetA]?.[planetB] || byAspect[planetB]?.[planetA]) as string | undefined;
}

/**
 * Aspect narrative with pair template fallback to generic
 */
export function getAspectInterpretation(
  aspect: AspectType,
  planetA: PlanetKey,
  planetB: PlanetKey,
  locale: 'ru' | 'en' = 'ru',
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
  locale: 'ru' | 'en' = 'ru',
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

    const spec =
      (locale === 'en' ? enSpecials : ruSpecials)[planet]?.[houseNum];

    if (spec) {
      return locale === 'en' ? `${spec} Area: ${area}.` : `${spec} Сфера: ${area}.`;
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
