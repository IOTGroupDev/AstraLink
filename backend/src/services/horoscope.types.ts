/**
 * Type definitions for horoscope generation module
 */

import type { ChartData, Planet } from '../dating/dating.types';
import type { Sign, DignityLevel } from '../modules/shared/types';

// Re-export ChartData for convenience
export type { ChartData };

// Extended planet with transit-specific properties
export interface TransitPlanet extends Planet {
  speed?: number; // deg/day
  isRetrograde?: boolean;
}

// Transit data with planets and date
export interface TransitData {
  planets: Record<string, TransitPlanet>;
  date: Date;
}

// Transit aspect between natal and current position
export interface TransitAspect {
  natalPlanet: string;
  transitPlanet: string;
  aspect:
    | 'conjunction'
    | 'opposition'
    | 'trine'
    | 'square'
    | 'sextile'
    | 'quincunx';
  orb: number;
  strength: number;
  house?: number;
  isRetrograde?: boolean;
  transitSign?: Sign;
  transitSpeed?: number;
  dignity?: DignityLevel;
  isApplying?: boolean;
  domain?: 'love' | 'career' | 'health' | 'finance' | 'general';
}

// Horoscope generation context
export interface HoroscopeContext {
  chartData: ChartData;
  transitDate: Date;
  period: 'day' | 'tomorrow' | 'week' | 'month';
  isPremium: boolean;
  transitAspects: TransitAspect[];
}

// Text generation templates
export interface HoroscopeTexts {
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
  challenges: string[];
  opportunities: string[];
}

// Dominant transit for a specific domain
export interface DominantTransit extends TransitAspect {
  score: number;
}

// Energy calculation result
export interface EnergyMetrics {
  energy: number; // 0-100
  mood: 'excellent' | 'good' | 'neutral' | 'challenging' | 'difficult';
  positiveCount: number;
  negativeCount: number;
}

// Lucky elements
export interface LuckyElements {
  numbers: number[];
  colors: string[];
}

// Chart lookup result
export interface ChartLookupResult {
  chartData: ChartData | null;
  foundVia: 'admin' | 'regular' | 'prisma' | 'repository' | 'none';
}

// Aspect calculation result
export interface AspectCalculationResult {
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
  strength: number;
}

// Rule-based prediction texts
export interface RuleBasedPredictions {
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
}
