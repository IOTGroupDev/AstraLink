// frontend/src/screens/OnboardingFourthScreen.tsx
// Step 3/3 — Время рождения (по макету Figma), стилистически согласован с Onboarding2
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../stores/onboarding.store';
import AstralDateTimePicker from '../../components/DateTimePicker';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

const FRAME_W = 430;
const FRAME_H = 932;

const POS = {
  header: {
    height: 56,
    horizontalPadding: 16,
  },
  actionButton: { left: 24, top: 818, w: 382, h: 60, radius: 58 },
  homeIndicator: { left: 145, top: 920, w: 140, h: 4 },
};

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

export default function OnboardingFourthScreen({ navigation }: Props) {
  const scale = useMemo(() => SCREEN_W / FRAME_W, []);

  const storedBirthTime = useOnboardingStore((s) => s.data.birthTime);
  const setBirthTimeInStore = useOnboardingStore((s) => s.setBirthTime);

  const [timeValue, setTimeValue] = useState<string>(() => {
    if (storedBirthTime) {
      const h = String(storedBirthTime.hour).padStart(2, '0');
      const m = String(storedBirthTime.minute).padStart(2, '0');
      return `${h}:${m}`;
    }
    // Дефолт — 12:00
    return '12:00';
  });

  const anim = useSharedValue(0);
  React.useEffect(() => {
    anim.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const goBack = () => navigation.goBack();

  const onNext = () => {
    // timeValue формат "HH:MM"
    const [hoursStr, minutesStr] = timeValue.split(':');
    const hour = Math.max(0, Math.min(23, parseInt(hoursStr || '0', 10)));
    const minute = Math.max(0, Math.min(59, parseInt(minutesStr || '0', 10)));
    setBirthTimeInStore({ hour, minute });

    // Следующий шаг онбординга (плейсхолдер). Если будет Onboarding4 — сюда.
    navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { transform: [{ scale }] }]}>
        {/* Основной космический градиент */}
        <LinearGradient
          colors={['#16082a', '#0d0518', '#0a0312', '#000000']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fullBg}
        />

        {/* Фиолетовый акцентный градиент сверху */}
        <LinearGradient
          colors={['#6F1F85', 'rgba(111,31,133,0.5)', 'rgba(111,31,133,0)']}
          locations={[0, 0.2, 0.5]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientOverlay}
        />

        {/* Звёзды */}
        {STARS.map((p, idx) => {
          const size = idx % 3 === 0 ? 3 : idx % 5 === 0 ? 2 : 4;
          const opacity = idx % 4 === 0 ? 0.5 : idx % 3 === 0 ? 0.2 : 0.3;
          return (
            <View
              key={`star-${idx}`}
              style={[
                styles.star,
                {
                  left: p.x,
                  top: p.y,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  opacity: opacity,
                },
              ]}
            />
          );
        })}

        {/* Хедер */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            style={styles.backWrap}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Время рождения</Text>

          <Text style={styles.headerStep} numberOfLines={1}>
            3/3
          </Text>
        </View>

        {/* Описание */}
        <View style={[styles.centerTextWrap, { top: 160 }]}>
          <Text style={styles.centerText}>
            Укажите время рождения — это улучшит точность расчётов.
          </Text>
        </View>

        {/* Ввод времени — reanimated инпут с нативным DateTimePicker */}
        <View style={[styles.timeInputWrap, { top: 240 }]}>
          <AstralDateTimePicker
            value={timeValue}
            onChangeText={setTimeValue}
            placeholder="Время рождения"
            icon="time-outline"
            mode="time"
            required={true}
            animationValue={anim}
          />
        </View>

        {/* CTA */}
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

        {/* Home indicator */}
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
    backgroundColor: '#D9D9D9',
  },
  headerRow: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    height: POS.header.height,
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
  timeInputWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
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
