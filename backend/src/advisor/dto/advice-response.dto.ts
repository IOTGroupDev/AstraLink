export type AdvisorVerdict = 'good' | 'neutral' | 'challenging';

export interface AdvisorFactor {
  label: string; // e.g., "Mercury trine Jupiter"
  weight: number; // base weight (positive/negative)
  value: number; // strength 0..1
  contribution: number; // weight * value
}

export interface AdvisorAspect {
  planetA: string;
  planetB: string;
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number; // degrees
  impact: number; // normalized -1..1
}

export interface AdvisorHouseImpact {
  house: number; // 1..12
  theme: string; // e.g., "Contracts & Negotiations (3rd)"
  relevant: boolean;
  impact: number; // -1..1
}

export interface AdvisorTimeWindow {
  startISO: string;
  endISO: string;
  score: number; // 0..100
}

export class AdviceResponseDto {
  verdict!: AdvisorVerdict;
  score!: number; // 0..100

  factors!: AdvisorFactor[];
  aspects!: AdvisorAspect[];
  houses!: AdvisorHouseImpact[];

  bestWindows!: AdvisorTimeWindow[];
  explanation!: string;

  generatedBy!: 'rules' | 'hybrid';
  evaluatedAt!: string; // ISO
  date!: string; // requested date (ISO, yyyy-mm-dd)
  topic!: string; // requested topic
  timezone?: string;
}
