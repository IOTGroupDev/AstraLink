// frontend/src/components/MoonPhaseVisual.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

// Импорт SVG компонентов
import { NewMoonSvg } from './svg/moon-phase/NewMoonSvg';
import { WaxingCrescentSvg } from './svg/moon-phase/WaxingCrescentSvg';
import { FirstQuarterSvg } from './svg/moon-phase/FirstQuarterSvg';
import { WaxingGibbousSvg } from './svg/moon-phase/WaxingGibbousSvg';
import { FullMoonSvg } from './svg/moon-phase/FullMoonSvg';
import { WaningGibbousSvg } from './svg/moon-phase/WaningGibbousSvg';
import { LastQuarterSvg } from './svg/moon-phase/LastQuarterSvg';
import { WaningCrescentSvg } from './svg/moon-phase/WaningCrescentSvg';

interface MoonPhaseVisualProps {
  phase: number; // 0-1 (0 = новолуние, 0.5 = полнолуние, 1 = новолуние)
  size?: number;
}

/**
 * Визуальное представление фазы Луны с использованием готовых SVG
 *
 * Фазы:
 * 0 - Новолуние
 * 1 - Молодая луна
 * 2 - Первая четверть
 * 3 - Прибывающая луна
 * 4 - Полнолуние
 * 5 - Убывающая луна
 * 6 - Последняя четверть
 * 7 - Старая луна
 */
export const MoonPhaseVisual: React.FC<MoonPhaseVisualProps> = ({
  phase,
  size = 80,
}) => {
  // Маппинг фазы (0-1) на индекс изображения (0-7)
  const getMoonPhaseIndex = (phase: number): number => {
    const normalizedPhase = phase % 1;
    const index = Math.round(normalizedPhase * 8) % 8;
    return index;
  };

  // Массив SVG компонентов
  const moonPhases = [
    NewMoonSvg, // 0 - Новолуние
    WaxingCrescentSvg, // 1 - Молодая луна
    FirstQuarterSvg, // 2 - Первая четверть
    WaxingGibbousSvg, // 3 - Прибывающая луна
    FullMoonSvg, // 4 - Полнолуние
    WaningGibbousSvg, // 5 - Убывающая луна
    LastQuarterSvg, // 6 - Последняя четверть
    WaningCrescentSvg, // 7 - Старая луна
  ];

  const phaseIndex = getMoonPhaseIndex(phase);
  const MoonPhaseComponent = moonPhases[phaseIndex];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <MoonPhaseComponent width={size} height={size} />
      {/* Свечение вокруг луны */}
      {/*<View style={[styles.glow, { width: size + 20, height: size + 20 }]} />*/}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  moonImage: {
    zIndex: 1,
  },
  glow: {
    position: 'absolute',
    borderRadius: 1000,
    // backgroundColor: 'rgba(192, 192, 192, 0.1)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
});
