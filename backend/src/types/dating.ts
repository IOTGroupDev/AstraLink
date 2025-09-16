import { z } from 'zod';

export const DatingProfileSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  isActive: z.boolean().optional(),
  preferences: z.record(z.string(), z.any()),
  filters: z.record(z.string(), z.any()),
  bio: z.string().optional(),
  photos: z.array(z.string()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type DatingProfile = z.infer<typeof DatingProfileSchema>;

export const DatingMatchSchema = z.object({
  id: z.string().optional(),
  user1Id: z.string(),
  user2Id: z.string(),
  compatibility: z.record(z.string(), z.any()),
  status: z.enum(['PENDING', 'LIKED', 'PASSED', 'MATCHED', 'UNMATCHED']),
  astroAnalysis: z.record(z.string(), z.any()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type DatingMatch = z.infer<typeof DatingMatchSchema>;
