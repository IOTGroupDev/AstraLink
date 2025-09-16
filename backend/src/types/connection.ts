import { z } from 'zod';

export const ConnectionSchema = z.object({
  id: z.string().optional(),
  user1Id: z.string(),
  user2Id: z.string(),
  connectionType: z.enum(['FRIEND', 'FAMILY', 'ROMANTIC', 'BUSINESS']),
  compatibility: z.record(z.string(), z.any()),
  aspects: z.record(z.string(), z.any()),
  status: z.enum(['PENDING', 'ACCEPTED', 'BLOCKED']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Connection = z.infer<typeof ConnectionSchema>;
