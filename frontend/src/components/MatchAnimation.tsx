import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface MatchAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

const MatchAnimation: React.FC<MatchAnimationProps> = ({ visible, onComplete }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);
  const textScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Анимация появления
      scale.value = withSequence(
        withTiming(0.8, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );
      
      opacity.value = withTiming(1, { duration: 300 });
      
      // Анимация вращения
      rotation.value = withTiming(360, { duration: 2000, easing: Easing.linear });
      
      // Анимация свечения
      glow.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        3,
        false
      );
      
      // Анимация текста
      textScale.value = withDelay(500, withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      ));
      
      // Завершение анимации
      setTimeout(() => {
        onComplete();
      }, 3000);
    } else {
      // Сброс анимации
      scale.value = 0;
      opacity.value = 0;
      rotation.value = 0;
      glow.value = 0;
      textScale.value = 0;
    }
  }, [visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedOrb1Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: interpolate(glow.value, [0, 1], [1, 1.2]) },
    ],
  }));

  const animatedOrb2Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-rotation.value}deg` },
      { scale: interpolate(glow.value, [0, 1], [1, 1.2]) },
    ],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: interpolate(textScale.value, [0, 1], [0, 1]),
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        {/* Orb 1 */}
        <Animated.View style={[styles.orb1, animatedOrb1Style]}>
          <Svg width={120} height={120} style={styles.orbSvg}>
            <Defs>
              <SvgGradient id="orb1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.7" />
              </SvgGradient>
            </Defs>
            <Circle
              cx="60"
              cy="60"
              r="50"
              fill="url(#orb1Gradient)"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="3"
            />
            <Circle
              cx="60"
              cy="60"
              r="30"
              fill="none"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
            />
          </Svg>
        </Animated.View>

        {/* Orb 2 */}
        <Animated.View style={[styles.orb2, animatedOrb2Style]}>
          <Svg width={120} height={120} style={styles.orbSvg}>
            <Defs>
              <SvgGradient id="orb2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
                <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.7" />
              </SvgGradient>
            </Defs>
            <Circle
              cx="60"
              cy="60"
              r="50"
              fill="url(#orb2Gradient)"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="3"
            />
            <Circle
              cx="60"
              cy="60"
              r="30"
              fill="none"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
            />
          </Svg>
        </Animated.View>

        {/* Connection line */}
        <View style={styles.connectionLine}>
          <Svg width={200} height={4} style={styles.lineSvg}>
            <Defs>
              <SvgGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                <Stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
                <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
              </SvgGradient>
            </Defs>
            <Path
              d="M 0 2 Q 100 0 200 2"
              stroke="url(#lineGradient)"
              strokeWidth="4"
              fill="none"
            />
          </Svg>
        </View>

        {/* Match text */}
        <Animated.View style={[styles.textContainer, animatedTextStyle]}>
          <Text style={styles.matchTitle}>Соединение звёзд!</Text>
          <Text style={styles.matchSubtitle}>Вы нашли своего космического партнёра</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb1: {
    position: 'absolute',
    left: width * 0.2,
    top: height * 0.3,
  },
  orb2: {
    position: 'absolute',
    right: width * 0.2,
    top: height * 0.3,
  },
  orbSvg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  connectionLine: {
    position: 'absolute',
    top: height * 0.35,
    left: width * 0.3,
    right: width * 0.3,
  },
  lineSvg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  textContainer: {
    position: 'absolute',
    top: height * 0.5,
    alignItems: 'center',
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 10,
  },
  matchSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default MatchAnimation;
