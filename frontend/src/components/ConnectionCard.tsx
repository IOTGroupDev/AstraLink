import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

interface ConnectionCardProps {
  name: string;
  zodiacSign: string;
  compatibility: number;
  onPress: () => void;
  animationValue: Animated.SharedValue<number>;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  name,
  zodiacSign,
  compatibility,
  onPress,
  animationValue,
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 8, stiffness: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 100 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: interpolate(animationValue.value, [0, 1], [50, 0]) },
    ],
    opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.3, 0.6]),
  }));

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    if (score >= 40) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  const getZodiacSymbol = (sign: string) => {
    const symbols: { [key: string]: string } = {
      'Aries': '♈',
      'Taurus': '♉',
      'Gemini': '♊',
      'Cancer': '♋',
      'Leo': '♌',
      'Virgo': '♍',
      'Libra': '♎',
      'Scorpio': '♏',
      'Sagittarius': '♐',
      'Capricorn': '♑',
      'Aquarius': '♒',
      'Pisces': '♓',
    };
    return symbols[sign] || '♈';
  };

  return (
    <Animated.View style={[styles.container, animatedCardStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchable}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
          style={styles.card}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: getCompatibilityColor(compatibility),
                opacity: interpolate(glow.value, [0, 1], [0.1, 0.3]),
              },
              animatedGlowStyle,
            ]}
          />
          
          {/* Content */}
          <View style={styles.content}>
            {/* Zodiac Avatar */}
            <View style={styles.avatarContainer}>
              <Svg width={60} height={60} style={styles.avatar}>
                <Defs>
                  <SvgGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={getCompatibilityColor(compatibility)} stopOpacity="1" />
                    <Stop offset="100%" stopColor={getCompatibilityColor(compatibility)} stopOpacity="0.3" />
                  </SvgGradient>
                </Defs>
                <Circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="url(#avatarGradient)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="2"
                />
                <Text
                  x="30"
                  y="38"
                  fontSize="24"
                  fill="#fff"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {getZodiacSymbol(zodiacSign)}
                </Text>
              </Svg>
            </View>
            
            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.zodiacSign}>{zodiacSign}</Text>
              <View style={styles.compatibilityContainer}>
                <Text style={styles.compatibilityLabel}>Совместимость</Text>
                <View style={styles.compatibilityBar}>
                  <View
                    style={[
                      styles.compatibilityFill,
                      {
                        width: `${compatibility}%`,
                        backgroundColor: getCompatibilityColor(compatibility),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.compatibilityScore}>{compatibility}%</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  zodiacSign: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 10,
  },
  compatibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compatibilityLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
    marginRight: 10,
  },
  compatibilityBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  compatibilityFill: {
    height: '100%',
    borderRadius: 3,
  },
  compatibilityScore: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ConnectionCard;
