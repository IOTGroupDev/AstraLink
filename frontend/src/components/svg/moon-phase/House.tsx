import React from 'react';
import HouseSVG from '@assets/lunar/house.svg';

interface HouseSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const HouseSvg: React.FC<HouseSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <HouseSVG width={width} height={height} style={style} />;
};
