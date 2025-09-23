import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8 
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.8, 0.3]),
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-100, 100]),
      },
    ],
  }));

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default ShimmerLoader;
