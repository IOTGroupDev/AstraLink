// Design tokens for consistent theming

export const colors = {
  background: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#666666',

  primary: '#8B5CF6',
  primaryDim: 'rgba(139, 92, 246, 0.2)',
  primaryBorder: 'rgba(139, 92, 246, 0.3)',

  accentGold: '#FFD700',
  accentOrange: '#FF6B35',
  accentTeal: '#4ECDC4',
  accentRed: '#FF6B6B',

  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(139, 92, 246, 0.2)',

  dividerDanger: 'rgba(255, 107, 107, 0.3)',
  danger: '#FF6B6B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 25,
  round: 999,
};

export const shadow = {
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const planetPalettes = {
  fire: ['#FF6B35', '#F7931E', '#FFD700'] as const,
  water: ['#4ECDC4', '#44A08D', '#096B72'] as const,
  earth: ['#8FBC8F', '#556B2F', '#2F4F2F'] as const,
  air: ['#FFD700', '#8B5CF6', '#DDA0DD'] as const,
} as const;
