// src/constants/onboarding.constants.ts
import { Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export const FRAME = {
  WIDTH: 430,
  HEIGHT: 932,
  SCALE: SCREEN_W / 430,
};

export const ONBOARDING_COLORS = {
  bgTop: '#2b0e3b',
  bgBottom: '#0d0d0d',
  bg: '#101010',
  white: '#FFFFFF',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.72)',
  textDim70: 'rgba(255, 255, 255, 0.7)',
  textDim75: 'rgba(255, 255, 255, 0.75)',
  textDim50: 'rgba(255, 255, 255, 0.5)',
  btnBg: '#ECECEC',
  btnBgDisabled: 'rgba(236, 236, 236, 0.4)',
  btnText: '#000000',
  pillBorder: 'rgba(255, 255, 255, 0.35)',
  pillBg: 'rgba(255, 255, 255, 0.05)',
} as const;

export const ONBOARDING_TYPOGRAPHY = {
  h1: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Montserrat_600SemiBold',
  },
  h2: {
    fontSize: 22.17,
    lineHeight: 27,
    fontFamily: 'Montserrat_400Regular',
  },
  body: {
    fontSize: 19,
    lineHeight: 28,
    fontFamily: 'Montserrat_400Regular',
  },
  bodyLarge: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Montserrat_400Regular',
  },
  cta: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Montserrat_500Medium',
  },
  step: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Montserrat_400Regular',
  },
} as const;

export const ONBOARDING_LAYOUT = {
  headerHeight: 56,
  headerTopOffset: 16,
  horizontalPadding: 24,
  buttonHeight: 60,
  buttonBottomOffset: 16,
  buttonBorderRadius: 58,
} as const;
