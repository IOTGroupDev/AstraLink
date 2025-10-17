// frontend/src/screens/Onboarding1Screen.tsx
// Simple first step screen that scales 430×932 frame to device width.
// CTA navigates to Onboarding2.
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

// Base frame (Figma) to preserve pixel distances
const FRAME_W = 430;
const FRAME_H = 932;

const COLORS = {
  bgTop: '#2b0e3b',
  bgBottom: '#0d0d0d',
  white: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
  btnBg: '#ECECEC',
  btnText: '#000000',
};

const TYPE = {
  h1: { fontSize: 24, lineHeight: 28, fontFamily: 'Montserrat_600SemiBold' },
  body: { fontSize: 19, lineHeight: 28, fontFamily: 'Montserrat_400Regular' },
  cta: { fontSize: 20, lineHeight: 24, fontFamily: 'Montserrat_500Medium' },
};

interface Onboarding1ScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function Onboarding1Screen({
  navigation,
}: Onboarding1ScreenProps) {
  const scale = useMemo(() => SCREEN_W / FRAME_W, []);

  const onContinue = () => {
    navigation.navigate('Onboarding2');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { transform: [{ scale }] }]}>
        {/* Background vertical gradient (deep purple to black) */}
        <LinearGradient
          colors={[COLORS.bgTop, COLORS.bgBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fullBg}
        />

        {/* Title + subtitle block (approx position based on Figma) */}
        <View style={styles.textBlock}>
          <Text
            style={{
              color: COLORS.white,
              fontSize: TYPE.h1.fontSize,
              lineHeight: TYPE.h1.lineHeight,
              fontFamily: TYPE.h1.fontFamily,
              textAlign: 'left',
              marginBottom: 10,
            }}
          >
            {'Ваш космос —\nв одном касании'}
          </Text>

          <Text
            style={{
              color: COLORS.textDim,
              fontSize: TYPE.body.fontSize,
              lineHeight: TYPE.body.lineHeight,
              fontFamily: TYPE.body.fontFamily,
              textAlign: 'left',
            }}
          >
            {
              'Анализ натальной карты, советы звёзд и астрологические знакомства — всё, чтобы лучше понять себя и мир вокруг.'
            }
          </Text>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onContinue}
          style={styles.ctaButton}
        >
          <Text
            style={{
              color: COLORS.btnText,
              fontSize: TYPE.cta.fontSize,
              lineHeight: TYPE.cta.lineHeight,
              fontFamily: TYPE.cta.fontFamily,
              textTransform: 'uppercase',
            }}
          >
            ДАЛЕЕ
          </Text>
        </TouchableOpacity>

        {/* Home indicator */}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgBottom,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 60,
    overflow: 'hidden',
  },
  fullBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FRAME_W,
    height: FRAME_H,
  },
  textBlock: {
    position: 'absolute',
    left: 24,
    top: 535,
    width: FRAME_W - 48,
  },
  ctaButton: {
    position: 'absolute',
    left: 24,
    top: 818,
    width: 382,
    height: 60,
    borderRadius: 58,
    backgroundColor: COLORS.btnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    position: 'absolute',
    left: 145,
    top: 920,
    width: 140,
    height: 4,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
});
