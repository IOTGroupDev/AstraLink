export interface CompatibilityCategory {
  score: number;
  title: string;
  description: string;
}

export interface CompatibilityAspect {
  planetA: string;
  planetB: string;
  aspect: string;
  orb?: number;
  strength?: number;
}

export interface CompatibilityResult {
  score: number;
  summary: string;
  categories: {
    emotional: CompatibilityCategory;
    attraction: CompatibilityCategory;
    communication: CompatibilityCategory;
    stability: CompatibilityCategory;
  };
  keyAspects: CompatibilityAspect[];
  synastrySummary?: string;
  aiNarrative?: string;
  aiStatus: 'generated' | 'unavailable' | 'skipped' | 'failed';
}

export interface CompatibilityReport {
  id: string;
  score: number;
  result: CompatibilityResult;
  aiProvider?: string | null;
  aiGeneratedAt?: string | null;
  createdAt: string;
  isDuplicate?: boolean;
}

export interface CompatibilityQuotaStatus {
  allowed: boolean;
  remaining: number;
  totalLimit: number;
  used: number;
  resetAt: string;
}

export interface CreateCompatibilityReportRequest {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  useAi?: boolean;
}
