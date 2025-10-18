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
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const ConstellationLines: React.FC = () => {
  const animation = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    glow.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.2, 0.6]),
  }));

  // Создаём несколько созвездий
  const constellations = [
    // Большая Медведица
    {
      id: 'ursa_major',
      paths: [
        { d: 'M 50 100 L 80 80 L 120 90 L 150 70', opacity: 0.3 },
        { d: 'M 80 80 L 100 60 L 130 70', opacity: 0.2 },
        { d: 'M 120 90 L 140 110 L 160 100', opacity: 0.25 },
      ],
    },
    // Орион
    {
      id: 'orion',
      paths: [
        { d: 'M 200 150 L 220 130 L 240 140 L 260 120', opacity: 0.4 },
        { d: 'M 220 130 L 230 110 L 250 120', opacity: 0.3 },
        { d: 'M 240 140 L 250 160 L 270 150', opacity: 0.35 },
      ],
    },
    // Кассиопея
    {
      id: 'cassiopeia',
      paths: [
        { d: 'M 300 80 L 320 100 L 340 90 L 360 110 L 380 100', opacity: 0.25 },
        { d: 'M 320 100 L 330 120 L 350 110', opacity: 0.2 },
      ],
    },
    // Лебедь
    {
      id: 'cygnus',
      paths: [
        { d: 'M 100 200 L 120 180 L 140 190 L 160 170', opacity: 0.3 },
        { d: 'M 120 180 L 130 160 L 150 170', opacity: 0.25 },
        { d: 'M 140 190 L 150 210 L 170 200', opacity: 0.2 },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.constellationContainer, animatedStyle]}>
        <Svg width={width} height={height} style={styles.svg}>
          <Defs>
            <SvgGradient
              id="constellationGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#3B82F6" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#1E40AF" stopOpacity="0.2" />
            </SvgGradient>
          </Defs>

          {constellations.map((constellation) => (
            <g key={constellation.id}>
              {constellation.paths.map((path, index) => (
                <Path
                  key={index}
                  d={path.d}
                  stroke="url(#constellationGradient)"
                  strokeWidth="1"
                  fill="none"
                  opacity={path.opacity}
                />
              ))}
            </g>
          ))}
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
  constellationContainer: {
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

export default ConstellationLines;
