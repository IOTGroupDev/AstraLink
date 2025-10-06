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
  | 'pluto';

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
} as const;

/**
 * Weights for transit significance (higher = more important)
 */
export const PLANET_WEIGHTS: Readonly<Record<PlanetKey, number>> = {
  pluto: 10,
  neptune: 9,
  uranus: 8,
  saturn: 7,
  jupiter: 6,
  mars: 5,
  venus: 4,
  mercury: 3,
  moon: 2,
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
