import React from 'react';
import SagittariusSVG from '@assets/zodiac/sagittarius.svg';

interface SagittariusSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

export const SagittariusSvg: React.FC<SagittariusSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <SagittariusSVG width={width} height={height} style={style} />;
};

export default SagittariusSvg;
