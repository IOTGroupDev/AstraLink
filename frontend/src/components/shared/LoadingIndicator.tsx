import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import loadingAnimation from '../../../assets/loading-lottie.json';

interface LoadingIndicatorProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function LoadingIndicator({
  size = 'large',
  style,
}: LoadingIndicatorProps) {
  const dimension =
    typeof size === 'number' ? size : size === 'small' ? 26 : 64;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.container, { width: dimension, height: dimension }, style]}
    >
      <LottieView
        source={loadingAnimation}
        autoPlay
        loop
        resizeMode="contain"
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexShrink: 0,
  },
});
