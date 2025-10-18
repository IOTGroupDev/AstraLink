// components/zodiac/zodiacSvgMap.tsx
// Маппинг знаков зодиака на SVG компоненты

import React from 'react';
import { ZodiacSignKey } from '../../services/zodiac.service';

// Импорты SVG компонентов (предполагается, что они все созданы аналогично AriesSVG)
import AriesSVG from '@assets/zodiac/aries.svg';
import TaurusSVG from '@assets/zodiac/taurus.svg';
import GeminiSVG from '@assets/zodiac/gemini.svg';
import CancerSVG from '@assets/zodiac/cancer.svg';
import LeoSVG from '@assets/zodiac/leo.svg';
import VirgoSVG from '@assets/zodiac/virgo.svg';
import LibraSVG from '@assets/zodiac/libra.svg';
import ScorpiusSVG from '@assets/zodiac/scorpius.svg';
import SagittariusSVG from '@assets/zodiac/sagittarius.svg';
import CapricornSVG from '@assets/zodiac/capricorn.svg';
import AquariusSVG from '@assets/zodiac/aquarius.svg';
import PiscesSVG from '@assets/zodiac/pisces.svg';

interface ZodiacSvgProps {
  width?: number;
  height?: number;
  style?: any;
  opacity?: number;
}

// Маппинг знаков на SVG компоненты
const zodiacSvgComponents: Record<
  ZodiacSignKey,
  React.ComponentType<{ width: number; height: number; style?: any }>
> = {
  aries: AriesSVG,
  taurus: TaurusSVG,
  gemini: GeminiSVG,
  cancer: CancerSVG,
  leo: LeoSVG,
  virgo: VirgoSVG,
  libra: LibraSVG,
  scorpio: ScorpiusSVG,
  sagittarius: SagittariusSVG,
  capricorn: CapricornSVG,
  aquarius: AquariusSVG,
  pisces: PiscesSVG,
};

// Универсальный компонент для рендеринга созвездия
export const ZodiacConstellationSvg: React.FC<
  ZodiacSvgProps & { signKey: ZodiacSignKey }
> = ({ signKey, width = 430, height = 500, style, opacity = 0.95 }) => {
  const SvgComponent = zodiacSvgComponents[signKey];

  if (!SvgComponent) {
    return null;
  }

  return (
    <SvgComponent width={width} height={height} style={[style, { opacity }]} />
  );
};

export default ZodiacConstellationSvg;
