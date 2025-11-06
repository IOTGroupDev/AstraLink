// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LoadingLogo from '../../components/swap/LoadingLogo';
import AnimatedStars from '../../components/shared/AnimatedStars';
import CosmicBackground from '../../components/shared/CosmicBackground';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10 });
    opacity.value = withSequence(
      withTiming(1, { duration: 600 }),
      withTiming(0.8, { duration: 400 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <AnimatedStars />
      <CosmicBackground />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedStyle]}>
          <LoadingLogo />
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
});

export default SplashScreen;
