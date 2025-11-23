import React from 'react';
import WaningGibbousSVG from '@assets/lunar/moon-phase/waning-gibbous.svg';

interface WaningGibbousSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const WaningGibbousSvg: React.FC<WaningGibbousSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <WaningGibbousSVG width={width} height={height} style={style} />;
};
