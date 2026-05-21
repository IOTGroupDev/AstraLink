import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
  session?: Session;
}

interface UserProfile extends User {
  zodiacSign?: string;
  element?: string;
}

interface UpdateProfileRequest {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
}
