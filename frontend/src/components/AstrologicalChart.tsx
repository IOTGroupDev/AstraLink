import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2;
const RADIUS = Math.min(width, height) * 0.3;

const AstrologicalChart: React.FC = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );

    scale.value = withRepeat(
      withTiming(1.1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.chart, animatedStyle]}>
        <Svg width={width} height={height} style={styles.svg}>
          {/* Outer circle */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS}
            stroke="rgba(139, 92, 246, 0.3)"
            strokeWidth="2"
            fill="none"
          />

          {/* Inner circle */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS * 0.7}
            stroke="rgba(139, 92, 246, 0.2)"
            strokeWidth="1"
            fill="none"
          />

          {/* Center circle */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS * 0.3}
            stroke="rgba(139, 92, 246, 0.4)"
            strokeWidth="1"
            fill="rgba(139, 92, 246, 0.1)"
          />

          {/* Zodiac signs positions */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = i * 30 * (Math.PI / 180);
            const x1 = CENTER_X + Math.cos(angle) * (RADIUS - 20);
            const y1 = CENTER_Y + Math.sin(angle) * (RADIUS - 20);
            const x2 = CENTER_X + Math.cos(angle) * RADIUS;
            const y2 = CENTER_Y + Math.sin(angle) * RADIUS;

            return (
              <Line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(139, 92, 246, 0.3)"
                strokeWidth="1"
              />
            );
          })}

          {/* Planet positions (simplified) */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = i * 45 * (Math.PI / 180);
            const x = CENTER_X + Math.cos(angle) * (RADIUS * 0.5);
            const y = CENTER_Y + Math.sin(angle) * (RADIUS * 0.5);

            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="rgba(139, 92, 246, 0.6)"
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  chart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  svg: {
    position: 'absolute',
  },
});

export default AstrologicalChart;
