import { z } from 'zod';

export const SubscriptionStatusResponseSchema = z.object({
  tier: z.string(),
  expiresAt: z.string(),
  isTrial: z.boolean(),
});

export type SubscriptionStatusResponse = z.infer<
  typeof SubscriptionStatusResponseSchema
>;
