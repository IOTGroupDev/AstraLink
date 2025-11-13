import { z } from 'zod';

// Birth data for a person
export const BirthDataSchema = z.object({
  birthDate: z.string(), // ISO date string
  birthTime: z.string(), // HH:MM format
  birthPlace: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.number().optional(),
});

export type BirthData = z.infer<typeof BirthDataSchema>;

// Location coordinates
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  timezone: number;
}

// Synastry aspect between two charts
export interface SynastryAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  strength?: number;
}

// Connection between user and target person
export const ConnectionSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(),
  targetName: z.string(),
  targetData: BirthDataSchema,
  synastry: z
    .object({
      compatibility: z.number(),
      aspects: z.array(z.unknown()),
    })
    .optional(),
  composite: z
    .object({
      summary: z.string(),
    })
    .optional(),
  createdAt: z.string().optional(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

// Request to create a new connection
export const CreateConnectionRequestSchema = z.object({
  targetName: z.string().min(2),
  targetData: BirthDataSchema,
});

export type CreateConnectionRequest = z.infer<
  typeof CreateConnectionRequestSchema
>;

// Synastry analysis response
export const SynastryResponseSchema = z.object({
  compatibility: z.number().min(0).max(100),
  aspects: z.array(z.unknown()),
});

export type SynastryResponse = z.infer<typeof SynastryResponseSchema>;

// Composite chart response
export const CompositeResponseSchema = z.object({
  summary: z.string(),
});

export type CompositeResponse = z.infer<typeof CompositeResponseSchema>;
