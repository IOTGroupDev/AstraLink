/**
 * Переиспользуемые стили для всего приложения
 * Избегает дублирования одинаковых стилей в разных экранах
 */

import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  /**
   * Container styles
   */
  container: {
    flex: 1,
  },

  containerCenter: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  containerPadded: {
    flex: 1,
    padding: theme.spacing.lg,
  },

  /**
   * Card styles
   */
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  cardSmall: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  cardLarge: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  cardWithShadow: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },

  /**
   * Button styles
   */
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  buttonPrimary: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primary,
  },

  buttonSecondary: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },

  buttonOutline: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  buttonSmall: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.small,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  /**
   * Text styles
   */
  textTitle: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
  },

  textHeading: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
  },

  textSubheading: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
  },

  textBody: {
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.text,
  },

  textBodySecondary: {
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.textSecondary,
  },

  textSmall: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.textSecondary,
  },

  textCaption: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.textTertiary,
  },

  textBold: {
    fontWeight: theme.fontWeights.bold,
  },

  textCenter: {
    textAlign: 'center' as const,
  },

  /**
   * Input styles
   */
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },

  inputFocused: {
    borderColor: theme.colors.primary,
  },

  inputError: {
    borderColor: theme.colors.error,
  },

  /**
   * Layout styles
   */
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  rowSpaceBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  rowCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  column: {
    flexDirection: 'column' as const,
  },

  columnCenter: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  /**
   * Spacing utilities
   */
  marginBottomSm: {
    marginBottom: theme.spacing.sm,
  },

  marginBottomMd: {
    marginBottom: theme.spacing.md,
  },

  marginBottomLg: {
    marginBottom: theme.spacing.lg,
  },

  marginBottomXl: {
    marginBottom: theme.spacing.xl,
  },

  paddingSm: {
    padding: theme.spacing.sm,
  },

  paddingMd: {
    padding: theme.spacing.md,
  },

  paddingLg: {
    padding: theme.spacing.lg,
  },

  paddingXl: {
    padding: theme.spacing.xl,
  },

  /**
   * Badge/Status styles
   */
  badgeSuccess: {
    backgroundColor: theme.colors.successLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },

  badgeWarning: {
    backgroundColor: theme.colors.warningLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },

  badgeError: {
    backgroundColor: theme.colors.errorLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },

  badgeInfo: {
    backgroundColor: theme.colors.infoLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },

  /**
   * Loading/Error states
   */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.xxl,
  },

  errorContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },

  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.base,
    fontWeight: theme.fontWeights.medium,
  },

  /**
   * Divider
   */
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  dividerVertical: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
});

/**
 * Хелпер для создания стилей с темой
 * Используйте если нужны динамические значения
 */
export const createThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  stylesFactory: (theme: typeof theme) => T
): T => {
  return StyleSheet.create(stylesFactory(theme));
};
