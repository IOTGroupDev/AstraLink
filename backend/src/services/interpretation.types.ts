/**
 * Type definitions for chart interpretation module
 */

import type {
  ChartData,
  Planet,
  House,
  ChartAspect,
} from '../dating/dating.types';

// Re-export for convenience
export type { ChartData, Planet, House, ChartAspect };

// Planet interpretation result
export interface PlanetInterpretation {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  interpretation: string;
  keywords: string[];
  strengths: string[];
  challenges: string[];
}

// Aspect interpretation result
export interface AspectInterpretation {
  aspect: string;
  interpretation: string;
  significance: string;
  orb: number;
  strength: number;
  planetA: string;
  planetB: string;
  type: string;
}

// House interpretation result
export interface HouseInterpretation {
  house: number;
  sign: string;
  interpretation: string;
  lifeArea: string;
  keywords: string[];
  strengths: string[];
  challenges: string[];
  planets: string[];
  theme: string;
  rulingPlanet: string;
}

// Chart summary
export interface ChartSummary {
  personalityTraits: string[];
  lifeThemes: string[];
  karmaLessons: string[];
  talents: string[];
  recommendations: string[];
  dominantElements: string[];
  dominantQualities: string[];
  lifePurpose: string;
  relationships: string;
  careerPath: string;
  spiritualPath: string;
  healthFocus: string;
  financialApproach: string;
}

// Chart pattern interpretation
export interface ChartPatternInterpretation {
  type: 'grand_trine' | 't_square' | 'yod';
  planets: string[];
  element?: string;
  description: string;
  interpretation: string;
  strength: number;
}

// Complete natal chart interpretation
export interface NatalChartInterpretation {
  overview: string;
  sunSign: PlanetInterpretation;
  moonSign: PlanetInterpretation;
  ascendant: PlanetInterpretation;
  planets: PlanetInterpretation[];
  aspects: AspectInterpretation[];
  houses: HouseInterpretation[];
  patterns?: ChartPatternInterpretation[]; // Chart patterns (Grand Trine, T-Square, Yod)
  summary: ChartSummary;
}

// Element count for analysis
export interface ElementCounts {
  fire: number;
  earth: number;
  air: number;
  water: number;
}

// Quality count for analysis
export interface QualityCounts {
  cardinal: number;
  fixed: number;
  mutable: number;
}

// Chart analysis metrics
export interface ChartMetrics {
  elements: ElementCounts;
  qualities: QualityCounts;
  dominantElement: string;
  dominantQuality: string;
}
