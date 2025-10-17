// frontend/src/screens/Onboarding2Screen.tsx
// Pixel-aligned onboarding screen with 3-wheel date picker and glass pill selection
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import DateWheelPicker, { DateParts } from '../components/DateWheelPicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../stores/onboarding.store';

const { width: SCREEN_W } = Dimensions.get('window');

// Base frame (430x932) — scale to device width to preserve pixel distances
const FRAME_W = 430;
const FRAME_H = 932;

// Layout params (relative to frame)
const VISIBLE_ROWS = 9;
const PICKER_ITEM_HEIGHT = 36;
const PICKER_HEIGHT = VISIBLE_ROWS * PICKER_ITEM_HEIGHT;
// Distance from bottom of the frame to picker center row
const PICKER_BOTTOM = 180;

const COLORS = {
  bgTop: '#2b0e3b',
  bgBottom: '#0d0d0d',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
  btnBg: '#ECECEC',
  btnText: '#000000',
};

// Stars positions (approx) — small 2x2 dots with low opacity
const STARS: Array<{ x: number; y: number; o?: number }> = [
  { x: 373, y: 268, o: 0.3 },
  { x: 257, y: 251, o: 0.3 },
  { x: 128, y: 74, o: 0.25 },
  { x: 347, y: 49, o: 0.25 },
  { x: 95, y: 20, o: 0.3 },
  { x: 259, y: 124, o: 0.25 },
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

// Typography (Montserrat is set globally in App.tsx via defaultProps)
const TYPE = {
  title: { fontSize: 24, lineHeight: 28, fontFamily: 'Montserrat_600SemiBold' },
  subtitle: {
    fontSize: 22,
    lineHeight: 27,
    fontFamily: 'Montserrat_400Regular',
  },
  cta: { fontSize: 20, lineHeight: 24, fontFamily: 'Montserrat_500Medium' },
  step: { fontSize: 20, lineHeight: 28, fontFamily: 'Montserrat_400Regular' },
};

interface Props {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function Onboarding2Screen({ navigation }: Props) {
  const scale = useMemo(() => SCREEN_W / FRAME_W, []);

  const storedBirthDate = useOnboardingStore((s) => s.data.birthDate);
  const setBirthDateInStore = useOnboardingStore((s) => s.setBirthDate);

  const [birthDate, setBirthDate] = useState<DateParts>(
    storedBirthDate || { day: 1, month: 1, year: 1995 }
  );

  useEffect(() => {
    setBirthDateInStore(birthDate);
  }, [birthDate, setBirthDateInStore]);

  const onBack = () => navigation.goBack();
  const onNext = () => {
    setBirthDateInStore(birthDate);
    navigation.navigate('MainTabs');
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
            style={[
              styles.star,
              {
                left: p.x,
                top: p.y,
                opacity: p.o ?? 0.28,
              },
            ]}
          />
        ))}

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            style={styles.backWrap}
          >
            <Text style={styles.backIcon}>{'‹'}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Дата рождения</Text>

          <Text style={styles.headerStep} numberOfLines={1}>
            1/3
          </Text>
        </View>

        {/* Description above picker */}
        <View
          style={[
            styles.centerTextWrap,
            { top: FRAME_H - PICKER_BOTTOM - PICKER_HEIGHT - 56 },
          ]}
        >
          <Text style={styles.centerText}>
            Введите дату рождения - узнаем, кто вы по гороскопу!
          </Text>
        </View>

        {/* Date picker */}
        <View
          style={[
            styles.pickerWrap,
            { top: FRAME_H - PICKER_BOTTOM - PICKER_HEIGHT },
          ]}
        >
          <DateWheelPicker
            value={birthDate}
            onChange={(d) => setBirthDate(d)}
            minYear={1900}
            maxYear={new Date().getFullYear()}
            visibleRows={VISIBLE_ROWS}
            itemHeight={PICKER_ITEM_HEIGHT}
            locale="en"
            selectionStyle="pill"
            selectionBackgroundColor="rgba(255,255,255,0.12)"
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onNext}
          style={[
            styles.actionButton,
            {
              left: 24,
              top: 818,
              width: 382,
              height: 60,
              borderRadius: 58,
            },
          ]}
        >
          <Text style={styles.ctaText}>ДАЛЕЕ</Text>
        </TouchableOpacity>

        {/* Home indicator */}
        <View
          style={[
            styles.homeIndicator,
            {
              left: 145,
              top: 920,
              width: 140,
              height: 4,
            },
          ]}
        />
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
    backgroundColor: 'transparent',
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
  headerRow: {
    position: 'absolute',
    top: 79,
    left: 24,
    right: 24,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.text,
    lineHeight: 28,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: TYPE.title.fontSize,
    lineHeight: TYPE.title.lineHeight,
    fontFamily: TYPE.title.fontFamily,
  },
  headerStep: {
    width: 36,
    textAlign: 'right',
    color: 'rgba(255,255,255,0)', // invisible per mock
    fontSize: TYPE.step.fontSize,
    lineHeight: TYPE.step.lineHeight,
    fontFamily: TYPE.step.fontFamily,
  },
  centerTextWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0, // provided inline
    alignItems: 'center',
  },
  centerText: {
    color: COLORS.textDim,
    textAlign: 'center',
    fontSize: TYPE.subtitle.fontSize,
    lineHeight: TYPE.subtitle.lineHeight,
    fontFamily: TYPE.subtitle.fontFamily,
  },
  pickerWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0, // provided inline
    alignItems: 'center',
  },
  actionButton: {
    position: 'absolute',
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
    borderRadius: 4,
    backgroundColor: COLORS.text,
  },
});
