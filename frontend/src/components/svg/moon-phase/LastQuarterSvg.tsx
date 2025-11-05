import React from 'react';
import LastQuarterSVG from '@assets/lunar/moon-phase/last-quarter.svg';

interface LastQuarterSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const LastQuarterSvg: React.FC<LastQuarterSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <LastQuarterSVG width={width} height={height} style={style} />;
};
