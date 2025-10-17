import React from 'react';
import { SvgXml } from 'react-native-svg';

interface Onboarding1ArtProps {
  width?: number;
  height?: number;
  style?: any;
}

const ART_XML = `
<svg width="430" height="834" viewBox="0 0 430 834" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#F754E1" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#8F69FB" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="430" height="834" fill="url(#g)"/>
  <g opacity="0.7">
    <g opacity="0.6" fill="white">
      <circle cx="115" cy="131" r="1.6"/>
      <circle cx="41" cy="177" r="1.6"/>
      <circle cx="102" cy="178" r="1.6"/>
      <circle cx="193" cy="164" r="1.6"/>
      <circle cx="223" cy="181" r="1.6"/>
      <circle cx="191" cy="207" r="1.6"/>
      <circle cx="163" cy="194" r="1.6"/>
      <circle cx="147" cy="187" r="1.6"/>
      <circle cx="136" cy="214" r="1.6"/>
      <circle cx="111" cy="209" r="1.6"/>
      <circle cx="78" cy="231" r="1.6"/>
      <circle cx="85" cy="263" r="1.6"/>
      <circle cx="46" cy="234" r="1.6"/>
      <circle cx="85" cy="292" r="1.6"/>
      <circle cx="70" cy="309" r="1.6"/>
      <circle cx="25" cy="330" r="1.6"/>
      <circle cx="70" cy="368" r="1.6"/>
      <circle cx="53" cy="368" r="1.6"/>
      <circle cx="65" cy="402" r="1.6"/>
      <circle cx="87" cy="397" r="1.6"/>
      <circle cx="132" cy="451" r="1.6"/>
      <circle cx="96" cy="472" r="1.6"/>
      <circle cx="135" cy="481" r="1.6"/>
      <circle cx="38" cy="497" r="1.6"/>
      <circle cx="94" cy="547" r="1.6"/>
      <circle cx="211" cy="553" r="1.6"/>
      <circle cx="165" cy="518" r="1.6"/>
      <circle cx="218" cy="488" r="1.6"/>
      <circle cx="229" cy="495" r="1.6"/>
      <circle cx="253" cy="514" r="1.6"/>
      <circle cx="38" cy="281" r="1.6"/>
      <circle cx="378" cy="545" r="1.6"/>
      <circle cx="336" cy="530" r="1.6"/>
      <circle cx="336" cy="491" r="1.6"/>
      <circle cx="305" cy="501" r="1.6"/>
      <circle cx="297" cy="467" r="1.6"/>
      <circle cx="376" cy="452" r="1.6"/>
      <circle cx="365" cy="417" r="1.6"/>
      <circle cx="339" cy="413" r="1.6"/>
      <circle cx="385" cy="412" r="1.6"/>
      <circle cx="376" cy="384" r="1.6"/>
      <circle cx="372" cy="372" r="1.6"/>
      <circle cx="351" cy="367" r="1.6"/>
      <circle cx="344" cy="332" r="1.6"/>
      <circle cx="385" cy="344" r="1.6"/>
      <circle cx="392" cy="314" r="1.6"/>
      <circle cx="351" cy="293" r="1.6"/>
      <circle cx="365" cy="299" r="1.6"/>
      <circle cx="336" cy="268" r="1.6"/>
      <circle cx="356" cy="264" r="1.6"/>
      <circle cx="389" cy="260" r="1.6"/>
      <circle cx="360" cy="239" r="1.6"/>
      <circle cx="344" cy="235" r="1.6"/>
      <circle cx="324" cy="248" r="1.6"/>
      <circle cx="310" cy="222" r="1.6"/>
      <circle cx="278" cy="207" r="1.6"/>
      <circle cx="256" cy="210" r="1.6"/>
      <circle cx="273" cy="191" r="1.6"/>
      <circle cx="291" cy="160" r="1.6"/>
      <circle cx="335" cy="177" r="1.6"/>
      <circle cx="372" cy="191" r="1.6"/>
      <circle cx="381" cy="124" r="1.6"/>
      <circle cx="405" cy="218" r="1.6"/>
      <circle cx="311" cy="129" r="1.6"/>
      <circle cx="224" cy="122" r="1.6"/>
      <circle cx="162" cy="131" r="1.6"/>
    </g>
    <g opacity="0.3" fill="none" stroke="white" stroke-linecap="round" stroke-dasharray="2.5 2.5">
      <circle cx="215" cy="340" r="158"/>
      <circle opacity="0.7" cx="215" cy="340" r="191"/>
      <circle opacity="0.5" cx="215" cy="340" r="224"/>
    </g>
  </g>
</svg>
`;

export const Onboarding1Art: React.FC<Onboarding1ArtProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <SvgXml xml={ART_XML} width={width} height={height} style={style} />;
};

export default Onboarding1Art;
