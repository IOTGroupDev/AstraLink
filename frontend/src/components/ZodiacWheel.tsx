import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width, height) * 0.8;

const ZodiacWheel: React.FC = () => {
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 120000, easing: Easing.linear }),
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
    opacity: interpolate(glow.value, [0, 1], [0.3, 0.6]),
  }));

  const zodiacSigns = [
    { name: 'Aries', symbol: '♈', angle: 0 },
    { name: 'Taurus', symbol: '♉', angle: 30 },
    { name: 'Gemini', symbol: '♊', angle: 60 },
    { name: 'Cancer', symbol: '♋', angle: 90 },
    { name: 'Leo', symbol: '♌', angle: 120 },
    { name: 'Virgo', symbol: '♍', angle: 150 },
    { name: 'Libra', symbol: '♎', angle: 180 },
    { name: 'Scorpio', symbol: '♏', angle: 210 },
    { name: 'Sagittarius', symbol: '♐', angle: 240 },
    { name: 'Capricorn', symbol: '♑', angle: 270 },
    { name: 'Aquarius', symbol: '♒', angle: 300 },
    { name: 'Pisces', symbol: '♓', angle: 330 },
  ];

  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;
  const radius = WHEEL_SIZE * 0.35;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wheelContainer, animatedStyle]}>
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} style={styles.svg}>
          <Defs>
            <SvgGradient id="zodiacGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <Stop offset="30%" stopColor="#3B82F6" stopOpacity="0.6" />
              <Stop offset="60%" stopColor="#1E40AF" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#0F172A" stopOpacity="0.2" />
            </SvgGradient>
            <SvgGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#EF4444" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#DC2626" stopOpacity="0.2" />
            </SvgGradient>
          </Defs>
          
          {/* Outer ring */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius + 20}
            stroke="url(#zodiacGradient)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          
          {/* Main wheel */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="url(#zodiacGradient)"
            strokeWidth="3"
            fill="none"
          />
          
          {/* Inner ring */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius - 30}
            stroke="url(#innerGradient)"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Zodiac signs */}
          {zodiacSigns.map((sign, index) => {
            const angle = (sign.angle * Math.PI) / 180;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const innerX = centerX + Math.cos(angle) * (radius - 15);
            const innerY = centerY + Math.sin(angle) * (radius - 15);
            
            return (
              <React.Fragment key={sign.name}>
                {/* Connection line */}
                <Path
                  d={`M ${centerX} ${centerY} L ${x} ${y}`}
                  stroke="url(#zodiacGradient)"
                  strokeWidth="1"
                  opacity="0.4"
                />
                
                {/* Sign symbol */}
                <SvgText
                  x={x}
                  y={y + 5}
                  fontSize="16"
                  fill="url(#innerGradient)"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {sign.symbol}
                </SvgText>
                
                {/* Sign name */}
                <SvgText
                  x={innerX}
                  y={innerY + 3}
                  fontSize="8"
                  fill="rgba(255, 255, 255, 0.6)"
                  textAnchor="middle"
                >
                  {sign.name}
                </SvgText>
              </React.Fragment>
            );
          })}
          
          {/* Center point */}
          <Circle
            cx={centerX}
            cy={centerY}
            r="4"
            fill="url(#innerGradient)"
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
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
});

export default ZodiacWheel;
