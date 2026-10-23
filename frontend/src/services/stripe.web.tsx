import React from 'react';
import type {
  StripeProviderProps,
  useStripe as useNativeStripe,
} from '@stripe/stripe-react-native';

type PaymentSheetApi = Pick<
  ReturnType<typeof useNativeStripe>,
  'initPaymentSheet' | 'presentPaymentSheet'
>;

const unavailable = async (): Promise<never> => {
  throw new Error('Payments are available in the mobile app.');
};

const webPaymentSheet: PaymentSheetApi = {
  initPaymentSheet: unavailable,
  presentPaymentSheet: unavailable,
};

// Native Stripe cannot be imported into a browser bundle.
export function StripeProvider({ children }: StripeProviderProps) {
  return <>{children}</>;
}

export function useStripe(): PaymentSheetApi {
  return webPaymentSheet;
}
