/**
 * Type definitions for dating module
 */

// Astrology types
export type Element = 'fire' | 'earth' | 'air' | 'water';
export type ZodiacSign =
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

export type AspectType =
  | 'conjunction'
  | 'opposition'
  | 'trine'
  | 'square'
  | 'sextile'
  | 'quincunx'
  | 'semisextile';

export type PlanetName =
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
  | 'northNode'
  | 'southNode'
  | 'chiron';

// Chart data structures
export interface Planet {
  name: string;
  longitude: number;
  latitude?: number;
  sign?: ZodiacSign;
  house?: number;
  retrograde?: boolean;
}

export interface House {
  number: number;
  cusp: number;
  sign?: ZodiacSign;
}

export interface ChartAngle {
  longitude: number;
  sign?: ZodiacSign;
  degree: number;
}

export interface ChartAspect {
  planetA: PlanetName;
  planetB: PlanetName;
  aspect: AspectType;
  orb?: number;
  strength?: number;
}

export interface ChartData {
  type?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthDateTimeUtc?: string;
  calculatedAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    timezone: number | string;
  };
  planets?: Record<string, Planet>;
  houses?: Record<number, House>;
  aspects?: ChartAspect[];
  ascendant?: ChartAngle;
  midheaven?: ChartAngle;
  data?: {
    planets?: Record<string, Planet>;
    houses?: Record<number, House>;
    ascendant?: ChartAngle;
    midheaven?: ChartAngle;
  };
}

export interface SynastryData {
  aspects: ChartAspect[];
  compatibility?: number;
  summary?: string;
}

// Database entity types
export interface UserData {
  id: string;
  name?: string | null;
  email?: string | null;
  birth_date?: string | Date | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_date_encrypted?: string | null;
  birth_time_encrypted?: string | null;
  birth_place_encrypted?: string | null;
  created_at?: string | null;
}

export interface UserProfile {
  user_id: string;
  bio?: string;
  preferences?: string | object;
  city?: string;
  gender?: string;
  looking_for?: string;
  lookingFor?: string;
  looking_for_gender?: string;
  lookingForGender?: string;
  last_active?: string;
  lastActive?: string;
  display_name?: string;
  zodiac_sign?: ZodiacSign;
}

export interface UserChart {
  user_id: string;
  data: ChartData;
  created_at: string;
}

export interface UserPhoto {
  user_id: string;
  storage_path: string;
  is_primary: boolean;
}

// Dating candidate types
export type CandidateBadge = 'high' | 'medium' | 'low';

export interface CandidateRow {
  user_id: string;
  badge: CandidateBadge;
  primary_photo_path: string | null;
}

export interface EnrichedCandidate {
  userId: string;
  badge: CandidateBadge;
  photoUrl: string | null;
  photos?: string[] | null;
  name: string | null;
  age: number | null;
  zodiacSign: ZodiacSign | string | null;
  bio: string | null;
  interests?: string[];
  city: string | null;
  lookingFor?: string | null;
  lastActive?: string | null;
}

// Compatibility calculation types
export interface CompatibilityFactors {
  baseScore: number;
  elementSynergy: number;
  venusMarAspect?: number;
  moonMoonAspect?: number;
  loveHouseBonus: number;
}
