import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from './BlurView';

export function DatingGlassFill() {
  return (
    <>
      <BlurView
        pointerEvents="none"
        intensity={56}
        tint="dark"
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.tint} />
    </>
  );
}

const styles = StyleSheet.create({
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,14,28,0.08)',
  },
});
