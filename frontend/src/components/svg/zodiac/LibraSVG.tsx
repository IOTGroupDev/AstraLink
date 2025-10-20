import React from 'react';
import LibraSVG from '@assets/zodiac/libra.svg';

interface LibraSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const LibraSvg: React.FC<LibraSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <LibraSVG width={width} height={height} style={style} />;
};

export default LibraSvg;
