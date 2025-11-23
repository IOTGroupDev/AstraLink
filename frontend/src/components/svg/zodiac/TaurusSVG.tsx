import React from 'react';
import TaurusSVG from '@assets/zodiac/taurus.svg';

interface TaurusSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const TaurusSvg: React.FC<TaurusSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <TaurusSVG width={width} height={height} style={style} />;
};

export default TaurusSvg;
