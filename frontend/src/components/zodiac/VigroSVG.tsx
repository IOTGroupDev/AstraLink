import React from 'react';
import VirgoSVG from '@assets/zodiac/virgo.svg';

interface VirgoSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const VirgoSvg: React.FC<VirgoSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <VirgoSVG width={width} height={height} style={style} />;
};

export default VirgoSvg;
