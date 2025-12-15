import React from 'react';
import { SvgXml } from 'react-native-svg';

interface OnboardingFirstBackgroundSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

// Background SVG without text badges - only stars, circles, and center star
const BACKGROUND_SVG = `<svg width="430" height="834" viewBox="0 0 430 834" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.25" filter="url(#filter0_f_52_1118)">
        <g clip-path="url(#paint0_angular_52_1118_clip_path)"><g transform="matrix(0.229341 0.0283381 -0.0283381 0.229341 215 340)"><foreignObject x="-1116.21" y="-1116.21" width="2232.41" height="2232.41"><div xmlns="http://www.w3.org/1999/xhtml" style="background:conic-gradient(from 90deg,rgba(247, 84, 225, 1) 0deg,rgba(143, 105, 251, 1) 110.469deg,rgba(247, 84, 225, 1) 360deg);height:100%;width:100%;opacity:1"></div></foreignObject></g></g><circle cx="215" cy="340" r="230"/>
    </g>
    <g opacity="0.7">
        <g opacity="0.6">
            <circle cx="114.816" cy="130.759" r="1.64756" fill="white"/>
            <circle cx="41.005" cy="176.891" r="1.64756" fill="white"/>
            <circle cx="101.636" cy="178.209" r="1.64756" fill="white"/>
            <circle cx="192.581" cy="163.711" r="1.64756" fill="white"/>
            <circle cx="199.171" cy="172.937" r="1.64756" fill="white"/>
            <circle cx="222.896" cy="180.845" r="1.64756" fill="white"/>
            <circle cx="191.263" cy="207.206" r="1.64756" fill="white"/>
            <circle cx="162.266" cy="194.026" r="1.64756" fill="white"/>
            <circle cx="146.449" cy="187.436" r="1.64756" fill="white"/>
            <circle cx="135.905" cy="213.797" r="1.64756" fill="white"/>
            <circle cx="110.862" cy="208.525" r="1.64756" fill="white"/>
            <circle cx="77.9105" cy="230.931" r="1.64756" fill="white"/>
            <circle cx="98.9991" cy="244.112" r="1.64756" fill="white"/>
            <circle cx="84.5008" cy="262.565" r="1.64756" fill="white"/>
            <circle cx="46.2774" cy="233.567" r="1.64756" fill="white"/>
            <circle cx="84.5008" cy="291.562" r="1.64756" fill="white"/>
            <circle cx="70.0021" cy="308.696" r="1.64756" fill="white"/>
            <circle cx="25.1883" cy="329.785" r="1.64756" fill="white"/>
            <circle cx="70.0021" cy="368.009" r="1.64756" fill="white"/>
            <circle cx="52.8678" cy="368.009" r="1.64756" fill="white"/>
            <circle cx="64.7301" cy="402.278" r="1.64756" fill="white"/>
            <circle cx="87.1368" cy="397.006" r="1.64756" fill="white"/>
            <circle cx="131.951" cy="451.046" r="1.64756" fill="white"/>
            <circle cx="96.3631" cy="472.135" r="1.64756" fill="white"/>
            <circle cx="134.587" cy="481.361" r="1.64756" fill="white"/>
            <circle cx="38.369" cy="497.178" r="1.64756" fill="white"/>
            <circle cx="93.7272" cy="547.264" r="1.64756" fill="white"/>
            <circle cx="211.034" cy="552.536" r="1.64756" fill="white"/>
            <circle cx="164.902" cy="518.266" r="1.64756" fill="white"/>
            <circle cx="217.624" cy="487.951" r="1.64756" fill="white"/>
            <circle cx="229.487" cy="494.542" r="1.64756" fill="white"/>
            <circle cx="253.212" cy="514.312" r="1.64756" fill="white"/>
            <circle cx="38.369" cy="281.017" r="1.64756" fill="white"/>
            <circle cx="378.427" cy="544.628" r="1.64756" fill="white"/>
            <circle cx="336.249" cy="530.129" r="1.64756" fill="white"/>
            <circle cx="336.249" cy="490.587" r="1.64756" fill="white"/>
            <circle cx="304.616" cy="501.132" r="1.64756" fill="white"/>
            <circle cx="296.707" cy="466.862" r="1.64756" fill="white"/>
            <circle cx="375.79" cy="452.364" r="1.64756" fill="white"/>
            <circle cx="365.246" cy="416.776" r="1.64756" fill="white"/>
            <circle cx="338.885" cy="412.822" r="1.64756" fill="white"/>
            <circle cx="385.017" cy="411.504" r="1.64756" fill="white"/>
            <circle cx="375.79" cy="383.825" r="1.64756" fill="white"/>
            <circle cx="371.836" cy="371.963" r="1.64756" fill="white"/>
            <circle cx="350.747" cy="366.691" r="1.64756" fill="white"/>
            <circle cx="344.157" cy="332.421" r="1.64756" fill="white"/>
            <circle cx="385.017" cy="344.284" r="1.64756" fill="white"/>
            <circle cx="391.607" cy="313.968" r="1.64756" fill="white"/>
            <circle cx="350.747" cy="292.879" r="1.64756" fill="white"/>
            <circle cx="365.246" cy="299.47" r="1.64756" fill="white"/>
            <circle cx="336.249" cy="267.837" r="1.64756" fill="white"/>
            <circle cx="356.02" cy="263.882" r="1.64756" fill="white"/>
            <circle cx="388.971" cy="259.928" r="1.64756" fill="white"/>
            <circle cx="359.973" cy="238.839" r="1.64756" fill="white"/>
            <circle cx="344.157" cy="234.885" r="1.64756" fill="white"/>
            <circle cx="324.386" cy="248.066" r="1.64756" fill="white"/>
            <circle cx="309.888" cy="221.705" r="1.64756" fill="white"/>
            <circle cx="278.254" cy="207.206" r="1.64756" fill="white"/>
            <circle cx="255.848" cy="209.842" r="1.64756" fill="white"/>
            <circle cx="272.982" cy="191.39" r="1.64756" fill="white"/>
            <circle cx="291.435" cy="159.756" r="1.64756" fill="white"/>
            <circle cx="334.931" cy="176.891" r="1.64756" fill="white"/>
            <circle cx="371.836" cy="191.39" r="1.64756" fill="white"/>
            <circle cx="381.063" cy="124.169" r="1.64756" fill="white"/>
            <circle cx="404.787" cy="217.751" r="1.64756" fill="white"/>
            <circle cx="311.205" cy="129.441" r="1.64756" fill="white"/>
            <circle cx="224.214" cy="121.533" r="1.64756" fill="white"/>
            <circle cx="162.266" cy="130.759" r="1.64756" fill="white"/>
        </g>
        <g opacity="0.3">
            <circle cx="214.659" cy="340" r="158.166" stroke="white" stroke-linecap="round" stroke-dasharray="2.5 2.5"/>
            <circle opacity="0.7" cx="214.658" cy="340" r="191.117" stroke="white" stroke-linecap="round" stroke-dasharray="2.5 2.5"/>
            <circle opacity="0.5" cx="214.659" cy="340" r="224.069" stroke="white" stroke-linecap="round" stroke-dasharray="2.5 2.5"/>
        </g>
    </g>
    <g opacity="0.5" filter="url(#filter1_f_52_1118)">
        <path d="M215.99 243.075C223.308 243.742 236.306 289.919 238.372 297.584C242.76 313.445 246.213 329.626 248.707 346.014C249.621 352.206 250.286 358.285 250.63 364.559C250.705 365.929 250.734 367.293 250.746 368.656C250.757 369.824 248.821 370.305 248.237 369.293C247.86 368.639 247.466 367.946 247.056 367.177C243.13 359.601 237.332 344.503 229.139 342.629C224.684 341.61 212.778 353.513 209.32 356.944C203.093 363.238 197.161 369.903 191.549 376.912C187.896 381.536 184.415 386.493 180.79 391.222C180.169 392.033 178.896 391.574 178.927 390.553C179.983 355.32 185.421 320.431 195.081 286.937C197.667 278.168 207.933 246.107 215.669 243.124C215.775 243.083 215.877 243.065 215.99 243.075ZM215.798 258.295C215.781 258.009 215.442 257.868 215.228 258.057C215.153 258.123 215.11 258.219 215.11 258.318C215.144 265.965 214.482 273.297 214.271 280.884C213.956 292.14 213.179 303.526 212.906 314.758C212.899 315.07 212.645 315.321 212.332 315.324C210.25 315.342 208.168 315.338 206.086 315.313C205.517 315.307 205.253 316.069 205.692 316.431C207.46 317.886 209.595 319.856 211.105 321.209C211.297 321.38 211.352 321.655 211.253 321.892C210.548 323.578 209.729 326.547 209.109 328.817C208.961 329.361 209.601 329.781 210.04 329.427C211.794 328.013 213.469 326.635 215.189 325.092C215.408 324.896 215.739 324.891 215.961 325.083C217.607 326.5 219.268 327.893 220.946 329.26C221.403 329.632 222.097 329.145 221.932 328.579C221.289 326.377 220.787 324.02 219.919 321.889C219.825 321.659 219.882 321.394 220.066 321.227C221.89 319.583 223.736 317.97 225.602 316.388C226.028 316.027 225.749 315.314 225.189 315.329C223.077 315.385 220.902 315.342 218.809 315.323C218.495 315.32 218.239 315.069 218.23 314.756C218.137 311.4 217.863 307.782 217.728 304.412L216.662 278.728C216.331 271.953 216.198 265.05 215.798 258.295Z" fill="url(#paint1_linear_52_1118)"/>
    </g>
    <path d="M215.99 243.074C223.308 243.741 236.306 289.919 238.372 297.584C242.76 313.445 246.212 329.625 248.706 346.013C249.62 352.205 250.286 358.284 250.63 364.559C250.705 365.929 250.734 367.293 250.746 368.656C250.757 369.824 248.822 370.304 248.237 369.293C247.86 368.639 247.465 367.946 247.055 367.177C243.129 359.601 237.331 344.503 229.138 342.629C224.683 341.611 212.777 353.513 209.319 356.944C203.092 363.238 197.161 369.903 191.549 376.912C187.896 381.536 184.414 386.493 180.789 391.222C180.168 392.032 178.895 391.574 178.926 390.553C179.982 355.32 185.421 320.431 195.081 286.937C197.667 278.168 207.932 246.108 215.668 243.124C215.774 243.083 215.877 243.064 215.99 243.074ZM215.798 258.295C215.781 258.009 215.443 257.869 215.228 258.057C215.153 258.123 215.11 258.218 215.11 258.318C215.144 265.965 214.481 273.297 214.27 280.884C213.956 292.14 213.178 303.526 212.905 314.758C212.898 315.07 212.644 315.321 212.331 315.324C210.249 315.342 208.168 315.338 206.086 315.313C205.516 315.306 205.253 316.069 205.692 316.431C207.46 317.886 209.594 319.856 211.104 321.209C211.296 321.38 211.352 321.655 211.253 321.892C210.548 323.578 209.728 326.546 209.108 328.816C208.96 329.36 209.601 329.781 210.04 329.427C211.794 328.012 213.469 326.635 215.189 325.092C215.408 324.896 215.739 324.891 215.961 325.083C217.607 326.5 219.268 327.892 220.946 329.259C221.403 329.631 222.097 329.145 221.932 328.579C221.289 326.377 220.786 324.02 219.918 321.889C219.824 321.659 219.881 321.393 220.065 321.226C221.889 319.582 223.735 317.97 225.601 316.388C226.027 316.027 225.748 315.314 225.189 315.329C223.077 315.385 220.901 315.342 218.808 315.323C218.494 315.32 218.239 315.068 218.23 314.755C218.137 311.399 217.862 307.782 217.727 304.412L216.662 278.727C216.331 271.952 216.198 265.05 215.798 258.295Z" fill="url(#paint2_linear_52_1118)"/>
    <defs>
        <filter id="filter0_f_52_1118" x="-278.61" y="-153.61" width="987.221" height="987.221" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="131.805" result="effect1_foregroundBlur_52_1118"/>
        </filter>
        <clipPath id="paint0_angular_52_1118_clip_path"><circle cx="215" cy="340" r="230"/></clipPath>
        <filter id="filter1_f_52_1118" x="158.926" y="223.072" width="111.82" height="188.565" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="10" result="effect1_foregroundBlur_52_1118"/>
        </filter>
        <linearGradient id="paint1_linear_52_1118" x1="214.836" y1="243.072" x2="214.836" y2="391.637" gradientUnits="userSpaceOnUse">
            <stop stop-color="#C654F7"/>
            <stop offset="1" stop-color="#414FB9"/>
        </linearGradient>
        <linearGradient id="paint2_linear_52_1118" x1="214.836" y1="243.072" x2="214.836" y2="391.637" gradientUnits="userSpaceOnUse">
            <stop stop-color="#C654F7"/>
            <stop offset="1" stop-color="#414FB9"/>
        </linearGradient>
    </defs>
</svg>
`;

export const OnboardingFirstBackgroundSvg: React.FC<
  OnboardingFirstBackgroundSvgProps
> = ({ width = 430, height = 834, style }) => {
  return <SvgXml xml={BACKGROUND_SVG} width={width} height={height} style={style} />;
};

export default OnboardingFirstBackgroundSvg;
