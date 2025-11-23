/**
 * Shared astrology types and constants
 */

export type PlanetKey =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'north_node'
  | 'south_node'
  | 'lilith'
  | 'chiron';

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

export type Sign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type PeriodFrame =
  | 'Сегодня'
  | 'Завтра'
  | 'На этой неделе'
  | 'В этом месяце';
export type Tone = 'positive' | 'neutral' | 'challenging';

/**
 * Recommended transit orbs (in degrees) per transit planet.
 * Fast planets: ~1°, slow planets: up to ~2°.
 */
export const TRANSIT_ORBS: Readonly<Record<PlanetKey, number>> = {
  sun: 1,
  moon: 1,
  mercury: 1,
  venus: 1,
  mars: 1,
  jupiter: 1.5,
  saturn: 2,
  uranus: 2,
  neptune: 2,
  pluto: 2,
  north_node: 1.5,
  south_node: 1.5,
  lilith: 1.5,
  chiron: 1.5,
} as const;

/**
 * Weights for transit significance (higher = more important)
 */
export const PLANET_WEIGHTS: Readonly<Record<PlanetKey, number>> = {
  pluto: 10,
  neptune: 9,
  uranus: 8,
  saturn: 7,
  north_node: 6,
  south_node: 6,
  lilith: 6,
  jupiter: 5,
  chiron: 4,
  mars: 3,
  venus: 2,
  mercury: 1,
  moon: 1,
  sun: 1,
} as const;

/**
 * Aspect angles for detection
 */
export const ASPECT_ANGLES: Readonly<Record<AspectType, number>> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
} as const;

/**
 * Harmonious/Challenging aspect sets
 */
export const HARMONIOUS_ASPECTS: Readonly<AspectType[]> = [
  'trine',
  'sextile',
  'conjunction',
];
export const CHALLENGING_ASPECTS: Readonly<AspectType[]> = [
  'square',
  'opposition',
];

/**
 * Essential Dignities - planetary strength based on sign position
 */

/**
 * Rulership (доминион): planets ruling their own signs
 */
export const PLANET_RULERSHIPS: Readonly<Record<Sign, PlanetKey>> = {
  Aries: 'mars',
  Taurus: 'venus',
  Gemini: 'mercury',
  Cancer: 'moon',
  Leo: 'sun',
  Virgo: 'mercury',
  Libra: 'venus',
  Scorpio: 'mars', // modern: pluto co-rules
  Sagittarius: 'jupiter',
  Capricorn: 'saturn',
  Aquarius: 'saturn', // modern: uranus co-rules
  Pisces: 'jupiter', // modern: neptune co-rules
} as const;

/**
 * Exaltation: planets in their most powerful signs
 */
export const PLANET_EXALTATIONS: Readonly<Record<PlanetKey, Sign>> = {
  sun: 'Aries',
  moon: 'Taurus',
  mercury: 'Virgo',
  venus: 'Pisces',
  mars: 'Capricorn',
  jupiter: 'Cancer',
  saturn: 'Libra',
  uranus: 'Scorpio',
  neptune: 'Pisces', // modern
  pluto: 'Aries', // modern
  north_node: 'Gemini', // nodes don't have traditional exaltations
  south_node: 'Sagittarius',
  lilith: 'Scorpio', // Lilith is associated with Scorpio
  chiron: 'Virgo', // Chiron is associated with Virgo
} as const;

/**
 * Detriment: planets in their weakest signs (opposite of rulership)
 */
export const PLANET_DETRIMENTS: Readonly<Record<PlanetKey, Sign>> = {
  sun: 'Libra',
  moon: 'Scorpio',
  mercury: 'Sagittarius', // pisces for some traditions
  venus: 'Virgo',
  mars: 'Libra', // cancer for some traditions
  jupiter: 'Capricorn',
  saturn: 'Aries',
  uranus: 'Taurus',
  neptune: 'Virgo',
  pluto: 'Libra',
  north_node: 'Sagittarius', // opposite of exaltation
  south_node: 'Gemini',
  lilith: 'Taurus', // opposite of Scorpio
  chiron: 'Pisces', // opposite of Virgo
} as const;

/**
 * Fall: planets in their most weakened signs (opposite of exaltation)
 */
export const PLANET_FALLS: Readonly<Record<PlanetKey, Sign>> = {
  sun: 'Libra',
  moon: 'Scorpio',
  mercury: 'Pisces',
  venus: 'Virgo',
  mars: 'Cancer',
  jupiter: 'Capricorn',
  saturn: 'Aries',
  uranus: 'Taurus',
  neptune: 'Virgo',
  pluto: 'Libra',
  north_node: 'Sagittarius', // opposite of exaltation
  south_node: 'Gemini',
  lilith: 'Taurus', // opposite of Scorpio
  chiron: 'Pisces', // opposite of Virgo
} as const;

/**
 * Triplicity rulers by element (day/night charts)
 */
export const TRIPLICITY_RULERS: Readonly<
  Record<string, { day: PlanetKey; night: PlanetKey }>
> = {
  fire: { day: 'sun', night: 'jupiter' },
  earth: { day: 'venus', night: 'moon' },
  air: { day: 'saturn', night: 'mercury' },
  water: { day: 'venus', night: 'mars' },
} as const;

/**
 * Dignity strength levels
 */
export type DignityLevel =
  | 'ruler'
  | 'exalted'
  | 'triplicity'
  | 'neutral'
  | 'detriment'
  | 'fall';

/**
 * Calculate essential dignity score for planet in sign
 */
export function getEssentialDignity(
  planet: PlanetKey,
  sign: Sign,
): DignityLevel {
  // Ruler (доминион) - strongest
  if (PLANET_RULERSHIPS[sign] === planet) {
    return 'ruler';
  }

  // Exalted (экзальтация) - very strong
  if (PLANET_EXALTATIONS[planet] === sign) {
    return 'exalted';
  }

  // Detriment (детримент) - weak
  if (PLANET_DETRIMENTS[planet] === sign) {
    return 'detriment';
  }

  // Fall (падение) - weakest
  if (PLANET_FALLS[planet] === sign) {
    return 'fall';
  }

  // Triplicity - moderate strength
  const element = getSignElement(sign);
  const triplicity = TRIPLICITY_RULERS[element];
  if (triplicity?.day === planet || triplicity?.night === planet) {
    return 'triplicity';
  }

  return 'neutral';
}

/**
 * Get sign element for triplicity calculation
 */
function getSignElement(sign: Sign): string {
  const fire: Sign[] = ['Aries', 'Leo', 'Sagittarius'];
  const earth: Sign[] = ['Taurus', 'Virgo', 'Capricorn'];
  const air: Sign[] = ['Gemini', 'Libra', 'Aquarius'];
  const water: Sign[] = ['Cancer', 'Scorpio', 'Pisces'];

  if (fire.includes(sign)) return 'fire';
  if (earth.includes(sign)) return 'earth';
  if (air.includes(sign)) return 'air';
  if (water.includes(sign)) return 'water';
  return 'unknown';
}

/**
 * Dignity strength scores for calculations
 */
export const DIGNITY_SCORES: Readonly<Record<DignityLevel, number>> = {
  ruler: 5,
  exalted: 4,
  triplicity: 3,
  neutral: 2,
  detriment: 1,
  fall: 0,
} as const;
