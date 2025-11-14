import { z } from 'zod';

export const ConnectionSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(),
  targetName: z.string(),
  targetData: z.record(z.string(), z.any()),
  synastry: z.record(z.string(), z.any()).optional(),
  composite: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().optional(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

export const CreateConnectionRequestSchema = z.object({
  targetName: z.string().min(2),
  targetData: z.record(z.string(), z.any()),
});

export type CreateConnectionRequest = z.infer<
  typeof CreateConnectionRequestSchema
>;

export const SynastryResponseSchema = z.object({
  compatibility: z.number().min(0).max(100),
  aspects: z.array(z.any()),
});

export type SynastryResponse = z.infer<typeof SynastryResponseSchema>;

export const CompositeResponseSchema = z.object({
  summary: z.string(),
});

export type CompositeResponse = z.infer<typeof CompositeResponseSchema>;
