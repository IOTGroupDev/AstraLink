import type { GradientBorderColors } from './GradientBorderView';

export const DATING_GLASS_BORDER_COLORS: GradientBorderColors = [
  'rgba(255,255,255,0.42)',
  'rgba(124,119,153,0.32)',
];

export const DATING_GLASS_BORDER_GRADIENT = {
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
