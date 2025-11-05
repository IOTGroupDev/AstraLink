import React from 'react';
import WaxingGibbousSVG from '@assets/lunar/moon-phase/waxing-gibbous.svg';

interface WaxingGibbousSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const WaxingGibbousSvg: React.FC<WaxingGibbousSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <WaxingGibbousSVG width={width} height={height} style={style} />;
};
