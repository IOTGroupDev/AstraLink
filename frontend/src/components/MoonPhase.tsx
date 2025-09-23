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
import Svg, { Circle, Path } from 'react-native-svg';

interface MoonPhaseProps {
  phase: number; // 0-1 (0 = new moon, 0.5 = full moon, 1 = new moon)
  size?: number;
}

const MoonPhase: React.FC<MoonPhaseProps> = ({ phase, size = 60 }) => {
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    
    glow.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
  }));

  const getMoonPath = (phase: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.4;
    
    if (phase < 0.5) {
      // Waxing moon (растущая)
      const crescentWidth = phase * 2 * radius;
      return `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} A ${crescentWidth} ${radius} 0 0 0 ${centerX - radius} ${centerY} Z`;
    } else {
      // Waning moon (убывающая)
      const crescentWidth = (1 - phase) * 2 * radius;
      return `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} A ${crescentWidth} ${radius} 0 0 1 ${centerX - radius} ${centerY} Z`;
    }
  };

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Moon shadow */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.4}
          fill="rgba(0, 0, 0, 0.3)"
        />
        {/* Moon surface */}
        <Path
          d={getMoonPath(phase)}
          fill="#C0C0C0"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
        />
        {/* Moon craters */}
        <Circle
          cx={size * 0.4}
          cy={size * 0.35}
          r="2"
          fill="rgba(0, 0, 0, 0.2)"
        />
        <Circle
          cx={size * 0.6}
          cy={size * 0.6}
          r="1.5"
          fill="rgba(0, 0, 0, 0.2)"
        />
        <Circle
          cx={size * 0.5}
          cy={size * 0.7}
          r="1"
          fill="rgba(0, 0, 0, 0.2)"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  svg: {
    position: 'absolute',
  },
});

export default MoonPhase;
