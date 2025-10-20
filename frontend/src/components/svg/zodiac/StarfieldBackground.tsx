// components/zodiac/StarfieldBackground.tsx
// Оптимизированный фон со звёздами для экрана зодиака

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface StarfieldBackgroundProps {
  width: number;
  height: number;
  starCount?: number;
}

// Генерируем звёзды более случайно
const generateStars = (count: number, width: number, height: number) => {
  const stars = [];

  for (let i = 0; i < count; i++) {
    const seed1 = i * 7919 + 31337;
    const seed2 = i * 5381 + 12289;
    const seed3 = i * 2053 + 8191;

    const x = ((seed1 % 10000) / 10000) * width;
    const y = ((seed2 % 10000) / 10000) * height;

    // Разные размеры - больше маленьких звёзд
    const sizeRand = (seed3 % 100) / 100;
    const size = sizeRand < 0.8 ? 0.4 + sizeRand * 0.6 : 0.8 + sizeRand * 1.2;

    // Разная яркость
    const opacity = 0.12 + (seed1 % 75) / 100;

    stars.push({ x, y, size, opacity });
  }

  return stars;
};

export const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({
  width,
  height,
  starCount = 35,
}) => {
  const stars = useMemo(
    () => generateStars(starCount, width, height),
    [starCount, width, height]
  );

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Основной градиент: тёмно-синий → тёмно-фиолетовый → почти чёрный */}
      <LinearGradient
        colors={['#2a2149', '#1f1635', '#13101f', '#0a0810']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Розовато-коричневый оттенок справа (как на фото) */}
      <LinearGradient
        colors={[
          'rgba(86, 52, 78, 0.5)',
          'rgba(66, 42, 62, 0.35)',
          'rgba(46, 32, 48, 0.2)',
          'transparent',
        ]}
        locations={[0, 0.3, 0.6, 0.9]}
        start={{ x: 1, y: 0.25 }}
        end={{ x: 0, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Лёгкая синеватая вуаль слева сверху */}
      <LinearGradient
        colors={[
          'rgba(58, 78, 118, 0.25)',
          'rgba(48, 58, 88, 0.15)',
          'transparent',
        ]}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Мягкая фиолетовая дымка по центру */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(75, 45, 95, 0.12)',
          'rgba(65, 35, 85, 0.08)',
          'transparent',
        ]}
        locations={[0, 0.4, 0.55, 0.85]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Звёзды через SVG */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {stars.map((star, idx) => (
          <Circle
            key={idx}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="#FFFFFF"
            opacity={star.opacity}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default StarfieldBackground;
