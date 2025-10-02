export interface User {
  id: string;
  email: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
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
