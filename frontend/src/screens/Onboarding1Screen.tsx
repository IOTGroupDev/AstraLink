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
  // Deep purple top to near-black bottom (close to ref)
  bgTop: '#2b0e3b',
  bgBottom: '#0d0d0d',
  white: '#FFFFFF',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
  btnBg: '#ECECEC',
  btnText: '#000000',
};

// Small star field (2x2 px dots), slight opacity variance
const STARS: Array<{ x: number; y: number; o?: number }> = [
  { x: 373, y: 268, o: 0.3 },
  { x: 257, y: 251, o: 0.28 },
  { x: 128, y: 74, o: 0.26 },
  { x: 347, y: 49, o: 0.24 },
  { x: 95, y: 20, o: 0.28 },
  { x: 259, y: 124, o: 0.26 },
  { x: 307, y: 373, o: 0.3 },
  { x: 323, y: 383, o: 0.28 },
  { x: 382, y: 392, o: 0.28 },
  { x: 389, y: 466, o: 0.26 },
  { x: 132, y: 399, o: 0.28 },
  { x: 84, y: 428, o: 0.3 },
  { x: 108, y: 296, o: 0.22 },
  { x: 215, y: 313, o: 0.25 },
  { x: 45, y: 570, o: 0.24 },
  { x: 138, y: 562, o: 0.26 },
  { x: 238, y: 524, o: 0.25 },
  { x: 277, y: 562, o: 0.26 },
  { x: 360, y: 596, o: 0.25 },
  { x: 73, y: 692, o: 0.28 },
  { x: 164, y: 609, o: 0.28 },
  { x: 303, y: 696, o: 0.25 },
  { x: 179, y: 743, o: 0.26 },
  { x: 417, y: 799, o: 0.3 },
  { x: 14, y: 175, o: 0.22 },
  { x: 25, y: 357, o: 0.22 },
  { x: 29, y: 795, o: 0.22 },
  { x: 197, y: 677, o: 0.25 },
];

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

        {/* Stars layer */}
        {STARS.map((p, idx) => (
          <View
            key={`star-${idx}`}
            style={[styles.star, { left: p.x, top: p.y, opacity: p.o ?? 0.28 }]}
          />
        ))}

        {/* Title + subtitle block */}
        <View style={styles.textBlock}>
          <Text style={styles.titleText}>
            {'Ваш космос —\nв одном касании'}
          </Text>
          <Text style={styles.subtitleText}>
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
          <Text style={styles.ctaText}>ДАЛЕЕ</Text>
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
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
  },
  textBlock: {
    position: 'absolute',
    left: 24,
    top: 535, // approx per new ref (text above CTA)
    width: FRAME_W - 48,
  },
  titleText: {
    color: COLORS.text,
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    fontFamily: TYPE.h1.fontFamily,
    textAlign: 'left',
    marginBottom: 10,
  },
  subtitleText: {
    color: COLORS.textDim,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    fontFamily: TYPE.body.fontFamily,
    textAlign: 'left',
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
  ctaText: {
    color: COLORS.btnText,
    textTransform: 'uppercase',
    fontSize: TYPE.cta.fontSize,
    lineHeight: TYPE.cta.lineHeight,
    fontFamily: TYPE.cta.fontFamily,
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
