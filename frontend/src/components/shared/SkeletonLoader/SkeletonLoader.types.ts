import { ViewStyle } from 'react-native';

export type SkeletonVariant = 'card' | 'text' | 'circle' | 'rect';

export interface SkeletonLoaderProps {
  /**
   * Ширина скелетона
   */
  width?: number | string;
  /**
   * Высота скелетона
   */
  height?: number;
  /**
   * Border radius
   */
  borderRadius?: number;
  /**
   * Custom style
   */
  style?: ViewStyle;
  /**
   * Тип скелетона (определяет размер и стиль)
   */
  variant?: SkeletonVariant;
}
