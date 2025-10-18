import React from 'react';
import { SvgXml } from 'react-native-svg';

interface PiscesSvgProps {
  width?: number;
  height?: number;
  style?: any;
}

const ART_XML: string = `<svg width="143" height="205" viewBox="0 0 143 205" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path style="mix-blend-mode:screen" d="M113.36 137.041C114 130.461 109.19 124.611 102.61 123.961C96.0402 123.331 90.1802 128.131 89.5502 134.721C88.9002 141.291 93.7202 147.151 100.29 147.791C106.87 148.431 112.73 143.631 113.36 137.041Z" fill="url(#paint0_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M101.37 138.021C89.8403 137.591 80.5303 136.281 80.5803 135.091C80.6203 133.911 90.0002 133.291 101.53 133.721C113.05 134.151 122.37 135.461 122.32 136.661C122.28 137.841 112.9 138.461 101.37 138.021Z" fill="url(#paint1_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M111.89 146.391C112.49 145.801 108.34 140.591 102.6 134.751C96.8703 128.911 91.7403 124.661 91.1303 125.251C90.5303 125.841 94.6903 131.061 100.42 136.891C106.16 142.731 111.28 146.981 111.89 146.391Z" fill="url(#paint2_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M91.4102 147.121C91.9102 147.581 96.8403 142.871 102.42 136.621C108 130.391 112.11 124.971 111.61 124.521C111.12 124.071 106.19 128.781 100.6 135.011C95.0302 141.261 90.9202 146.681 91.4102 147.121Z" fill="url(#paint3_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M104.3 139.021C102.53 140.561 99.8603 140.371 98.3203 138.601C96.7803 136.841 96.9603 134.171 98.7303 132.631C100.49 131.101 103.17 131.281 104.7 133.041C106.24 134.811 106.05 137.481 104.3 139.021Z" fill="url(#paint4_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M69.1101 70.5009C69.5201 66.2309 66.4001 62.431 62.1401 62.011C57.8701 61.611 54.0701 64.7209 53.6601 68.9909C53.2401 73.2609 56.3701 77.0609 60.6301 77.4809C64.8901 77.8909 68.6901 74.7709 69.1101 70.5009Z" fill="url(#paint5_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M61.3301 71.1609C53.7301 70.8809 47.6001 70.0109 47.6401 69.2309C47.6601 68.4509 53.8401 68.0509 61.4401 68.3309C69.0301 68.6209 75.1601 69.4809 75.1301 70.2609C75.1001 71.0509 68.9201 71.4509 61.3301 71.1609Z" fill="url(#paint6_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M68.1501 76.5709C68.5401 76.1809 65.8502 72.8009 62.1202 69.0209C58.4102 65.2309 55.0802 62.4709 54.6902 62.8509C54.2902 63.2309 56.9901 66.6209 60.7101 70.4109C64.4301 74.1909 67.7601 76.9509 68.1501 76.5709Z" fill="url(#paint7_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M54.87 77.0409C55.19 77.3409 58.39 74.2809 62.01 70.2309C65.63 66.1909 68.3 62.6709 67.98 62.3809C67.65 62.0909 64.46 65.1409 60.83 69.1809C57.22 73.2409 54.55 76.7609 54.87 77.0409Z" fill="url(#paint8_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M63.2302 71.781C62.0802 72.781 60.3502 72.6609 59.3502 71.5109C58.3502 70.3709 58.4602 68.6409 59.6102 67.6409C60.7502 66.6409 62.4902 66.761 63.4902 67.911C64.4902 69.051 64.3702 70.791 63.2302 71.781Z" fill="url(#paint9_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M78.1301 28.1309C78.7701 21.5509 73.9601 15.7009 67.3801 15.0509C60.8101 14.4209 54.9501 19.2209 54.3101 25.8109C53.6701 32.3809 58.4801 38.2409 65.0601 38.8809C71.6301 39.5209 77.4901 34.7109 78.1301 28.1309Z" fill="url(#paint10_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M66.1401 28.9309C55.6001 28.5309 47.0901 27.3409 47.1401 26.2509C47.1701 25.1709 55.7501 24.6109 66.2901 25.0009C76.8301 25.3909 85.3401 26.5909 85.3001 27.6809C85.2601 28.7609 76.6801 29.3309 66.1401 28.9309Z" fill="url(#paint11_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M76.65 37.4809C77.26 36.8909 73.1 31.681 67.37 25.841C61.64 20.001 56.5 15.751 55.9 16.341C55.3 16.931 59.45 22.1509 65.18 27.9809C70.92 33.8209 76.05 38.0709 76.65 37.4809Z" fill="url(#paint12_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M56.1803 38.221C56.6803 38.671 61.6003 33.961 67.1803 27.711C72.7603 21.481 76.8703 16.0509 76.3803 15.6109C75.8803 15.1609 70.9603 19.8709 65.3703 26.1009C59.8003 32.3509 55.6803 37.781 56.1803 38.221Z" fill="url(#paint13_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M69.06 30.1109C67.29 31.6509 64.62 31.4609 63.09 29.7009C61.55 27.9309 61.73 25.2609 63.49 23.7209C65.25 22.1809 67.93 22.3709 69.47 24.1309C71.01 25.8909 70.82 28.5709 69.06 30.1109Z" fill="url(#paint14_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M18.6001 36.5909C18.9901 32.6209 16.0901 29.0909 12.1101 28.6909C8.15012 28.3209 4.62011 31.2109 4.23011 35.1809C3.84011 39.1509 6.7501 42.6909 10.7201 43.0809C14.6801 43.4609 18.2201 40.5609 18.6001 36.5909Z" fill="url(#paint15_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M11.4101 37.0309C5.0801 36.7909 -0.0298686 36.0809 0.000131421 35.4209C0.0101314 34.7709 5.17013 34.4309 11.5001 34.6709C17.8201 34.9109 22.9401 35.6309 22.9101 36.2809C22.8801 36.9309 17.7401 37.2709 11.4101 37.0309Z" fill="url(#paint16_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M17.7101 42.2309C18.0801 41.8709 15.5701 38.731 12.1101 35.211C8.6501 31.681 5.55011 29.121 5.19011 29.471C4.82011 29.831 7.34009 32.9809 10.7901 36.5009C14.2501 40.0209 17.3501 42.5809 17.7101 42.2309Z" fill="url(#paint17_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M5.35012 42.6709C5.66012 42.9409 8.63014 40.1009 12.0001 36.3409C15.3601 32.5809 17.8501 29.3009 17.5501 29.0309C17.2501 28.7609 14.2701 31.6009 10.9101 35.3609C7.55011 39.1309 5.06012 42.4109 5.35012 42.6709Z" fill="url(#paint18_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M13.13 37.781C12.07 38.711 10.4499 38.591 9.52995 37.531C8.59995 36.471 8.69994 34.8509 9.76994 33.9209C10.8299 33.0009 12.45 33.1109 13.38 34.1809C14.3 35.2409 14.19 36.851 13.13 37.781Z" fill="url(#paint19_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M125.93 186.141C126.41 181.271 122.85 176.941 117.98 176.461C113.12 176.001 108.78 179.551 108.3 184.421C107.83 189.291 111.4 193.621 116.26 194.101C121.12 194.571 125.46 191.011 125.93 186.141Z" fill="url(#paint20_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M117.06 186.791C108.93 186.491 102.37 185.561 102.41 184.721C102.44 183.891 109.05 183.461 117.18 183.761C125.3 184.071 131.86 184.991 131.83 185.831C131.8 186.661 125.19 187.101 117.06 186.791Z" fill="url(#paint21_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M124.84 193.061C125.29 192.621 122.22 188.771 117.97 184.441C113.73 180.131 109.93 176.981 109.48 177.421C109.03 177.851 112.11 181.721 116.35 186.031C120.6 190.351 124.39 193.501 124.84 193.061Z" fill="url(#paint22_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M109.69 193.601C110.06 193.941 113.7 190.451 117.84 185.831C121.96 181.221 125.01 177.201 124.64 176.881C124.27 176.541 120.62 180.031 116.49 184.641C112.37 189.261 109.32 193.271 109.69 193.601Z" fill="url(#paint23_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M119.22 187.601C117.91 188.751 115.94 188.601 114.8 187.301C113.66 185.991 113.79 184.011 115.1 182.871C116.4 181.741 118.39 181.871 119.53 183.181C120.66 184.491 120.53 186.471 119.22 187.601Z" fill="url(#paint24_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M127.42 166.971C127.76 163.471 125.2 160.351 121.69 160.001C118.19 159.671 115.07 162.231 114.73 165.741C114.38 169.241 116.95 172.361 120.46 172.701C123.96 173.051 127.08 170.481 127.42 166.971Z" fill="url(#paint25_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M122.59 168.031C121.64 168.851 120.22 168.751 119.41 167.811C118.59 166.871 118.68 165.441 119.62 164.621C120.56 163.801 121.99 163.901 122.81 164.841C123.62 165.781 123.53 167.211 122.59 168.031Z" fill="url(#paint26_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M115.64 156.891C115.98 153.391 113.42 150.271 109.91 149.921C106.41 149.591 103.28 152.151 102.95 155.661C102.6 159.171 105.17 162.291 108.67 162.631C112.18 162.971 115.3 160.411 115.64 156.891Z" fill="url(#paint27_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M110.81 157.951C109.87 158.771 108.44 158.671 107.62 157.731C106.8 156.791 106.89 155.371 107.84 154.551C108.78 153.731 110.21 153.831 111.03 154.761C111.85 155.701 111.75 157.131 110.81 157.951Z" fill="url(#paint28_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M105.55 168.681C105.89 165.181 103.33 162.061 99.8201 161.721C96.3201 161.381 93.19 163.941 92.85 167.451C92.51 170.961 95.0801 174.081 98.5801 174.421C102.09 174.761 105.21 172.201 105.55 168.681Z" fill="url(#paint29_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M100.72 169.741C99.77 170.561 98.35 170.461 97.53 169.521C96.71 168.581 96.8 167.161 97.75 166.341C98.69 165.521 100.11 165.621 100.94 166.561C101.75 167.501 101.66 168.921 100.72 169.741Z" fill="url(#paint30_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M142.09 198.761C142.43 195.251 139.86 192.131 136.36 191.791C132.85 191.461 129.73 194.021 129.39 197.521C129.05 201.031 131.62 204.151 135.12 204.491C138.62 204.831 141.75 202.271 142.09 198.761Z" fill="url(#paint31_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M137.26 199.821C136.32 200.641 134.89 200.531 134.07 199.601C133.25 198.661 133.34 197.231 134.29 196.411C135.23 195.591 136.65 195.691 137.48 196.631C138.29 197.571 138.19 199.001 137.26 199.821Z" fill="url(#paint32_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M128.34 178.441C128.57 176.061 126.83 173.931 124.44 173.701C122.06 173.471 119.93 175.211 119.7 177.601C119.46 179.991 121.21 182.111 123.6 182.341C125.98 182.581 128.1 180.841 128.34 178.441Z" fill="url(#paint33_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M125.05 179.161C124.41 179.721 123.44 179.651 122.88 179.011C122.32 178.371 122.39 177.401 123.03 176.841C123.67 176.281 124.64 176.351 125.19 176.991C125.75 177.631 125.69 178.601 125.05 179.161Z" fill="url(#paint34_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M74.2901 85.3809C74.5901 82.2509 72.3001 79.471 69.1701 79.161C66.0501 78.861 63.2601 81.141 62.9601 84.271C62.6601 87.411 64.9402 90.1909 68.0702 90.5009C71.2002 90.8009 73.9901 88.5109 74.2901 85.3809Z" fill="url(#paint35_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M69.98 86.3209C69.14 87.0509 67.8601 86.9709 67.1401 86.1309C66.4001 85.2909 66.4901 84.011 67.3301 83.281C68.1601 82.551 69.4401 82.6409 70.1701 83.4809C70.9001 84.3209 70.82 85.5909 69.98 86.3209Z" fill="url(#paint36_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M101.15 24.1209C101.45 20.9909 99.1701 18.2109 96.0401 17.9009C92.9101 17.6009 90.1201 19.8909 89.8201 23.0109C89.5101 26.1509 91.8001 28.9309 94.9301 29.2409C98.0601 29.5409 100.84 27.2509 101.15 24.1209Z" fill="url(#paint37_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M96.8402 25.0609C96.0002 25.7909 94.7302 25.7009 94.0002 24.8709C93.2602 24.0309 93.3502 22.7609 94.1902 22.0209C95.0302 21.2909 96.3002 21.3809 97.0302 22.2209C97.7602 23.0609 97.6802 24.3309 96.8402 25.0609Z" fill="url(#paint38_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M110.84 16.8809C111.14 13.7509 108.85 10.961 105.73 10.651C102.6 10.361 99.8102 12.641 99.5102 15.771C99.2102 18.901 101.49 21.6909 104.62 21.9909C107.75 22.3009 110.53 20.0109 110.84 16.8809Z" fill="url(#paint39_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M106.52 17.8209C105.68 18.5509 104.41 18.4609 103.68 17.6209C102.95 16.7809 103.03 15.5109 103.87 14.7809C104.71 14.0509 105.98 14.1309 106.72 14.9809C107.45 15.8109 107.36 17.0809 106.52 17.8209Z" fill="url(#paint40_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M116.68 9.10087C116.99 5.97087 114.7 3.1909 111.57 2.8809C108.44 2.5809 105.66 4.8709 105.35 8.0009C105.05 11.1209 107.34 13.9109 110.47 14.2209C113.6 14.5209 116.38 12.2409 116.68 9.10087Z" fill="url(#paint41_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M112.37 10.0409C111.53 10.7809 110.26 10.6809 109.53 9.84093C108.8 9.01093 108.88 7.7409 109.72 7.0009C110.56 6.2709 111.84 6.36091 112.57 7.20091C113.3 8.03091 113.21 9.31088 112.37 10.0409Z" fill="url(#paint42_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M47.79 33.3209C48.13 29.8109 45.57 26.691 42.06 26.341C38.56 26.011 35.43 28.5709 35.09 32.0809C34.75 35.5809 37.3201 38.7109 40.8201 39.0509C44.3301 39.3909 47.45 36.8209 47.79 33.3209Z" fill="url(#paint43_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M42.9501 34.3709C42.0101 35.1909 40.59 35.0909 39.77 34.1509C38.95 33.2109 39.0501 31.7909 39.9901 30.9709C40.9301 30.1509 42.3501 30.2409 43.1701 31.1809C43.9901 32.1209 43.8901 33.5509 42.9501 34.3709Z" fill="url(#paint44_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M126.92 7.26092C127.26 3.63092 124.61 0.390935 120.97 0.0309349C117.33 -0.319065 114.09 2.34089 113.74 5.98089C113.38 9.62089 116.05 12.8609 119.68 13.2209C123.32 13.5709 126.56 10.9109 126.92 7.26092Z" fill="url(#paint45_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M120.32 7.73091C114.21 7.50091 109.28 6.82093 109.3 6.18093C109.33 5.56093 114.3 5.23096 120.4 5.46096C126.5 5.69096 131.44 6.38094 131.41 7.01094C131.39 7.64094 126.42 7.97091 120.32 7.73091Z" fill="url(#paint46_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M126.1 12.4409C126.43 12.1109 124.14 9.23094 120.96 6.00094C117.79 2.77094 114.95 0.420941 114.62 0.750941C114.28 1.07094 116.58 3.96093 119.75 7.18093C122.93 10.4209 125.76 12.7709 126.1 12.4409Z" fill="url(#paint47_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M114.77 12.8509C115.05 13.1009 117.77 10.4909 120.86 7.04092C123.94 3.59092 126.22 0.590964 125.94 0.340964C125.67 0.0909644 122.94 2.70096 119.85 6.15096C116.77 9.61096 114.5 12.6009 114.77 12.8509Z" fill="url(#paint48_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M121.9 8.36089C120.92 9.22089 119.44 9.11092 118.6 8.14092C117.74 7.16092 117.84 5.68092 118.82 4.83092C119.79 3.98092 121.27 4.0809 122.12 5.0609C122.97 6.0309 122.87 7.51089 121.9 8.36089Z" fill="url(#paint49_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M109.21 182.831C109.44 180.451 107.69 178.321 105.31 178.091C102.92 177.861 100.8 179.601 100.57 181.991C100.33 184.381 102.08 186.501 104.46 186.741C106.85 186.971 108.98 185.221 109.21 182.831Z" fill="url(#paint50_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M105.92 183.551C105.28 184.111 104.31 184.041 103.75 183.401C103.19 182.761 103.26 181.801 103.9 181.231C104.54 180.681 105.51 180.741 106.07 181.381C106.62 182.021 106.55 182.991 105.92 183.551Z" fill="url(#paint51_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M59.0601 62.471C59.2901 60.081 57.5501 57.9609 55.1601 57.7309C52.7801 57.5009 50.6501 59.2409 50.4201 61.6309C50.1901 64.0109 51.9301 66.1409 54.3201 66.3709C56.7101 66.6009 58.8301 64.861 59.0601 62.471Z" fill="url(#paint52_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M55.77 63.1909C55.13 63.7509 54.1601 63.6809 53.6001 63.0409C53.0501 62.4009 53.1101 61.4309 53.7501 60.8709C54.3901 60.3109 55.3601 60.3809 55.9201 61.0209C56.4801 61.6609 56.41 62.6309 55.77 63.1909Z" fill="url(#paint53_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M44.1201 52.1809C44.3401 49.7909 42.6001 47.6709 40.2101 47.4409C37.8301 47.2109 35.7001 48.951 35.4701 51.341C35.2401 53.731 36.9801 55.851 39.3701 56.091C41.7501 56.321 43.8801 54.5709 44.1201 52.1809Z" fill="url(#paint54_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M40.8201 52.9009C40.1801 53.4609 39.2101 53.3909 38.6501 52.7509C38.1001 52.1109 38.1601 51.1409 38.8001 50.5809C39.4401 50.0309 40.4101 50.0909 40.9701 50.7309C41.5301 51.3709 41.4601 52.3409 40.8201 52.9009Z" fill="url(#paint55_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M36.26 45.471C36.49 43.081 34.75 40.951 32.36 40.721C29.97 40.491 27.85 42.2309 27.62 44.6209C27.39 47.0109 29.13 49.1309 31.51 49.3709C33.9 49.6009 36.03 47.861 36.26 45.471Z" fill="url(#paint56_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M32.9699 46.1809C32.3299 46.7409 31.3599 46.671 30.7999 46.031C30.2399 45.391 30.3099 44.4309 30.9499 43.8709C31.5899 43.3109 32.5599 43.3709 33.1199 44.0209C33.6799 44.6509 33.6099 45.6309 32.9699 46.1809Z" fill="url(#paint57_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M22.5701 42.451C22.8001 40.071 21.0601 37.941 18.6701 37.711C16.2901 37.481 14.1601 39.2209 13.9301 41.6109C13.7001 44.0009 15.4401 46.1209 17.8301 46.3609C20.2101 46.5809 22.3401 44.841 22.5701 42.451Z" fill="url(#paint58_radial_2001_943)"/>
    <path style="mix-blend-mode:screen" d="M19.28 43.1709C18.64 43.7309 17.6701 43.661 17.1101 43.021C16.5601 42.381 16.6201 41.4109 17.2601 40.8509C17.9001 40.3009 18.8701 40.3609 19.4301 41.0009C19.9901 41.6409 19.92 42.6109 19.28 43.1709Z" fill="url(#paint59_radial_2001_943)"/>
    <path d="M104.56 182.791L98.6902 167.991L108.79 156.191L101.1 135.981L68.2602 85.0709L61.0502 69.9509L54.4402 62.3809L39.5402 52.1209L31.8702 45.3309L18.0702 42.2509L10.4001 35.5109L41.3002 32.4809L66.1802 26.4909L95.3202 23.1409L104.87 16.0109L111 8.12091L111.16 8.09094L120.26 6.16095L120.45 7.03094L111.49 8.91095L105.49 16.6409L105.44 16.6709L95.6501 23.9909L95.5402 24.0009L66.3302 27.3509L41.4502 33.3509L12.5002 36.1909L18.5702 41.5109L32.2802 44.5209L32.3702 44.5909L40.0901 51.4309L55.0702 61.7609L61.8202 69.5209L69.0302 84.6409L101.88 135.591L109.8 156.371L99.7101 168.161L105.21 182.041L117.42 184.881L136 197.781L135.49 198.501L116.98 185.651L104.56 182.791Z" fill="white"/>
    <path d="M116.85 184.931L123.53 177.891L120.68 166.601L109.01 156.611L109.58 155.941L121.47 166.111L124.51 178.151L117.48 185.541L116.85 184.931Z" fill="white"/>
    <defs>
        <radialGradient id="paint0_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(101.454 135.878) rotate(5.57103) scale(11.9695 11.9695)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint1_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(101.452 135.873) rotate(92.1566) scale(2.15252 2.15252)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint2_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(101.51 135.823) rotate(45.5228) scale(14.8025)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint3_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-10.121 11.325 -11.325 -10.121 101.51 135.823)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint4_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(101.512 135.824) rotate(48.907) scale(4.2341)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint5_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(61.3841 69.7469) rotate(5.57111) scale(7.76669 7.76667)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint6_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(61.3841 69.7449) rotate(92.142) scale(1.418 1.41799)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint7_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(6.71998 6.84402 -6.84398 6.72002 61.4191 69.7129)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint8_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(61.419 69.7099) rotate(131.787) scale(9.85204)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint9_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.805 2.07 -2.07 1.805 61.4202 69.7119)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint10_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(66.2201 26.9659) rotate(5.5715) scale(11.9685 11.9686)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint11_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(66.2181 26.9649) rotate(92.1545) scale(1.96839 1.96839)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint12_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(10.377 10.569 -10.569 10.377 66.277 26.9139)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint13_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-10.106 11.308 -11.308 -10.106 66.2753 26.9139)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint14_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(2.783 3.19199 -3.192 2.78299 66.277 26.9129)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint15_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11.4171 35.8859) rotate(5.56855) scale(7.22409 7.2241)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint16_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-0.0439999 1.18002 -1.18 -0.0440008 11.4521 35.8519)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint17_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11.4491 35.8539) rotate(45.5263) scale(8.92969)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint18_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-6.10301 6.82998 -6.83001 -6.10298 11.4511 35.8529)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint19_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11.451 35.8539) rotate(48.9174) scale(2.55653)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint20_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(117.119 185.278) rotate(5.57093) scale(8.85884 8.85882)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint21_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(117.12 185.277) rotate(92.1547) scale(1.51606 1.51607)">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint22_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(7.67499 7.81701 -7.81699 7.67501 117.163 185.24)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint23_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-7.49301 8.38399 -8.38401 -7.49299 117.161 185.239)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint24_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(117.163 185.237) rotate(48.9052) scale(3.13551)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint25_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(121.075 166.355) rotate(5.56937) scale(6.37811 6.37811)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint26_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.484 1.701 -1.701 1.484 121.104 166.326)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint27_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(109.294 156.276) rotate(5.5685) scale(6.3791 6.37911)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint28_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(109.324 156.248) rotate(48.8977) scale(2.25736)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint29_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(99.202 168.07) rotate(5.56847) scale(6.37911 6.37908)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint30_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.484 1.702 -1.702 1.484 99.232 168.041)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint31_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(135.741 198.143) rotate(5.56765) scale(6.38007 6.3801)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint32_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.484 1.70199 -1.702 1.48399 135.773 198.115)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint33_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(4.32098 0.422001 -0.421998 4.32101 124.017 178.022)" gradientUnits="userSpaceOnUse">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint34_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.009 1.157 -1.157 1.009 124.037 178.001)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint35_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(68.6261 84.828) rotate(5.57437) scale(5.69293 5.69291)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint36_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.32399 1.518 -1.51799 1.324 68.6531 84.8019)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint37_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(95.4871 23.5709) rotate(5.57342) scale(5.6939 5.6939)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint38_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.32399 1.51899 -1.51899 1.32399 95.5112 23.5429)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint39_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(105.175 16.3229) rotate(5.57342) scale(5.6939 5.6939)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint40_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.32499 1.519 -1.51899 1.325 105.2 16.2979)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint41_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(111.019 8.54892) rotate(5.5744) scale(5.69293 5.69294)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint42_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.32401 1.518 -1.51801 1.324 111.048 8.5219)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint43_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(41.441 32.6949) rotate(5.56847) scale(6.37911 6.37908)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint44_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.48301 1.701 -1.70101 1.483 41.4711 32.6669)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint45_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120.327 6.62394) rotate(5.57115) scale(6.62328 6.62329)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint46_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-0.043 1.13898 -1.139 -0.0429994 120.359 6.59694)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint47_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(5.73399 5.84 -5.83999 5.734 120.355 6.59694)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint48_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(-5.59902 6.26497 -6.26502 -5.59898 120.355 6.59494)" gradientUnits="userSpaceOnUse">
            <stop stop-color="white"/>
            <stop offset="0.102" stop-color="#D9D9D9"/>
            <stop offset="0.168" stop-color="#AAAAAA"/>
            <stop offset="0.255" stop-color="#7A7A7A"/>
            <stop offset="0.408" stop-color="#424242"/>
            <stop offset="0.515" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint49_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120.357 6.59491) rotate(48.9107) scale(2.34315)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint50_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(104.886 182.412) rotate(5.57669) scale(4.34253 4.34254)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint51_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(104.906 182.394) rotate(48.9053) scale(1.53658)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint52_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(54.7411 62.0499) rotate(5.57668) scale(4.34256)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint53_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(54.7601 62.0299) rotate(48.9089) scale(1.53516)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint54_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39.7941 51.762) rotate(5.5754) scale(4.34356)">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint55_radial_2001_943" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39.8121 51.7429) rotate(48.9053) scale(1.53658)">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint56_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(4.32101 0.421998 -0.422001 4.32098 31.939 45.044)" gradientUnits="userSpaceOnUse">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint57_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.009 1.157 -1.15699 1.009 31.9609 45.0269)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint58_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(4.32201 0.421998 -0.422001 4.32198 18.2491 42.0329)" gradientUnits="userSpaceOnUse">
            <stop offset="0.099" stop-color="white"/>
            <stop offset="0.363" stop-color="#7A7A7A"/>
            <stop offset="0.572" stop-color="#2A2A2A"/>
            <stop offset="0.663" stop-color="#161616"/>
            <stop offset="0.826" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
        <radialGradient id="paint59_radial_2001_943" cx="0" cy="0" r="1" gradientTransform="matrix(1.01 1.158 -1.15799 1.01 18.2701 42.0119)" gradientUnits="userSpaceOnUse">
            <stop offset="0.324" stop-color="white"/>
            <stop offset="0.561" stop-color="#C6C6C6"/>
            <stop offset="0.731" stop-color="#6A6A6A"/>
            <stop offset="0.874" stop-color="#000505"/>
            <stop offset="0.964"/>
        </radialGradient>
    </defs>
</svg>
`;

export const PiscesSvg: React.FC<PiscesSvgProps> = ({
  width = 430,
  height = 834,
  style,
}) => {
  return <SvgXml xml={ART_XML} width={width} height={height} style={style} />;
};

export default PiscesSvg;
