// src/constants/auth.constants.ts
export const AUTH_COLORS = {
  bg: '#0D0618',
  text: '#FFFFFF',
  textDim70: 'rgba(255, 255, 255, 0.7)',
  textDim60: 'rgba(255, 255, 255, 0.6)',
  textDim50: 'rgba(255, 255, 255, 0.5)',
  btnBg: '#ECECEC',
  btnBgDisabled: 'rgba(236, 236, 236, 0.5)',
  btnText: '#000000',
  btnPrimary: '#6F1F86',
  error: '#FF6B6B',
  errorLight: '#ff8080',
  loaderPrimary: '#8B5CF6',
  border: '#ECECEC',
} as const;

export const AUTH_TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: '600' as const,
    fontFamily: 'Montserrat_600SemiBold',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '400' as const,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 27,
  },
  body: {
    fontSize: 18,
    fontWeight: '500' as const,
    fontFamily: 'Montserrat_500Medium',
  },
  button: {
    fontSize: 20,
    fontWeight: '500' as const,
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: 'Montserrat_400Regular',
  },
  error: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: 'Montserrat_400Regular',
  },
} as const;

export const AUTH_LAYOUT = {
  horizontalPadding: 24,
  headerHeight: 36,
  buttonHeight: 60,
  buttonRadius: 58,
} as const;
