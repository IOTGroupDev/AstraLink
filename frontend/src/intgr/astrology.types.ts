// types/astrology.types.ts

export interface BirthData {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PlanetPosition {
  id: number;
  name: string;
  symbol: string;
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
  speedLongitude: number;
  sign: string;
  signIndex: number;
  degree: number;
  minute: number;
  second: number;
  isRetrograde: boolean;
  house: number;
}

export interface HousePosition {
  number: number;
  cusp: number;
  sign: string;
  signIndex: number;
  degree: number;
  minute: number;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
  isApplying: boolean;
}

export enum AspectType {
  CONJUNCTION = 'Conjunction',
  OPPOSITION = 'Opposition',
  TRINE = 'Trine',
  SQUARE = 'Square',
  SEXTILE = 'Sextile',
  QUINCUNX = 'Quincunx',
  SEMISEXTILE = 'Semi-Sextile',
  SEMISQUARE = 'Semi-Square',
  SESQUIQUADRATE = 'Sesquiquadrate',
}

export interface ChartData {
  name: string;
  dateTime: Date;
  julianDay: number;
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    city?: string;
    country?: string;
  };
  planets: PlanetPosition[];
  houses: HousePosition[];
  ascendant: number;
  mc: number;
  descendant: number;
  ic: number;
  aspects: Aspect[];
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

export const PLANETS = [
  { id: 0, name: 'Sun', symbol: '☉', key: 'SUN' },
  { id: 1, name: 'Moon', symbol: '☽', key: 'MOON' },
  { id: 2, name: 'Mercury', symbol: '☿', key: 'MERCURY' },
  { id: 3, name: 'Venus', symbol: '♀', key: 'VENUS' },
  { id: 4, name: 'Mars', symbol: '♂', key: 'MARS' },
  { id: 5, name: 'Jupiter', symbol: '♃', key: 'JUPITER' },
  { id: 6, name: 'Saturn', symbol: '♄', key: 'SATURN' },
  { id: 7, name: 'Uranus', symbol: '♅', key: 'URANUS' },
  { id: 8, name: 'Neptune', symbol: '♆', key: 'NEPTUNE' },
  { id: 9, name: 'Pluto', symbol: '♇', key: 'PLUTO' },
  { id: 10, name: 'North Node', symbol: '☊', key: 'NORTH_NODE' },
  { id: 11, name: 'South Node', symbol: '☋', key: 'SOUTH_NODE' },
  { id: 12, name: 'Chiron', symbol: '⚷', key: 'CHIRON' },
  { id: 13, name: 'Lilith', symbol: '⚸', key: 'LILITH' },
];

export const SIGNS = [
  { name: 'Aries', symbol: '♈', element: 'Fire', quality: 'Cardinal' },
  { name: 'Taurus', symbol: '♉', element: 'Earth', quality: 'Fixed' },
  { name: 'Gemini', symbol: '♊', element: 'Air', quality: 'Mutable' },
  { name: 'Cancer', symbol: '♋', element: 'Water', quality: 'Cardinal' },
  { name: 'Leo', symbol: '♌', element: 'Fire', quality: 'Fixed' },
  { name: 'Virgo', symbol: '♍', element: 'Earth', quality: 'Mutable' },
  { name: 'Libra', symbol: '♎', element: 'Air', quality: 'Cardinal' },
  { name: 'Scorpio', symbol: '♏', element: 'Water', quality: 'Fixed' },
  { name: 'Sagittarius', symbol: '♐', element: 'Fire', quality: 'Mutable' },
  { name: 'Capricorn', symbol: '♑', element: 'Earth', quality: 'Cardinal' },
  { name: 'Aquarius', symbol: '♒', element: 'Air', quality: 'Fixed' },
  { name: 'Pisces', symbol: '♓', element: 'Water', quality: 'Mutable' },
];

export const ASPECT_ANGLES = {
  [AspectType.CONJUNCTION]: { angle: 0, orb: 8 },
  [AspectType.OPPOSITION]: { angle: 180, orb: 8 },
  [AspectType.TRINE]: { angle: 120, orb: 8 },
  [AspectType.SQUARE]: { angle: 90, orb: 8 },
  [AspectType.SEXTILE]: { angle: 60, orb: 6 },
  [AspectType.QUINCUNX]: { angle: 150, orb: 3 },
  [AspectType.SEMISEXTILE]: { angle: 30, orb: 2 },
  [AspectType.SEMISQUARE]: { angle: 45, orb: 2 },
  [AspectType.SESQUIQUADRATE]: { angle: 135, orb: 2 },
};

export const HOUSE_SYSTEMS = {
  PLACIDUS: 'P',
  KOCH: 'K',
  EQUAL: 'E',
  WHOLE_SIGN: 'W',
  CAMPANUS: 'C',
  REGIOMONTANUS: 'R',
  PORPHYRY: 'O',
};
