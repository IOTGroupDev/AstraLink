import React from 'react';
import LogoBlurSVG from '@assets/logo_blur.svg';

interface LogoBlurSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

const LogoBlurSvg: React.FC<LogoBlurSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <LogoBlurSVG width={width} height={height} style={style} />;
};

export default LogoBlurSvg;
