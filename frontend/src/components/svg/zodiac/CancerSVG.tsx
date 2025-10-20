import React from 'react';
import CancerSVG from '@/assets/zodiac/cancer.svg';

interface CancerSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const CancerSvg: React.FC<CancerSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <CancerSVG width={width} height={height} style={style} />;
};

export default CancerSvg;
