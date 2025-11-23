import React from 'react';
import HoroscopeSVG from '@assets/tabs/horoscope-icon.svg';

interface HoroscopeSvgProps {
  size?: number;
  color?: any;
}

const HoroscopeSvg: React.FC<HoroscopeSvgProps> = ({
  size = 32,
  color = '#fff',
}) => {
  return <HoroscopeSVG width={size} height={size} fill={color} />;
};

export default HoroscopeSvg;
