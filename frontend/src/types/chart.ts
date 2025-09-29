export interface Planet {
  longitude: number;
  sign: string;
  degree: number;
}

export interface House {
  cusp: number;
  sign: string;
}

export interface Aspect {
  planetA: string;
  planetB: string;
  aspect: string;
  orb: number;
  strength: number;
}

/**
 * Payload shape we receive from backend under 'data'
 */
export interface ChartData {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  timezone?: string | number;
  houses: Record<string, House>;
  planets: Record<string, Planet>;
  aspects: Aspect[];
}

/**
 * Stored chart record (as returned by backend).
 * Many API responses wrap ChartData under 'data'.
 * For compatibility, legacy top-level fields remain optional.
 */
export interface Chart {
  id: string;
  userId: string;

  // Optional metadata
  name?: string;

  // Legacy flattened fields (optional for backward compatibility)
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  timezone?: string;

  // Legacy flattened structures (optional)
  houses?: Record<string, House>;
  planets?: Record<string, Planet>;
  aspects?: Aspect[];

  // Backend payload wrapper (preferred)
  data?: ChartData;

  createdAt?: string;
  updatedAt?: string;
}

export interface Transit {
  date: string;
  planets: Record<string, Planet>;
  aspect?: string;
}

export type NatalChartLike = Chart | ChartData;

export interface TransitsResponse {
  from: string;
  to: string;
  transits: Transit[];
  // Backend returns chart.data for natalChart; support both shapes
  natalChart: NatalChartLike;
  message: string;
}
