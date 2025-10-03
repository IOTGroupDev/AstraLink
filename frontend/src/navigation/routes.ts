// Централизованный реестр маршрутов приложения

export const ROUTES = {
  STACK: {
    MAIN_TABS: 'MainTabs',
    SUBSCRIPTION: 'Subscription',
    EDIT_PROFILE: 'EditProfileScreen',
  },
  TABS: {
    CHART_STACK: 'ChartStack',
    COSMIC_SIMULATOR: 'CosmicSimulator',
    DATING: 'Dating',
    PROFILE: 'Profile',
  },
  CHART_STACK: {
    MY_CHART: 'MyChart',
    NATAL_CHART: 'NatalChart',
  },
} as const;

export type RouteValue =
  | (typeof ROUTES.STACK)[keyof typeof ROUTES.STACK]
  | (typeof ROUTES.TABS)[keyof typeof ROUTES.TABS]
  | (typeof ROUTES.CHART_STACK)[keyof typeof ROUTES.CHART_STACK];
