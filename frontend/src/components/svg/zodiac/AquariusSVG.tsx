import React from 'react';
import AquariusSVG from '@assets/zodiac/aquarius.svg';

interface AquariusSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const AquariusSvg: React.FC<AquariusSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <AquariusSVG width={width} height={height} style={style} />;
};

export default AquariusSvg;
