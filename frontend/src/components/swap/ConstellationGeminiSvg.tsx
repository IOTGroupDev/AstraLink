// frontend/src/components/ConstellationGeminiSvg.tsx
// Упрощённое векторное созвездие Близнецов (в духе предоставленного SVG).
// Реализация на react-native-svg без внешних трансформеров/лоадеров.
// Масштабируется по width/height, имеет легкое свечение и градиентные линии.

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Line,
  Circle,
  G,
} from 'react-native-svg';

export interface ConstellationGeminiSvgProps {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
}

const DEFAULT_W = 200;
const DEFAULT_H = 312; // пропорционально макету (≈120x187 -> x1.66)

export default function ConstellationGeminiSvg({
  width = DEFAULT_W,
  height = DEFAULT_H,
  style,
  opacity = 0.95,
}: ConstellationGeminiSvgProps) {
  // Координаты в "нормализованной" системе 120x187 (как в исходном svg),
  // затем масштабируются под запрошенный width/height.
  const W = 120;
  const H = 187;

  // Ключевые "звезды" (примерно по макету)
  const stars = [
    { x: 59, y: 82 }, // центральная
    { x: 52, y: 69 }, // верхняя левая
    { x: 49, y: 92 }, // узел
    { x: 104, y: 169 }, // нижняя правая яркая
    { x: 17, y: 133 }, // нижняя левая
    { x: 52, y: 16 }, // верхняя
  ];

  // Соединительные линии (примерная топология)
  const lines: Array<[number, number, number, number]> = [
    [52, 16, 49, 92],
    [49, 92, 104, 169],
    [49, 92, 17, 133],
    [52, 69, 49, 92],
    [52, 69, 59, 82],
    [59, 82, 49, 92],
  ];

  // Размеры звезд (радиус) — чуть разные для выразительности
  const starR = [3.6, 2.8, 3.2, 4.0, 2.6, 3.0];

  // Масштабирующая функция
  const sx = (x: number) => (x / W) * width;
  const sy = (y: number) => (y / H) * height;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
      opacity={opacity}
    >
      <Defs>
        <SvgGradient id="geminiLine" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <Stop offset="50%" stopColor="#BFBFBF" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#707070" stopOpacity="0.3" />
        </SvgGradient>
        <SvgGradient id="geminiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
        </SvgGradient>
      </Defs>

      {/* Линии созвездия */}
      <G>
        {lines.map(([x1, y1, x2, y2], i) => (
          <Line
            key={`ln-${i}`}
            x1={sx(x1)}
            y1={sy(y1)}
            x2={sx(x2)}
            y2={sy(y2)}
            stroke="url(#geminiLine)"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
      </G>

      {/* Звезды: внутреннее ядро (яркая точка) */}
      <G>
        {stars.map((p, i) => (
          <Circle
            key={`core-${i}`}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={starR[i] * (width / W) * 0.6}
            fill="url(#geminiGlow)"
          />
        ))}
      </G>

      {/* Звезды: внешнее лёгкое свечение */}
      <G>
        {stars.map((p, i) => (
          <Circle
            key={`halo-${i}`}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={starR[i] * (width / W) * 1.8}
            fill="#FFFFFF"
            opacity={0.12}
          />
        ))}
      </G>
    </Svg>
  );
}
