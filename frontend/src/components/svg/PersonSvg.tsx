// components/assets/PersonSvg.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PersonSvgProps {
  width?: number;
  height?: number;
  color?: string;
}

const PersonSvg: React.FC<PersonSvgProps> = ({
  width = 28,
  height = 28,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 14C17.3137 14 20 11.3137 20 8C20 4.68629 17.3137 2 14 2C10.6863 2 8 4.68629 8 8C8 11.3137 10.6863 14 14 14Z"
        stroke={color}
        strokeWidth="1.75"
      />
      <Path
        d="M6 26C6 21.5817 9.58172 18 14 18C18.4183 18 22 21.5817 22 26"
        stroke={color}
        strokeWidth="1.75"
      />
    </Svg>
  );
};

export default PersonSvg;
