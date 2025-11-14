import { api } from './client';
import type { Subscription } from '../../types';
import type { SubscriptionTier } from '../../types/subscription';

export const subscriptionAPI = {
  getStatus: async (): Promise<Subscription> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },
  activateTrial: async (): Promise<any> => {
    const response = await api.post('/subscription/trial/activate');
    return response.data;
  },
  upgrade: async (
    tier: SubscriptionTier,
    paymentMethod: 'apple' | 'google' | 'mock' = 'mock',
    transactionId?: string
  ): Promise<any> => {
    const response = await api.post('/subscription/upgrade', {
      tier,
      paymentMethod,
      transactionId,
    });
    return response.data;
  },
  cancel: async (): Promise<any> => {
    const response = await api.post('/subscription/cancel');
    return response.data;
  },
};
