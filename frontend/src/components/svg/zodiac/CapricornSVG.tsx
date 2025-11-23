import React from 'react';
import CapricornSVG from '@assets/zodiac/capricorn.svg';

interface CapricornSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const CapricornSvg: React.FC<CapricornSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <CapricornSVG width={width} height={height} style={style} />;
};

export default CapricornSvg;
