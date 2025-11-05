import React from 'react';
import WaxingCrescentSVG from '@assets/lunar/moon-phase/waxing-crescent.svg';

interface WaxingCrescentSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const WaxingCrescentSvg: React.FC<WaxingCrescentSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <WaxingCrescentSVG width={width} height={height} style={style} />;
};
