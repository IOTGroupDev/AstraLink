import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useStripe } from '../services/stripe';
import { subscriptionAPI } from '../services/api/subscription.api';
import { SubscriptionTier } from '../types/subscription';
import { stripeSubscriptionAvailable } from '../services/subscription-payment-config';
import i18n from '../i18n';

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
      if (!stripeSubscriptionAvailable) {
        throw new Error(i18n.t('subscription.paymentSheet.unavailable'));
      }
      if (Platform.OS === 'web') {
        throw new Error('Payments are available in the mobile app.');
      }

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
