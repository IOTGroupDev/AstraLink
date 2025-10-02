import { z } from 'zod';

export const SubscriptionTierSchema = z.enum([
  'free',
  'trial',
  'premium',
  'max',
]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;
