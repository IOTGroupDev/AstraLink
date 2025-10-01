// frontend/src/components/MoonPhaseVisual.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

interface MoonPhaseVisualProps {
  phase: number; // 0-1 (0 = новолуние, 0.5 = полнолуние, 1 = новолуние)
  size?: number;
}

/**
 * Визуальное представление фазы Луны
 *
 * Фазы:
 * 0.00 - Новолуние (темная луна)
 * 0.25 - Первая четверть (правая половина освещена)
 * 0.50 - Полнолуние (вся луна освещена)
 * 0.75 - Последняя четверть (левая половина освещена)
 * 1.00 - Новолуние
 */
export const MoonPhaseVisual: React.FC<MoonPhaseVisualProps> = ({
  phase,
  size = 80,
}) => {
  const radius = size / 2;
  const center = radius;

  // Нормализуем фазу к диапазону 0-1
  const normalizedPhase = phase % 1;

  // Определяем, растущая или убывающая луна
  const isWaxing = normalizedPhase < 0.5;
  const phaseAngle = normalizedPhase * 2; // 0-2

  /**
   * Рисуем фазу луны с помощью эллипса
   * Эллипс меняет ширину в зависимости от фазы
   */
  const getShadowWidth = () => {
    if (normalizedPhase < 0.5) {
      // Растущая луна (0 -> 0.5)
      // Тень справа уменьшается
      return radius * 2 * (1 - phaseAngle);
    } else {
      // Убывающая луна (0.5 -> 1)
      // Тень слева увеличивается
      return radius * 2 * (phaseAngle - 1);
    }
  };

  const shadowWidth = getShadowWidth();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Градиент для освещенной части */}
          <RadialGradient
            id="moonGradient"
            cx="50%"
            cy="50%"
            r="50%"
            fx="40%"
            fy="40%"
          >
            <Stop offset="0%" stopColor="#F5F5F5" stopOpacity="1" />
            <Stop offset="70%" stopColor="#E0E0E0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#C0C0C0" stopOpacity="1" />
          </RadialGradient>

          {/* Градиент для тени */}
          <RadialGradient id="shadowGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.95" />
            <Stop offset="70%" stopColor="#16213e" stopOpacity="0.98" />
            <Stop offset="100%" stopColor="#0f0f1e" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* Фон луны (освещенная часть) */}
        <Circle cx={center} cy={center} r={radius} fill="url(#moonGradient)" />

        {/* Тень (неосвещенная часть) */}
        {normalizedPhase > 0.02 && normalizedPhase < 0.98 && (
          <Ellipse
            cx={
              isWaxing
                ? center + radius - shadowWidth / 2
                : center - radius + shadowWidth / 2
            }
            cy={center}
            rx={shadowWidth / 2}
            ry={radius}
            fill="url(#shadowGradient)"
          />
        )}

        {/* Полное новолуние (темная луна) */}
        {(normalizedPhase <= 0.02 || normalizedPhase >= 0.98) && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="url(#shadowGradient)"
          />
        )}

        {/* Кратеры для реалистичности (опционально) */}
        {normalizedPhase >= 0.1 && normalizedPhase <= 0.9 && (
          <>
            <Circle
              cx={center - 10}
              cy={center - 15}
              r={3}
              fill="#B0B0B0"
              opacity={0.3}
            />
            <Circle
              cx={center + 15}
              cy={center - 5}
              r={2}
              fill="#B0B0B0"
              opacity={0.3}
            />
            <Circle
              cx={center + 5}
              cy={center + 20}
              r={2.5}
              fill="#B0B0B0"
              opacity={0.3}
            />
            <Circle
              cx={center - 20}
              cy={center + 10}
              r={1.5}
              fill="#B0B0B0"
              opacity={0.3}
            />
          </>
        )}

        {/* Внешний контур */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(192, 192, 192, 0.2)"
          strokeWidth={1}
        />
      </Svg>

      {/* Свечение вокруг луны */}
      <View style={[styles.glow, { width: size + 20, height: size + 20 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
});
