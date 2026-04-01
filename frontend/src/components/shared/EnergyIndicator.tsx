import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = width * 0.25; // Уменьшил размер
const STROKE_WIDTH = 6; // Уменьшил толщину
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

interface EnergyIndicatorProps {
  energy: number; // 0-100
  size?: number;
  color?: string;
}

const EnergyIndicator: React.FC<EnergyIndicatorProps> = ({
  energy,
  size = SIZE,
  color = '#8B5CF6',
}) => {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    progress.value = withTiming(energy / 100, {
      duration: 2000,
      easing: Easing.out(Easing.cubic),
    });

    rotation.value = withTiming(360, {
      duration: 3000,
      easing: Easing.linear,
    });
  }, [energy]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [circumference, 0]),
  }));

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.orb, rotationStyle]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            animatedProps={animatedCircleProps}
          />
        </Svg>
      </Animated.View>

      <View style={styles.content}>
        <Text style={styles.energyText}>{Math.round(energy)}%</Text>
        <Text style={styles.labelText}>Энергия</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyText: {
    fontSize: 18, // Уменьшил размер
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  labelText: {
    fontSize: 10, // Уменьшил размер
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
});

export default EnergyIndicator;
