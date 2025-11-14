import { api } from './client';

export const advisorAPI = {
  evaluate: async (data: {
    topic:
      | 'contract'
      | 'meeting'
      | 'date'
      | 'travel'
      | 'purchase'
      | 'health'
      | 'negotiation'
      | 'custom';
    date: string; // YYYY-MM-DD
    timezone?: string;
    customNote?: string;
  }): Promise<{
    verdict: 'good' | 'neutral' | 'challenging';
    color: string;
    score: number;
    factors: {
      label: string;
      weight: number;
      value: number;
      contribution: number;
    }[];
    aspects: {
      planetA: string;
      planetB: string;
      type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
      orb: number;
      impact: number;
    }[];
    houses: {
      house: number;
      theme: string;
      relevant: boolean;
      impact: number;
    }[];
    bestWindows: { startISO: string; endISO: string; score: number }[];
    explanation: string;
    generatedBy: 'rules' | 'hybrid';
    evaluatedAt: string;
    date: string;
    topic: string;
    timezone?: string;
  }> => {
    const response = await api.post('/advisor/evaluate', data);
    return response.data;
  },
};
