import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
const LOGO_SIZE = width * 0.4;

const AstralLogo: React.FC = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    scale.value = withSpring(1, { damping: 8, stiffness: 100 });

    glow.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Svg width={LOGO_SIZE} height={LOGO_SIZE} style={styles.svg}>
        <Defs>
          <SvgGradient id="astralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#1E40AF" stopOpacity="1" />
          </SvgGradient>
          <SvgGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Outer ring */}
        <Circle
          cx={LOGO_SIZE / 2}
          cy={LOGO_SIZE / 2}
          r={LOGO_SIZE * 0.45}
          stroke="url(#astralGradient)"
          strokeWidth="3"
          fill="none"
        />

        {/* Inner ring */}
        <Circle
          cx={LOGO_SIZE / 2}
          cy={LOGO_SIZE / 2}
          r={LOGO_SIZE * 0.3}
          stroke="url(#innerGradient)"
          strokeWidth="2"
          fill="none"
        />

        {/* Center star */}
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

        {/* Orbiting planets */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = i * 60 * (Math.PI / 180);
          const x = LOGO_SIZE / 2 + Math.cos(angle) * (LOGO_SIZE * 0.38);
          const y = LOGO_SIZE / 2 + Math.sin(angle) * (LOGO_SIZE * 0.38);

          return (
            <Circle key={i} cx={x} cy={y} r="4" fill="url(#astralGradient)" />
          );
        })}
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  svg: {
    position: 'absolute',
  },
});

export default AstralLogo;
