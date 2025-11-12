import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

type PlanetKey =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

interface PlanetIconProps {
  name?: string; // может быть RU/EN/разный регистр
  size?: number; // px
}

/**
 * Нормализация имени планеты к ключу PlanetKey
 * Принимает: RU (Солнце), EN (Sun), разный регистр (sun/SUN), а так же уже нормализованный ключ
 */
const normalizePlanetName = (raw?: string): PlanetKey => {
  if (!raw) return 'sun';
  const n = raw.trim().toLowerCase();

  switch (n) {
    // RU
    case 'солнце':
      return 'sun';
    case 'луна':
      return 'moon';
    case 'меркурий':
      return 'mercury';
    case 'венера':
      return 'venus';
    case 'марс':
      return 'mars';
    case 'юпитер':
      return 'jupiter';
    case 'сатурн':
      return 'saturn';
    case 'уран':
      return 'uranus';
    case 'нептун':
      return 'neptune';
    case 'плутон':
      return 'pluto';

    // EN
    case 'sun':
      return 'sun';
    case 'moon':
      return 'moon';
    case 'mercury':
      return 'mercury';
    case 'venus':
      return 'venus';
    case 'mars':
      return 'mars';
    case 'jupiter':
      return 'jupiter';
    case 'saturn':
      return 'saturn';
    case 'uranus':
      return 'uranus';
    case 'neptune':
      return 'neptune';
    case 'pluto':
      return 'pluto';

    default:
      // Попытка вытащить из строки вида "Солнце - трин - Луна" последний/первый токен
      // Если не удастся — дефолт к Sun
      try {
        const tokens = n.split(/[\s\-–—]+/).filter(Boolean);
        if (tokens.length > 0) {
          return normalizePlanetName(tokens[tokens.length - 1]);
        }
      } catch {
        // ignore
      }
      return 'sun';
  }
};

// Юникод-глифы астрономических символов планет (SVG-текст)
const GLYPHS: Record<PlanetKey, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
};

// Цвета в стилистике проекта (можно скорректировать по теме)
const COLORS: Record<PlanetKey, string> = {
  sun: '#FFD700',
  moon: '#C0C0C0',
  mercury: '#FFA500',
  venus: '#FF69B4',
  mars: '#FF4D4D',
  jupiter: '#9B59B6',
  saturn: '#8B6C42',
  uranus: '#10B5B5',
  neptune: '#4169E1',
  pluto: '#8B0000',
};

const PlanetIcon: React.FC<PlanetIconProps> = ({ name, size = 62 }) => {
  const key = normalizePlanetName(name);
  const glyph = GLYPHS[key];
  const color = COLORS[key];

  const center = size / 2;
  const radius = Math.max(1, center - 3); // учитываем обводку

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="planetBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.75} />
        </LinearGradient>
      </Defs>

      {/* Фон-круг с лёгкой обводкой в стиле виджета */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="url(#planetBg)"
        stroke="#FFFFFF"
        strokeWidth={3}
      />

      {/* Символ планеты */}
      <SvgText
        x={center}
        y={center + Math.round(size * 0.04)} // небольшая оптическая компенсация по вертикали
        fontSize={Math.round(size * 0.45)}
        fontWeight="700"
        fill="#FFFFFF"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {glyph}
      </SvgText>
    </Svg>
  );
};

export default PlanetIcon;
