import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

interface BiorhythmProps {
  value: number; // 0-100
  color: string;
  size?: number;
  label: string;
}

const Biorhythm: React.FC<BiorhythmProps> = ({ value, color, size = 40, label }) => {
  const progress = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value / 100, {
      duration: 2000,
      easing: Easing.out(Easing.cubic),
    });
    
    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
  }));

  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="4"
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.value}>{Math.round(value)}%</Text>
      </View>
    </Animated.View>
  );
};

interface BiorhythmsProps {
  physical?: number;
  emotional?: number;
  intellectual?: number;
}

const Biorhythms: React.FC<BiorhythmsProps> = ({ 
  physical = 75, 
  emotional = 60, 
  intellectual = 85 
}) => {
  return (
    <View style={styles.container}>
      <Biorhythm value={physical} color="#FF6B6B" label="Физ" />
      <Biorhythm value={emotional} color="#4ECDC4" label="Эмо" />
      <Biorhythm value={intellectual} color="#45B7D1" label="Инт" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 10,
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 8,
    color: '#fff',
    opacity: 0.8,
  },
});

export default Biorhythms;
