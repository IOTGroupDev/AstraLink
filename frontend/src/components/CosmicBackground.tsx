import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const CosmicBackground: React.FC = () => {
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    rotation1.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );

    rotation2.value = withRepeat(
      withTiming(-360, { duration: 80000, easing: Easing.linear }),
      -1,
      false
    );

    rotation3.value = withRepeat(
      withTiming(360, { duration: 100000, easing: Easing.linear }),
      -1,
      false
    );

    glow.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation1.value}deg` }],
    opacity: interpolate(glow.value, [0, 1], [0.3, 0.6]),
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }],
    opacity: interpolate(glow.value, [0, 1], [0.2, 0.4]),
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation3.value}deg` }],
    opacity: interpolate(glow.value, [0, 1], [0.1, 0.3]),
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/*Background cosmic elements */}
      <Animated.View style={[styles.cosmicLayer, animatedStyle1]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient
              id="cosmicGradient1"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.1} />
              <Stop offset="50%" stopColor="#3B82F6" stopOpacity={0.05} />
              <Stop offset="100%" stopColor="#1E40AF" stopOpacity={0.1} />
            </SvgGradient>
          </Defs>

          <Circle
            cx={width * 0.2}
            cy={height * 0.3}
            r={width * 0.15}
            stroke="url(#cosmicGradient1)"
            strokeWidth="2"
            fill="none"
          />
          <Circle
            cx={width * 0.8}
            cy={height * 0.7}
            r={width * 0.12}
            stroke="url(#cosmicGradient1)"
            strokeWidth="2"
            fill="none"
          />
          <Circle
            cx={width * 0.6}
            cy={height * 0.2}
            r={width * 0.08}
            stroke="url(#cosmicGradient1)"
            strokeWidth="1"
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.cosmicLayer, animatedStyle2]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient
              id="cosmicGradient2"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#F59E0B" stopOpacity={0.08} />
              <Stop offset="50%" stopColor="#EF4444" stopOpacity={0.05} />
              <Stop offset="100%" stopColor="#DC2626" stopOpacity={0.08} />
            </SvgGradient>
          </Defs>

          <Circle
            cx={width * 0.1}
            cy={height * 0.8}
            r={width * 0.1}
            stroke="url(#cosmicGradient2)"
            strokeWidth="1"
            fill="none"
          />
          <Circle
            cx={width * 0.9}
            cy={height * 0.4}
            r={width * 0.06}
            stroke="url(#cosmicGradient2)"
            strokeWidth="1"
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.cosmicLayer, animatedStyle3]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient
              id="cosmicGradient3"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {/* ✅ Изменено: stopOpacity теперь число */}
              <Stop offset="0%" stopColor="#10B981" stopOpacity={0.06} />
              <Stop offset="50%" stopColor="#059669" stopOpacity={0.04} />
              <Stop offset="100%" stopColor="#047857" stopOpacity={0.06} />
            </SvgGradient>
          </Defs>

          <Circle
            cx={width * 0.3}
            cy={height * 0.9}
            r={width * 0.04}
            stroke="url(#cosmicGradient3)"
            strokeWidth="1"
            fill="none"
          />
          <Circle
            cx={width * 0.7}
            cy={height * 0.1}
            r={width * 0.05}
            stroke="url(#cosmicGradient3)"
            strokeWidth="1"
            fill="none"
          />
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
  },
  cosmicLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default CosmicBackground;
