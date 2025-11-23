import React from 'react';
import CaseSVG from '@assets/lunar/case.svg';

interface CaseSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const CaseSvg: React.FC<CaseSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <CaseSVG width={width} height={height} style={style} />;
};
