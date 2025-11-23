import React from 'react';
import FirstQuarterSVG from '@assets/lunar/moon-phase/first-quarter.svg';

interface FirstQuarterSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const FirstQuarterSvg: React.FC<FirstQuarterSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <FirstQuarterSVG width={width} height={height} style={style} />;
};
