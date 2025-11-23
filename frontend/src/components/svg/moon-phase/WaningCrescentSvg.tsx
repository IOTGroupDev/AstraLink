import React from 'react';
import WaningCrescentSVG from '@assets/lunar/moon-phase/waning-crescent.svg';

interface WaningCrescentSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const WaningCrescentSvg: React.FC<WaningCrescentSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <WaningCrescentSVG width={width} height={height} style={style} />;
};
