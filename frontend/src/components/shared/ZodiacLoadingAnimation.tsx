// src/components/shared/ZodiacLoadingAnimation.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AriesSVG from '../svg/zodiac/AriesSVG';
import TaurusSVG from '../svg/zodiac/TaurusSVG';
import GeminiSVG from '../svg/zodiac/GeminiSVG';
import CancerSVG from '../svg/zodiac/CancerSVG';
import LeoSVG from '../svg/zodiac/LeoSVG';
import VigroSVG from '../svg/zodiac/VigroSVG';
import LibraSVG from '../svg/zodiac/LibraSVG';
import ScorpiusSVG from '../svg/zodiac/ScorpiusSVG';
import SagittariusSVG from '../svg/zodiac/SagittariusSVG';
import CapricornSVG from '../svg/zodiac/CapricornSVG';
import AquariusSVG from '../svg/zodiac/AquariusSVG';
import PiscesSVG from '../svg/zodiac/PiscesSVG';

const { width, height } = Dimensions.get('window');
const CIRCLE_RADIUS = Math.min(width, height) * 0.35;
const ICON_SIZE = 32;

const zodiacSigns = [
  { Component: AriesSVG, name: 'aries' },
  { Component: TaurusSVG, name: 'taurus' },
  { Component: GeminiSVG, name: 'gemini' },
  { Component: CancerSVG, name: 'cancer' },
  { Component: LeoSVG, name: 'leo' },
  { Component: VigroSVG, name: 'virgo' },
  { Component: LibraSVG, name: 'libra' },
  { Component: ScorpiusSVG, name: 'scorpio' },
  { Component: SagittariusSVG, name: 'sagittarius' },
  { Component: CapricornSVG, name: 'capricorn' },
  { Component: AquariusSVG, name: 'aquarius' },
  { Component: PiscesSVG, name: 'pisces' },
];

const ZodiacLoadingAnimation: React.FC = () => {
  const rotation = useSharedValue(0);
  const centerScale = useSharedValue(1);
  const centerOpacity = useSharedValue(0.8);

  useEffect(() => {
    // Плавное вращение круга со знаками зодиака
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Пульсация центрального элемента
    centerScale.value = withRepeat(
      withSequence(
        withTiming(1.2, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    centerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.6, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, []);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedCenterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
    opacity: centerOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Мерцающие звезды на фоне */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Star key={i} index={i} />
      ))}

      {/* Вращающийся круг со знаками зодиака */}
      <Animated.View style={[styles.zodiacCircle, animatedCircleStyle]}>
        {zodiacSigns.map((sign, index) => {
          const angle = (index * 360) / zodiacSigns.length;
          const radian = (angle * Math.PI) / 180;
          const x = CIRCLE_RADIUS * Math.cos(radian);
          const y = CIRCLE_RADIUS * Math.sin(radian);

          return (
            <ZodiacIcon
              key={sign.name}
              Component={sign.Component}
              x={x}
              y={y}
              angle={angle}
              index={index}
            />
          );
        })}
      </Animated.View>

      {/* Центральный пульсирующий элемент */}
      <Animated.View style={[styles.centerElement, animatedCenterStyle]}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
          style={styles.centerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.centerInner} />
        </LinearGradient>
      </Animated.View>

      {/* Внешнее кольцо */}
      <View style={styles.outerRing} />
    </View>
  );
};

// Компонент отдельной иконки зодиака
interface ZodiacIconProps {
  Component: React.ComponentType<any>;
  x: number;
  y: number;
  angle: number;
  index: number;
}

const ZodiacIcon: React.FC<ZodiacIconProps> = ({
  Component,
  x,
  y,
  angle,
  index,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Последовательное появление иконок
    setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      scale.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
      });
    }, index * 100);

    // Пульсация каждой иконки
    setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, {
            duration: 1000 + index * 100,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 1000 + index * 100,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    }, 1000 + index * 100);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: y },
      { scale: scale.value },
      { rotate: `${-angle}deg` }, // Компенсируем вращение круга
    ],
  }));

  return (
    <Animated.View style={[styles.zodiacIcon, animatedStyle]}>
      <Component width={ICON_SIZE} height={ICON_SIZE} />
    </Animated.View>
  );
};

// Компонент мерцающей звезды
interface StarProps {
  index: number;
}

const Star: React.FC<StarProps> = ({ index }) => {
  const opacity = useSharedValue(Math.random() * 0.5 + 0.3);
  const scale = useSharedValue(1);

  const x = Math.random() * width;
  const y = Math.random() * height;
  const size = Math.random() * 2 + 1;
  const duration = Math.random() * 2000 + 1500;

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, {
          duration: duration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.8, {
          duration: duration,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, {
          duration: duration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: duration,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zodiacCircle: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zodiacIcon: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerElement: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  centerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  outerRing: {
    position: 'absolute',
    width: CIRCLE_RADIUS * 2 + 40,
    height: CIRCLE_RADIUS * 2 + 40,
    borderRadius: CIRCLE_RADIUS + 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 50,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default ZodiacLoadingAnimation;
