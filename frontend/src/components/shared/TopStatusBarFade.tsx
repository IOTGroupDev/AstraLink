import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TopStatusBarFadeProps {
  fadeHeight?: number;
}

export const TopStatusBarFade: React.FC<TopStatusBarFadeProps> = ({
  fadeHeight = 30,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        'rgba(15, 23, 42, 0.9)',
        'rgba(15, 23, 42, 0.45)',
        'rgba(15, 23, 42, 0)',
      ]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.overlay, { height: insets.top + fadeHeight }]}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
