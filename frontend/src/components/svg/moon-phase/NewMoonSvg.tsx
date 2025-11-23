import React from 'react';
import NewMoonSVG from '@assets/lunar/moon-phase/new-moon.svg';

interface NewMoonSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const NewMoonSvg: React.FC<NewMoonSvgProps> = ({
  width = 280,
  height = 280,
  style,
}) => {
  return <NewMoonSVG width={width} height={height} style={style} />;
};
