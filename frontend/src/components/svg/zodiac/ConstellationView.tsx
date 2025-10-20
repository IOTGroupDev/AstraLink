// components/zodiac/ConstellationView.tsx
// Компонент для отображения созвездий знаков зодиака

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { ZodiacSignKey } from '../../../services/zodiac.service';

interface ConstellationViewProps {
  signKey: ZodiacSignKey;
  width?: number;
  height?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
}

interface Constellation {
  stars: Star[];
  lines: [number, number][];
}

// Координаты созвездий (viewBox: 215x333)
const CONSTELLATIONS: Record<ZodiacSignKey, Constellation> = {
  gemini: {
    stars: [
      { x: 107.5, y: 80, size: 3.5 },
      { x: 107.5, y: 130, size: 3 },
      { x: 80, y: 180, size: 2.5 },
      { x: 135, y: 180, size: 2.5 },
      { x: 60, y: 230, size: 3.5 },
      { x: 155, y: 230, size: 3.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ],
  },

  aries: {
    stars: [
      { x: 107.5, y: 90, size: 3.5 },
      { x: 85, y: 140, size: 3 },
      { x: 107.5, y: 190, size: 2.5 },
      { x: 95, y: 240, size: 3 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },

  taurus: {
    stars: [
      { x: 75, y: 100, size: 2.5 },
      { x: 140, y: 100, size: 2.5 },
      { x: 107.5, y: 150, size: 3.5 },
      { x: 85, y: 200, size: 3 },
      { x: 130, y: 200, size: 3 },
      { x: 107.5, y: 250, size: 2.5 },
    ],
    lines: [
      [0, 2],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ],
  },

  cancer: {
    stars: [
      { x: 65, y: 110, size: 3 },
      { x: 107.5, y: 145, size: 3.5 },
      { x: 150, y: 110, size: 3 },
      { x: 107.5, y: 195, size: 2.5 },
      { x: 85, y: 240, size: 2.5 },
      { x: 130, y: 240, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ],
  },

  leo: {
    stars: [
      { x: 107.5, y: 85, size: 3.5 },
      { x: 85, y: 125, size: 2.5 },
      { x: 130, y: 125, size: 2.5 },
      { x: 107.5, y: 165, size: 3 },
      { x: 80, y: 210, size: 2.5 },
      { x: 135, y: 210, size: 2.5 },
      { x: 107.5, y: 255, size: 3 },
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
  },

  virgo: {
    stars: [
      { x: 80, y: 100, size: 2.5 },
      { x: 107.5, y: 140, size: 3.5 },
      { x: 135, y: 100, size: 2.5 },
      { x: 107.5, y: 190, size: 3 },
      { x: 107.5, y: 240, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [2, 1],
      [1, 3],
      [3, 4],
    ],
  },

  libra: {
    stars: [
      { x: 107.5, y: 100, size: 3.5 },
      { x: 75, y: 160, size: 3 },
      { x: 140, y: 160, size: 3 },
      { x: 75, y: 220, size: 2.5 },
      { x: 140, y: 220, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [1, 2],
    ],
  },

  scorpio: {
    stars: [
      { x: 65, y: 100, size: 2.5 },
      { x: 90, y: 135, size: 3 },
      { x: 107.5, y: 175, size: 3.5 },
      { x: 125, y: 135, size: 3 },
      { x: 150, y: 100, size: 2.5 },
      { x: 135, y: 220, size: 2.5 },
      { x: 155, y: 260, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [5, 6],
    ],
  },

  sagittarius: {
    stars: [
      { x: 75, y: 110, size: 2.5 },
      { x: 107.5, y: 150, size: 3.5 },
      { x: 140, y: 190, size: 3 },
      { x: 95, y: 220, size: 2.5 },
      { x: 120, y: 220, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },

  capricorn: {
    stars: [
      { x: 85, y: 105, size: 3 },
      { x: 107.5, y: 145, size: 3.5 },
      { x: 130, y: 185, size: 3 },
      { x: 85, y: 215, size: 2.5 },
      { x: 130, y: 245, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
    ],
  },

  aquarius: {
    stars: [
      { x: 65, y: 115, size: 2.5 },
      { x: 90, y: 115, size: 2.5 },
      { x: 115, y: 115, size: 2.5 },
      { x: 140, y: 115, size: 2.5 },
      { x: 80, y: 175, size: 3 },
      { x: 107.5, y: 175, size: 3.5 },
      { x: 135, y: 175, size: 3 },
      { x: 107.5, y: 235, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [5, 7],
    ],
  },

  pisces: {
    stars: [
      { x: 65, y: 110, size: 3 },
      { x: 85, y: 150, size: 2.5 },
      { x: 107.5, y: 190, size: 3.5 },
      { x: 130, y: 150, size: 2.5 },
      { x: 150, y: 110, size: 3 },
      { x: 85, y: 240, size: 2.5 },
      { x: 130, y: 240, size: 2.5 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [2, 6],
    ],
  },
};

export const ConstellationView: React.FC<ConstellationViewProps> = ({
  signKey,
  width = 215,
  height = 333,
}) => {
  const constellation = CONSTELLATIONS[signKey];

  if (!constellation) return null;

  const { stars, lines } = constellation;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 215 333">
        <Defs>
          <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Линии */}
        {lines.map(([start, end], idx) => (
          <Line
            key={`line-${idx}`}
            x1={stars[start].x}
            y1={stars[start].y}
            x2={stars[end].x}
            y2={stars[end].y}
            stroke="#FFFFFF"
            strokeWidth={1.2}
            opacity={0.6}
            strokeLinecap="round"
          />
        ))}

        {/* Звёзды */}
        {stars.map((star, idx) => (
          <React.Fragment key={`star-${idx}`}>
            <Circle
              cx={star.x}
              cy={star.y}
              r={star.size * 2.5}
              fill="url(#starGlow)"
              opacity={0.5}
            />
            <Circle
              cx={star.x}
              cy={star.y}
              r={star.size}
              fill="#FFFFFF"
              opacity={0.95}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ConstellationView;
