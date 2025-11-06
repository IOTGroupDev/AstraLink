// src/types/navigation.ts
export type RootStackParamList = {
  // Onboarding
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: undefined;

  // Auth
  SignUp: undefined;
  AuthEmail: undefined;
  MagicLinkWaiting: { email: string };
  AuthCallback: undefined; // 👈 Добавлено
  UserDataLoader: undefined; // 👈 для replace('UserDataLoader')
  OptCode: {
    email: string;
    codeLength?: number;
    shouldCreateUser?: boolean;
  };

  // Main
  MainTabs: undefined;
  Subscription: undefined;
  EditProfileScreen: undefined;

  // Chat
  ChatList: undefined;
  ChatDialog: {
    otherUserId: string;
    displayName?: string | null;
    primaryPhotoUrl?: string | null;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
