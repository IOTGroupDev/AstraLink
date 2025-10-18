import React from 'react';
import ScorpiusSVG from '@assets/zodiac/scorpius.svg';

interface ScorpiusSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const ScorpiusSvg: React.FC<ScorpiusSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <ScorpiusSVG width={width} height={height} style={style} />;
};

export default ScorpiusSvg;
