import { z } from 'zod';

export const SubscriptionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  level: z.enum(['Free', 'AstraPlus', 'DatingPremium', 'MAX']),
  expiresAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const UpgradeSubscriptionRequestSchema = z.object({
  level: z.enum(['AstraPlus', 'DatingPremium', 'MAX']),
});

export type UpgradeSubscriptionRequest = z.infer<
  typeof UpgradeSubscriptionRequestSchema
>;

export const SubscriptionStatusResponseSchema = z.object({
  level: z.string(),
  expiresAt: z.string(),
  isActive: z.boolean(),
  features: z.array(z.string()),
});

export type SubscriptionStatusResponse = z.infer<
  typeof SubscriptionStatusResponseSchema
>;
