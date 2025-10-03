import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

type Elevation = 'none' | 'sm' | 'md';
type BorderVariant = 'default' | 'danger' | 'none';

interface CardProps {
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
  radius?: keyof typeof radii;
  elevation?: Elevation;
  border?: BorderVariant;
  backgroundColor?: string;
}

const elevationStyle: Record<Elevation, ViewStyle> = {
  none: {},
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
};

export const Card: React.FC<PropsWithChildren<CardProps>> = ({
  style,
  children,
  padding = 'lg',
  radius = 'lg',
  elevation = 'none',
  border = 'default',
  backgroundColor = colors.cardBg,
}) => {
  const borderStyle: ViewStyle =
    border === 'none'
      ? {}
      : {
          borderWidth: 1,
          borderColor: border === 'danger' ? colors.danger : colors.cardBorder,
        };

  return (
    <View
      style={[
        styles.base,
        {
          padding: spacing[padding],
          borderRadius: radii[radius],
          backgroundColor,
        },
        borderStyle,
        elevationStyle[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});

export default Card;
