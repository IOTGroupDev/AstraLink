import { z } from 'zod';

export const UpgradeSubscriptionSchema = z.object({
  tier: z.string(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
});

export type UpgradeSubscriptionRequest = z.infer<
  typeof UpgradeSubscriptionSchema
>;
