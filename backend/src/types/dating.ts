import { z } from 'zod';

export const DatingMatchSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  partnerId: z.string(),
  compatibility: z.number().min(0).max(100),
  details: z.record(z.string(), z.any()).optional(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  createdAt: z.string().optional(),
});

export type DatingMatch = z.infer<typeof DatingMatchSchema>;

export const MatchActionRequestSchema = z.object({
  action: z.enum(['like', 'reject']),
});

export type MatchActionRequest = z.infer<typeof MatchActionRequestSchema>;

export const DatingMatchResponseSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  partnerName: z.string(),
  compatibility: z.number(),
  status: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
});

export type DatingMatchResponse = z.infer<typeof DatingMatchResponseSchema>;
