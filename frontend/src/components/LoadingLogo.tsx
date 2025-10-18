// LoadingLogo.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

const { width } = Dimensions.get('window');
const LOGO_SIZE = width * 0.5;

const LoadingLogo: React.FC = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const glow = useSharedValue(0.5);
  const pulse = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    scale.value = withSpring(1, { damping: 8, stiffness: 100 });

    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.6, 1]),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Svg width={LOGO_SIZE} height={LOGO_SIZE}>
          <Defs>
            <SvgGradient
              id="cosmicGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
              <Stop offset="30%" stopColor="#3B82F6" stopOpacity={1} />
              <Stop offset="60%" stopColor="#1E40AF" stopOpacity={1} />
              <Stop offset="100%" stopColor="#0F172A" stopOpacity={1} />
            </SvgGradient>
            <SvgGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
              <Stop offset="50%" stopColor="#EF4444" stopOpacity={1} />
              <Stop offset="100%" stopColor="#DC2626" stopOpacity={1} />
            </SvgGradient>
            <SvgGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0.3} />
            </SvgGradient>
          </Defs>

          {/* ✅ Изменено: opacity теперь число */}
          <Circle
            cx={LOGO_SIZE / 2}
            cy={LOGO_SIZE / 2}
            r={LOGO_SIZE * 0.48}
            stroke="url(#glowGradient)"
            strokeWidth="4"
            fill="none"
            opacity={0.6}
          />

          <Circle
            cx={LOGO_SIZE / 2}
            cy={LOGO_SIZE / 2}
            r={LOGO_SIZE * 0.45}
            stroke="url(#cosmicGradient)"
            strokeWidth="3"
            fill="none"
          />

          <Circle
            cx={LOGO_SIZE / 2}
            cy={LOGO_SIZE / 2}
            r={LOGO_SIZE * 0.3}
            stroke="url(#innerGradient)"
            strokeWidth="2"
            fill="none"
          />

          <Path
            d={`M ${LOGO_SIZE / 2} ${LOGO_SIZE * 0.1} 
                 L ${LOGO_SIZE * 0.4} ${LOGO_SIZE * 0.35} 
                 L ${LOGO_SIZE * 0.1} ${LOGO_SIZE * 0.35} 
                 L ${LOGO_SIZE * 0.3} ${LOGO_SIZE * 0.55} 
                 L ${LOGO_SIZE * 0.2} ${LOGO_SIZE * 0.8} 
                 L ${LOGO_SIZE / 2} ${LOGO_SIZE * 0.65} 
                 L ${LOGO_SIZE * 0.8} ${LOGO_SIZE * 0.8} 
                 L ${LOGO_SIZE * 0.7} ${LOGO_SIZE * 0.55} 
                 L ${LOGO_SIZE * 0.9} ${LOGO_SIZE * 0.35} 
                 L ${LOGO_SIZE * 0.6} ${LOGO_SIZE * 0.35} 
                 Z`}
            fill="url(#innerGradient)"
          />

          {Array.from({ length: 8 }, (_, i) => {
            const angle = i * 45 * (Math.PI / 180);
            const x = LOGO_SIZE / 2 + Math.cos(angle) * (LOGO_SIZE * 0.38);
            const y = LOGO_SIZE / 2 + Math.sin(angle) * (LOGO_SIZE * 0.38);

            return (
              <Circle key={i} cx={x} cy={y} r="3" fill="url(#cosmicGradient)" />
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.textContainer, pulseStyle]}>
        <Text style={styles.title}>AstraLink</Text>
        <Text style={styles.subtitle}>Подключение к звёздам...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
});

export default LoadingLogo;
