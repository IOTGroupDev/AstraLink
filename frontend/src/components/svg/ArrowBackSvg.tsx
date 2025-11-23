// components/assets/ArrowBackSvg.tsx
import React from 'react';
import { SvgProps } from 'react-native-svg';
import ArrowBackSVG from '@assets/arrow-back.svg';

interface ArrowBackSvgProps extends SvgProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowBackSvg: React.FC<ArrowBackSvgProps> = ({
  width = 36,
  height = 36,
  color = '#FFFFFF',
}) => {
  return <ArrowBackSVG width={width} height={height} color={color} />;
};

export default ArrowBackSvg;
