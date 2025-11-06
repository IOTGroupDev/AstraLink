import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import OnboardingFirstMainSvg from '../../components/onboarding/OnboardingFirstMainSvg';
import CosmicBackground from '../../components/shared/CosmicBackground';

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

export default function OnboardingFirstScreen({
  navigation,
}: Onboarding1ScreenProps) {
  const scale = useMemo(() => SCREEN_W / FRAME_W, []);

  const onContinue = () => {
    navigation.navigate('Onboarding2');
  };

  return (
    <View style={styles.root}>
      <CosmicBackground />
      <View style={[styles.frame, { transform: [{ scale }] }]}>
        <OnboardingFirstMainSvg />

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
  textBlock: {
    position: 'absolute',
    left: 24,
    top: 600, // moved down to be near the CTA button
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
});
