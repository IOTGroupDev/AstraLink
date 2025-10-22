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

  // Main
  MainTabs: undefined;
  Subscription: undefined;
  EditProfileScreen: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
