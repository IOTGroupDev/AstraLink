// components/assets/ArrowBackSvg.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowBackSvgProps {
  width?: number;
  height?: number;
  color?: string;
}

const ArrowBackSvg: React.FC<ArrowBackSvgProps> = ({
  width = 36,
  height = 36,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 36 36" fill="none">
      <Path
        d="M22.5 9L13.5 18L22.5 27"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ArrowBackSvg;
