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

export interface Chart {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  timezone: string;
  houses: Record<string, House>;
  planets: Record<string, Planet>;
  aspects: Aspect[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Transit {
  date: string;
  planets: Record<string, Planet>;
}

export interface TransitsResponse {
  from: string;
  to: string;
  transits: Transit[];
  natalChart: Chart;
  message: string;
}
