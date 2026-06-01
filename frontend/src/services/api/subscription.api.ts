import { api } from './client';
import type { Subscription } from '../../types';
import type { SubscriptionTier } from '../../types/subscription';

export interface StripePaymentSheetParams {
  customerId: string;
  customerEphemeralKeySecret: string;
  setupIntentClientSecret: string;
  setupIntentId: string;
}

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
  createStripePaymentSheet: async (
    tier: SubscriptionTier
  ): Promise<StripePaymentSheetParams> => {
    const response = await api.post('/subscription/stripe/payment-sheet', {
      tier,
    });
    return response.data;
  },
  confirmStripePayment: async (
    tier: SubscriptionTier,
    setupIntentId: string
  ): Promise<any> => {
    const response = await api.post('/subscription/stripe/confirm', {
      tier,
      setupIntentId,
    });
    return response.data;
  },
};
