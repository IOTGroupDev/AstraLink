// frontend/src/screens/OnboardingSecondScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import DateWheelPicker, { DateParts } from '../../components/DateWheelPicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../stores/onboarding.store';
import CosmicBackground from '../../components/CosmicBackground';

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
};

const VISIBLE_ROWS = 8;
const PICKER_ITEM_HEIGHT = 40;
const PICKER_HEIGHT = VISIBLE_ROWS * PICKER_ITEM_HEIGHT;
const PICKER_BOTTOM = 230;

const COLORS = {
  bg: '#101010',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.7)',
  btnBg: '#ECECEC',
  btnText: '#000000',
};

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

export default function OnboardingSecondScreen({ navigation }: Props) {
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
    navigation.navigate('Onboarding3');
  };

  return (
    <View style={styles.root}>
      <CosmicBackground />
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={goBack}
          accessibilityRole="button"
          style={styles.backWrap}
        >
          <Text style={styles.backArrow}>←</Text>
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
          visibleRows={8}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    position: 'absolute',
    top: 60,
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
  backArrow: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 36,
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
    width: 382,
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
