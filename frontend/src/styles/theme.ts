/**
 * Централизованная тема приложения AstraLink
 * Единый источник правды для цветов, размеров, градиентов
 */

export const theme = {
  /**
   * Цветовая палитра
   */
  colors: {
    // Primary colors
    primary: '#8B5CF6', // Purple
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',

    // Background colors
    background: '#0F172A', // Dark blue
    backgroundLight: '#1E293B',
    backgroundLighter: '#334155',

    // Card/Surface colors
    card: 'rgba(255, 255, 255, 0.05)',
    cardHover: 'rgba(255, 255, 255, 0.08)',

    // Border colors
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.15)',

    // Text colors
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',

    // Status colors
    success: '#10B981', // Green
    successLight: 'rgba(16, 185, 129, 0.25)',
    warning: '#F59E0B', // Orange
    warningLight: 'rgba(245, 158, 11, 0.25)',
    error: '#EF4444', // Red
    errorLight: 'rgba(239, 68, 68, 0.25)',
    info: '#3B82F6', // Blue
    infoLight: 'rgba(59, 130, 246, 0.25)',

    // Zodiac colors
    fire: '#FF6B6B', // Aries, Leo, Sagittarius
    earth: '#4ECDC4', // Taurus, Virgo, Capricorn
    air: '#F7B731', // Gemini, Libra, Aquarius
    water: '#5F27CD', // Cancer, Scorpio, Pisces
  },

  /**
   * Градиенты
   */
  gradients: {
    primary: ['#8B5CF6', '#7C3AED'],
    cosmic: ['#0F172A', '#1E293B', '#334155'],
    fire: ['#FF6B6B', '#EE5A6F'],
    earth: ['#4ECDC4', '#44A08D'],
    air: ['#F7B731', '#FED330'],
    water: ['#5F27CD', '#341F97'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
  },

  /**
   * Размеры границ (border radius)
   */
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
    full: 9999,
  },

  /**
   * Отступы и паддинги
   */
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  /**
   * Размеры шрифтов
   */
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
  },

  /**
   * Веса шрифтов
   */
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  /**
   * Тени
   */
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 6,
    },
  },

  /**
   * Z-индексы (для модалов, оверлеев)
   */
  zIndex: {
    base: 1,
    dropdown: 10,
    modal: 100,
    overlay: 1000,
    tooltip: 10000,
  },
} as const;

export type Theme = typeof theme;

/**
 * Хелпер для получения rgba цвета с альфа-каналом
 */
export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
