import { z } from 'zod';

export const ChartSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string(),
  birthDate: z.string(),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
  timezone: z.string(),
  houses: z.record(z.string(), z.any()),
  planets: z.record(z.string(), z.any()),
  aspects: z.record(z.string(), z.any()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Chart = z.infer<typeof ChartSchema>;
