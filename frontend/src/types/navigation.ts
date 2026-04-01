/* eslint-disable @typescript-eslint/no-namespace */
// src/types/navigation.ts
import type { LessonCategory } from './lessons';

export type RootStackParamList = {
  // Onboarding
  Onboarding1: undefined;
  Health: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;

  // Auth
  SignUp: undefined;
  AuthEmail: undefined;
  MagicLinkWaiting: { email: string };
  AuthCallback: undefined; // 👈 Добавлено
  OptCode: {
    email: string;
    codeLength?: number;
    shouldCreateUser?: boolean;
  };

  // Main
  MainTabs: undefined;
  Subscription: undefined;
  EditProfileScreen: undefined;
  CosmicSimulator: undefined;
  Learning:
    | {
        category?: LessonCategory;
        lessonId?: string;
        source?: 'horoscope' | 'profile' | 'lesson_task';
      }
    | undefined;

  // Chat
  ChatList: undefined;
  DatingProfile: {
    userId: string;
    compatibility: number;
    name?: string | null;
    age?: number | null;
    zodiacSign?: string | null;
    bio?: string | null;
    interests?: string[] | null;
    city?: string | null;
    photos?: string[] | null;
    photoUrl?: string | null;
    lookingFor?: string | null;
    lastActive?: string | null;
  };
  ChatDialog: {
    otherUserId: string;
    displayName?: string | null;
    primaryPhotoUrl?: string | null;
  };

  NatalChart: undefined;
  PersonalCode: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
