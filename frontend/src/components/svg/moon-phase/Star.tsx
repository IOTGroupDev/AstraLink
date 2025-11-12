import React from 'react';
import StarSVG from '@assets/lunar/star.svg';

interface StarSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const StarSvg: React.FC<StarSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <StarSVG width={width} height={height} style={style} />;
};
