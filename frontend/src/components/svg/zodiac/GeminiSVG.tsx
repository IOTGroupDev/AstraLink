import React from 'react';
import GeminiSVG from '@assets/zodiac/gemini.svg';

interface GeminiSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const GeminiSvg: React.FC<GeminiSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <GeminiSVG width={width} height={height} style={style} />;
};

export default GeminiSvg;
