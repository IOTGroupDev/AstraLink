import React from 'react';
import FullMoonSVG from '@assets/lunar/moon-phase/full-moon.svg';

interface FullMoonSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const FullMoonSvg: React.FC<FullMoonSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <FullMoonSVG width={width} height={height} style={style} />;
};
