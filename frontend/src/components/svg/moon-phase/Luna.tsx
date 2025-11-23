import React from 'react';
import LunaSVG from '@assets/lunar/luna.svg';

interface LunaSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const LunaSvg: React.FC<LunaSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <LunaSVG width={width} height={height} style={style} />;
};
