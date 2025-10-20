import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import mainBackground from '../assets/images/mainBackground.svg';

interface LoginNewScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}
const StarfieldBackground = `
<svg width="430" height="932" viewBox="0 0 430 932" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_52_1289)">
<rect width="430" height="932" fill="#101010"/>
<rect width="430" height="932" fill="url(#paint0_linear_52_1289)" fill-opacity="0.3"/>
<g opacity="0.3">
<circle cx="375" cy="270" r="2" fill="#D9D9D9"/>
<circle cx="259" cy="253" r="2" fill="#D9D9D9"/>
<circle cx="130" cy="76" r="2" fill="#D9D9D9"/>
<circle cx="349" cy="51" r="2" fill="#D9D9D9"/>
<circle cx="97" cy="22" r="2" fill="#D9D9D9"/>
<circle cx="261" cy="126" r="2" fill="#D9D9D9"/>
<circle cx="309" cy="375" r="2" fill="#D9D9D9"/>
<circle cx="325" cy="385" r="2" fill="#D9D9D9"/>
<circle cx="384" cy="394" r="2" fill="#D9D9D9"/>
<circle cx="391" cy="468" r="2" fill="#D9D9D9"/>
<circle cx="134" cy="401" r="2" fill="#D9D9D9"/>
<circle cx="86" cy="430" r="2" fill="#D9D9D9"/>
<circle cx="110" cy="298" r="2" fill="#D9D9D9"/>
<circle cx="217" cy="315" r="2" fill="#D9D9D9"/>
<circle cx="47" cy="572" r="2" fill="#D9D9D9"/>
<circle cx="140" cy="564" r="2" fill="#D9D9D9"/>
<circle cx="240" cy="526" r="2" fill="#D9D9D9"/>
<circle cx="279" cy="564" r="2" fill="#D9D9D9"/>
<circle cx="362" cy="598" r="2" fill="#D9D9D9"/>
<circle cx="75" cy="694" r="2" fill="#D9D9D9"/>
<circle cx="166" cy="611" r="2" fill="#D9D9D9"/>
<circle cx="305" cy="698" r="2" fill="#D9D9D9"/>
<circle cx="181" cy="745" r="2" fill="#D9D9D9"/>
<circle cx="419" cy="801" r="2" fill="#D9D9D9"/>
<circle cx="16" cy="177" r="2" fill="#D9D9D9"/>
<circle cx="27" cy="359" r="2" fill="#D9D9D9"/>
<circle cx="31" cy="797" r="2" fill="#D9D9D9"/>
<circle cx="199" cy="679" r="2" fill="#D9D9D9"/>
</g>
</g>
<defs>
<linearGradient id="paint0_linear_52_1289" x1="215" y1="0" x2="215" y2="932" gradientUnits="userSpaceOnUse">
<stop stop-color="#6F1F85"/>
<stop offset="0.747891"/>
</linearGradient>
<clipPath id="clip0_52_1289">
<rect width="430" height="932" fill="white"/>
</clipPath>
</defs>
</svg>

`;
export default function LoginNewScreen({
  onLogin,
  onSwitchToSignup,
}: LoginNewScreenProps) {
  return (
    <View style={styles.container}>
      {/* Фоновое изображение Frame350 */}
      <View style={styles.frame350Background}>
        <SvgXml xml={StarfieldBackground} width={430} height={932} />
      </View>

      {/* Контент */}
      <View style={styles.contentContainer}>
        {/* Кнопки */}
        <Animated.View
          entering={FadeIn.delay(500)}
          style={styles.buttonsContainer}
        >
          <TouchableOpacity
            style={[styles.button, styles.buttonLarge]}
            onPress={onLogin}
          >
            <Text style={styles.buttonText}>ВОЙТИ С ПОЧТОЙ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSmall]}
            onPress={onLogin}
          >
            <Text style={styles.buttonText}>ВОЙТИ С ПОЧТОЙ</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Текст регистрации */}
        <Animated.View
          entering={FadeIn.delay(700)}
          style={styles.signupTextContainer}
        >
          <TouchableOpacity onPress={onSwitchToSignup}>
            <Text style={styles.signupText}>Нет аккаунта? Создать профиль</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  orbitalBackground: {
    position: 'absolute',
    top: -305, // Согласно макету: y: -305
    left: -37, // Согласно макету: x: -37
    width: 504,
    height: 508,
  },
  frame350Background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 430,
    height: 932,
    opacity: 1, // Согласно макету
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 79,
    paddingBottom: 79,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    width: 208,
    height: 208,
    position: 'relative',
  },
  backgroundBlur: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -46,
    left: -46,
    overflow: 'hidden',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  logoSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    position: 'absolute',
    top: 7.07, // Согласно макету: y: 7.07
    left: 30, // Согласно макету: x: 30
    width: 149,
    height: 196.57,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#ECECEC',
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonLarge: {
    height: 60,
    width: 382, // Согласно макету
  },
  buttonSmall: {
    height: 60,
    width: 382, // Согласно макету
  },
  buttonText: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'uppercase',
    lineHeight: 24.38,
  },
  signupTextContainer: {
    position: 'absolute',
    bottom: 98, // Согласно макету: y: 834, но с учетом paddingBottom: 79
    left: 79.5, // Согласно макету: x: 79.5
    width: 271, // Согласно макету
    height: 28, // Согласно макету
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: {
    fontFamily: 'IBM Plex Mono',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  bottomElement: {
    position: 'absolute',
    bottom: 12, // Согласно макету: y: 920, но с учетом paddingBottom: 79
    left: 145, // Согласно макету: x: 145
    width: 140, // Согласно макету
    height: 4, // Согласно макету
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
});
