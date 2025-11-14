// types/personal-code.ts

export enum CodePurpose {
  LUCK = 'luck',
  HEALTH = 'health',
  WEALTH = 'wealth',
  LOVE = 'love',
  CAREER = 'career',
  CREATIVITY = 'creativity',
  PROTECTION = 'protection',
  INTUITION = 'intuition',
  HARMONY = 'harmony',
  ENERGY = 'energy',
}

export interface CodeDigitBreakdown {
  digit: number;
  position: number;
  source: string;
  astrologyMeaning: string;
  numerologyMeaning: string;
  influence: string;
}

export interface PersonalCodeResult {
  code: string;
  purpose: CodePurpose;
  digitCount: number;
  breakdown: CodeDigitBreakdown[];
  interpretation: {
    summary: string;
    detailed: string;
    howToUse: string[];
    whenToUse: string;
    energyLevel: number;
    compatibility: string;
    vibration: string;
  };
  numerology: {
    totalSum: number;
    reducedNumber: number;
    masterNumber?: number;
    meaning: string;
  };
  generatedAt: string;
  generatedBy: 'algorithm' | 'ai';
  subscriptionTier: 'free' | 'premium' | 'max'; // Keep as string union for frontend compatibility
}
