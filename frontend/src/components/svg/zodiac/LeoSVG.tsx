import React from 'react';
import LeoSVG from '@assets/zodiac/leo.svg';

interface LeoSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const LeoSvg: React.FC<LeoSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <LeoSVG width={width} height={height} style={style} />;
};

export default LeoSvg;
