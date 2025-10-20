// components/assets/CheckboxSvg.tsx
import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

interface CheckboxSvgProps {
  width?: number;
  height?: number;
  checked?: boolean;
  color?: string;
}

const CheckboxSvg: React.FC<CheckboxSvgProps> = ({
  width = 20,
  height = 20,
  checked = false,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
      <Rect
        x="2.5"
        y="2.5"
        width="15"
        height="15"
        stroke={color}
        strokeWidth="1.25"
      />
      {checked && (
        <Path
          d="M6.25 10L8.75 12.5L13.75 7.5"
          stroke={color}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
};

export default CheckboxSvg;
