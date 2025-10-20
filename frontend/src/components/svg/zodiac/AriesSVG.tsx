import React from 'react';
import AriesSVG from '@assets/zodiac/aries.svg';

interface AriesSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const AriesSvg: React.FC<AriesSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <AriesSVG width={width} height={height} style={style} />;
};

export default AriesSvg;
