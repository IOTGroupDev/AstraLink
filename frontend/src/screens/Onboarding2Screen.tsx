// frontend/src/screens/Onboarding2Screen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import DateWheelPicker, { DateParts } from '../components/DateWheelPicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../stores/onboarding.store';

const { width: SCREEN_W } = Dimensions.get('window');

const FRAME_W = 430;
const FRAME_H = 932;

const POS = {
  header: {
    height: 56,
    horizontalPadding: 16,
  },
  panelGlass: { left: 24, top: 520, w: 382, h: 38, radius: 19 },
  actionButton: { left: 24, top: 818, w: 382, h: 60, radius: 58 },
  homeIndicator: { left: 145, top: 920, w: 140, h: 4 },
};

const VISIBLE_ROWS = 7;
const PICKER_ITEM_HEIGHT = 40;
const PICKER_HEIGHT = VISIBLE_ROWS * PICKER_ITEM_HEIGHT;
const PICKER_BOTTOM = 180;

const COLORS = {
  bg: '#101010',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.7)',
  btnBg: '#ECECEC',
  btnText: '#000000',
};

const STARS: Array<{ x: number; y: number }> = [
  { x: 373, y: 268 },
  { x: 257, y: 251 },
  { x: 128, y: 74 },
  { x: 347, y: 49 },
  { x: 95, y: 20 },
  { x: 259, y: 124 },
  { x: 307, y: 373 },
  { x: 323, y: 383 },
  { x: 382, y: 392 },
  { x: 389, y: 466 },
  { x: 132, y: 399 },
  { x: 84, y: 428 },
  { x: 108, y: 296 },
  { x: 215, y: 313 },
  { x: 45, y: 570 },
  { x: 138, y: 562 },
  { x: 238, y: 524 },
  { x: 277, y: 562 },
  { x: 360, y: 596 },
  { x: 73, y: 692 },
  { x: 164, y: 609 },
  { x: 303, y: 696 },
  { x: 179, y: 743 },
  { x: 417, y: 799 },
  { x: 14, y: 175 },
  { x: 25, y: 357 },
  { x: 29, y: 795 },
  { x: 197, y: 677 },
];

const TYPE = {
  title: { fontSize: 24, lineHeight: 28, fontFamily: 'Montserrat_600SemiBold' },
  subtitle: {
    fontSize: 22.2,
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

  const storedBirthDate = useOnboardingStore((state) => state.data.birthDate);
  const setBirthDateInStore = useOnboardingStore((state) => state.setBirthDate);

  const [birthDate, setBirthDate] = useState<DateParts>(() => {
    if (storedBirthDate) return storedBirthDate;
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  });

  const goBack = () => navigation.goBack();

  const onNext = () => {
    setBirthDateInStore(birthDate);
    navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { transform: [{ scale }] }]}>
        <Image
          source={require('../../assets/figma/onboarding2_bg.png')}
          style={styles.fullBg}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['#6F1F85', 'rgba(111,31,133,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientOverlay}
        />

        {STARS.map((p, idx) => (
          <View
            key={`star-${idx}`}
            style={[styles.star, { left: p.x, top: p.y }]}
          />
        ))}

        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            style={styles.backWrap}
          >
            <Image
              source={require('../../assets/figma/onboarding2_arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Дата рождения</Text>

          <Text style={styles.headerStep} numberOfLines={1}>
            1/3
          </Text>
        </View>

        <View style={[styles.centerTextWrap, { top: 160 }]}>
          <Text style={styles.centerText}>
            Введите дату рождения - узнаем, кто вы по гороскопу!
          </Text>
        </View>

        <View
          style={[
            styles.pickerWrap,
            {
              top: FRAME_H - PICKER_BOTTOM - PICKER_HEIGHT,
              height: PICKER_HEIGHT,
            },
          ]}
        >
          <DateWheelPicker
            value={birthDate}
            onChange={(d) => setBirthDate(d)}
            minYear={1900}
            maxYear={new Date().getFullYear()}
            visibleRows={7}
            itemHeight={40}
            locale="en"
            selectionStyle="pill"
            selectionBackgroundColor="rgba(255,255,255,0.12)"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onNext}
          style={[
            styles.actionButton,
            {
              left: POS.actionButton.left,
              top: POS.actionButton.top,
              width: POS.actionButton.w,
              height: POS.actionButton.h,
              borderRadius: POS.actionButton.radius,
            },
          ]}
        >
          <Text style={styles.ctaText}>ДАЛЕЕ</Text>
        </TouchableOpacity>

        <View
          style={[
            styles.homeIndicator,
            {
              left: POS.homeIndicator.left,
              top: POS.homeIndicator.top,
              width: POS.homeIndicator.w,
              height: POS.homeIndicator.h,
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
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    backgroundColor: COLORS.bg,
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
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FRAME_W,
    height: FRAME_H,
    opacity: 0.3,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
    opacity: 0.3,
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
    width: 36,
    height: 36,
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
    color: COLORS.textDim,
    fontSize: TYPE.step.fontSize,
    lineHeight: TYPE.step.lineHeight,
    fontFamily: TYPE.step.fontFamily,
    opacity: 0,
  },
  centerTextWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0,
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
    top: 0,
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
