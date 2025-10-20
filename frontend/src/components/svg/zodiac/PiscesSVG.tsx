import React from 'react';
import PiscesSVG from '@assets/zodiac/pisces.svg';

interface PiscesSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const PiscesSvg: React.FC<PiscesSvgProps> = ({
  width = 430,
  height = 333,
  style,
}) => {
  return <PiscesSVG width={width} height={height} style={style} />;
};

export default PiscesSvg;
