// components/assets/LocationSvg.tsx
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface LocationSvgProps {
  width?: number;
  height?: number;
  color?: string;
}

const LocationSvg: React.FC<LocationSvgProps> = ({
  width = 28,
  height = 28,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 2C9.58172 2 6 5.58172 6 10C6 16 14 26 14 26C14 26 22 16 22 10C22 5.58172 18.4183 2 14 2Z"
        stroke={color}
        strokeWidth="1.75"
      />
      <Circle cx="14" cy="10" r="3" stroke={color} strokeWidth="1.75" />
    </Svg>
  );
};

export default LocationSvg;
