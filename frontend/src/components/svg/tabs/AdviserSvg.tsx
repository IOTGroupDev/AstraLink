import React from 'react';
import AdviserSVG from '@assets/tabs/adviser-icon.svg';

interface AdviserSvgProps {
  size?: number;
  color?: any;
}

const AdviserSvg: React.FC<AdviserSvgProps> = ({
  size = 32,
  color = 'fff',
}) => {
  return <AdviserSVG width={size} height={size} fill={color} />;
};

export default AdviserSvg;
