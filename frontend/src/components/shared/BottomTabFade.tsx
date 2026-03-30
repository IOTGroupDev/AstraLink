import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOptionalBottomTabBarHeight } from '../../hooks/useOptionalBottomTabBarHeight';

type BottomTabFadeProps = {
  fadeHeight?: number;
  colors?: readonly [string, string, string, string];
};

const DEFAULT_COLORS = [
  'rgba(10, 15, 28, 0)',
  'rgba(10, 15, 28, 0.39)',
  'rgba(10, 15, 28, 0.9)',
  'rgba(10, 15, 28, 1)',
] as const;

export const BottomTabFade: React.FC<BottomTabFadeProps> = ({
  fadeHeight,
  colors = DEFAULT_COLORS,
}) => {
  const tabBarHeight = useOptionalBottomTabBarHeight();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.overlay,
        { height: fadeHeight ?? Math.max(148, tabBarHeight + 58) },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 12,
  },
});
