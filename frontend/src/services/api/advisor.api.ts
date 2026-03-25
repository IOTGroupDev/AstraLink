import { api } from './client';

export type AdvisorTopic =
  | 'contract'
  | 'meeting'
  | 'date'
  | 'travel'
  | 'purchase'
  | 'health'
  | 'negotiation'
  | 'custom';

export interface AdvisorEvaluatePayload {
  topic: AdvisorTopic;
  date: string;
  timezone?: string;
  customNote?: string;
}

export interface AdvisorEvaluateResponse {
  verdict: 'good' | 'neutral' | 'challenging';
  color: string;
  score: number;
  factors: {
    label: string;
    weight: number;
    value: number;
    contribution: number;
    description?: string;
  }[];
  aspects: {
    planetA: string;
    planetB: string;
    type:
      | 'conjunction'
      | 'sextile'
      | 'square'
      | 'trine'
      | 'opposition'
      | 'semi-sextile'
      | 'semi-square'
      | 'sesquiquadrate'
      | 'quincunx'
      | 'quintile'
      | 'biquintile';
    orb: number;
    impact: number;
    description?: string;
  }[];
  houses: {
    house: number;
    sign: string;
    relevance: string;
    planets: string[];
  }[];
  bestWindows: { startISO: string; endISO: string; score: number }[];
  recommendations?: {
    text: string;
    priority: 'high' | 'medium' | 'low';
    category: 'action' | 'caution' | 'warning';
  }[];
  explanation: string;
  generatedBy: 'rules' | 'hybrid' | string;
  evaluatedAt: string;
  date: string;
  topic: string;
  timezone?: string;
  topicDescription?: string;
}

export const advisorAPI = {
  evaluate: async (
    data: AdvisorEvaluatePayload
  ): Promise<AdvisorEvaluateResponse> => {
    const response = await api.post('/advisor/evaluate', data);
    return response.data;
  },
};
