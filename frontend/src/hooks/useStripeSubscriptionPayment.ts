import { useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { subscriptionAPI } from '../services/api/subscription.api';
import { SubscriptionTier } from '../types/subscription';

export const PAYMENT_METHOD_SHEET_DISMISS_MS = 320;

export interface StripeSubscriptionPaymentResult {
  success: boolean;
  canceled?: boolean;
}

export const waitForPaymentMethodSheetDismiss = () =>
  new Promise((resolve) =>
    setTimeout(resolve, PAYMENT_METHOD_SHEET_DISMISS_MS)
  );

export const useStripeSubscriptionPayment = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return useCallback(
    async (
      tier: SubscriptionTier
    ): Promise<StripeSubscriptionPaymentResult> => {
      const paymentSheetParams =
        await subscriptionAPI.createStripePaymentSheet(tier);

      const initResult = await initPaymentSheet({
        merchantDisplayName: 'AstraLink',
        customerId: paymentSheetParams.customerId,
        customerEphemeralKeySecret:
          paymentSheetParams.customerEphemeralKeySecret,
        setupIntentClientSecret: paymentSheetParams.setupIntentClientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      const presentResult = await presentPaymentSheet();

      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') {
          return { success: false, canceled: true };
        }

        throw new Error(presentResult.error.message);
      }

      const confirmResult = await subscriptionAPI.confirmStripePayment(
        tier,
        paymentSheetParams.setupIntentId
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.message || 'Payment confirmation failed');
      }

      return { success: true };
    },
    [initPaymentSheet, presentPaymentSheet]
  );
};
