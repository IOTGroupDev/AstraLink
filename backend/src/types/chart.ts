import { z } from 'zod';

export const ChartSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  type: z.string(), // natal, transit, synastry, composite
  data: z.record(z.string(), z.any()), // JSON данные карты
  createdAt: z.string().optional(),
});

export type Chart = z.infer<typeof ChartSchema>;

export const CreateNatalChartRequestSchema = z.object({
  data: z.record(z.string(), z.any()),
});

export type CreateNatalChartRequest = z.infer<
  typeof CreateNatalChartRequestSchema
>;

export const TransitRequestSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TransitRequest = z.infer<typeof TransitRequestSchema>;
