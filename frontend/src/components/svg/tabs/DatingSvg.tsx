import React from 'react';
import DatingSVG from '@assets/tabs/dating-icon.svg';

interface DatingSvgProps {
  size?: number;
  color?: any;
}

const DatingSvg: React.FC<DatingSvgProps> = ({ size = 32, color }) => {
  return <DatingSVG width={size} height={size} fill={color} />;
};

export default DatingSvg;
