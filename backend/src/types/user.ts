import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number().optional(),
  email: z.string().email(),
  name: z.string().optional(),
  birthDate: z.string().optional(), // ISO date string
  birthTime: z.string().optional(), // HH:MM format
  birthPlace: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  birthDate: z.string(),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(2).optional(),
  birthPlace: z.string().optional(),
  birthTime: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
