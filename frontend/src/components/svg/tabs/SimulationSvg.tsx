import React from 'react';
import SimulationSVG from '@assets/tabs/simulation-icon.svg';

interface SimulationSvgProps {
  size?: number;
  color?: any;
}

const SimulationSvg: React.FC<SimulationSvgProps> = ({
  size = 32,
  color = 'fff',
}) => {
  return <SimulationSVG width={size} height={size} fill={color} />;
};

export default SimulationSvg;
