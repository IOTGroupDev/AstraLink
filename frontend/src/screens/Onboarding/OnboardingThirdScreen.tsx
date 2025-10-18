// // frontend/src/screens/OnboardingThirdScreen.tsx
// // Шаг 2/3 — Знак зодиака. Показывает знак по введённой дате рождения, диапазон дат и описание.
// // Визуально и композиционно согласован с Onboarding2/4, использует общий космический фон.
// import React, { useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useOnboardingStore } from '../../stores/onboarding.store';
//
// const { width: SCREEN_W } = Dimensions.get('window');
//
// const FRAME_W = 430;
// const FRAME_H = 932;
//
// const POS = {
//   header: {
//     height: 56,
//     horizontalPadding: 16,
//   },
//   pillsRow: { left: 24, top: 640, gap: 16 },
//   actionButton: { left: 24, top: 818, w: 382, h: 60, radius: 58 },
//   homeIndicator: { left: 145, top: 920, w: 140, h: 4 },
// };
//
// const COLORS = {
//   bg: '#101010',
//   text: '#FFFFFF',
//   textDim: 'rgba(255,255,255,0.75)',
//   btnBg: '#ECECEC',
//   btnText: '#000000',
//   pillBorder: 'rgba(255,255,255,0.35)',
// };
//
// const TYPE = {
//   h1: { fontSize: 24, lineHeight: 28, fontFamily: 'Montserrat_600SemiBold' },
//   body: { fontSize: 19, lineHeight: 28, fontFamily: 'Montserrat_400Regular' },
//   cta: { fontSize: 20, lineHeight: 24, fontFamily: 'Montserrat_500Medium' },
//   step: { fontSize: 20, lineHeight: 28, fontFamily: 'Montserrat_400Regular' },
// };
//
// const RU_MONTHS_3 = [
//   'ЯНВ',
//   'ФЕВ',
//   'МАР',
//   'АПР',
//   'МАЙ',
//   'ИЮН',
//   'ИЮЛ',
//   'АВГ',
//   'СЕН',
//   'ОКТ',
//   'НОЯ',
//   'ДЕК',
// ] as const;
//
// type RU_SIGN =
//   | 'ОВЕН'
//   | 'ТЕЛЕЦ'
//   | 'БЛИЗНЕЦЫ'
//   | 'РАК'
//   | 'ЛЕВ'
//   | 'ДЕВА'
//   | 'ВЕСЫ'
//   | 'СКОРПИОН'
//   | 'СТРЕЛЕЦ'
//   | 'КОЗЕРОГ'
//   | 'ВОДОЛЕЙ'
//   | 'РЫБЫ';
//
// interface ZodiacMeta {
//   ru: RU_SIGN;
//   start: { m: number; d: number }; // 1-based месяц
//   end: { m: number; d: number };
// }
//
// // Классические диапазоны знаков (тропический зодиак)
// const ZODIAC: ZodiacMeta[] = [
//   { ru: 'ОВЕН', start: { m: 3, d: 21 }, end: { m: 4, d: 19 } },
//   { ru: 'ТЕЛЕЦ', start: { m: 4, d: 20 }, end: { m: 5, d: 20 } },
//   { ru: 'БЛИЗНЕЦЫ', start: { m: 5, d: 21 }, end: { m: 6, d: 20 } },
//   { ru: 'РАК', start: { m: 6, d: 21 }, end: { m: 7, d: 22 } },
//   { ru: 'ЛЕВ', start: { m: 7, d: 23 }, end: { m: 8, d: 22 } },
//   { ru: 'ДЕВА', start: { m: 8, d: 23 }, end: { m: 9, d: 22 } },
//   { ru: 'ВЕСЫ', start: { m: 9, d: 23 }, end: { m: 10, d: 22 } },
//   { ru: 'СКОРПИОН', start: { m: 10, d: 23 }, end: { m: 11, d: 21 } },
//   { ru: 'СТРЕЛЕЦ', start: { m: 11, d: 22 }, end: { m: 12, d: 21 } },
//   { ru: 'КОЗЕРОГ', start: { m: 12, d: 22 }, end: { m: 1, d: 19 } },
//   { ru: 'ВОДОЛЕЙ', start: { m: 1, d: 20 }, end: { m: 2, d: 18 } },
//   { ru: 'РЫБЫ', start: { m: 2, d: 19 }, end: { m: 3, d: 20 } },
// ];
//
// function inRange(
//   month: number,
//   day: number,
//   start: { m: number; d: number },
//   end: { m: number; d: number }
// ) {
//   // Диапазон может "переваливать" через новый год (КОЗЕРОГ)
//   if (start.m === end.m) {
//     return month === start.m && day >= start.d && day <= end.d;
//   }
//   if (start.m < end.m) {
//     // Обычный диапазон в пределах года
//     if (month < start.m || month > end.m) return false;
//     if (month === start.m && day < start.d) return false;
//     if (month === end.m && day > end.d) return false;
//     return true;
//   }
//   // Диапазон через декабрь→январь
//   // true если дата >= старт ИЛИ дата <= конец
//   if (
//     month > start.m ||
//     (month === start.m && day >= start.d) ||
//     month < end.m ||
//     (month === end.m && day <= end.d)
//   ) {
//     return true;
//   }
//   return false;
// }
//
// function getZodiacByDate(day: number, month: number): ZodiacMeta {
//   // month — 1..12
//   for (const z of ZODIAC) {
//     if (inRange(month, day, z.start, z.end)) return z;
//   }
//   // fallback (не должно случиться)
//   return ZODIAC[0];
// }
//
// function formatRangeRu(z: ZodiacMeta): string {
//   const s = `${String(z.start.d).padStart(2, '0')} ${RU_MONTHS_3[z.start.m - 1]}`;
//   const e = `${String(z.end.d).padStart(2, '0')} ${RU_MONTHS_3[z.end.m - 1]}`;
//   return `${s} - ${e}`;
// }
//
// interface Props {
//   navigation: {
//     navigate: (screen: string) => void;
//     goBack: () => void;
//   };
// }
//
// export default function OnboardingThirdScreen({ navigation }: Props) {
//   const scale = useMemo(() => SCREEN_W / FRAME_W, []);
//
//   const birthDate = useOnboardingStore((s) => s.data.birthDate);
//   const day = birthDate?.day ?? 1;
//   const month = birthDate?.month ?? 1;
//
//   const zodiac = getZodiacByDate(day, month);
//   const rangeText = formatRangeRu(zodiac);
//
//   const goBack = () => navigation.goBack();
//   const onNext = () => navigation.navigate('Onboarding4');
//
//   return (
//     <View style={styles.root}>
//       <View style={[styles.frame, { transform: [{ scale }] }]}>
//         {/* Основной фон-градиент */}
//         <LinearGradient
//           colors={['#16082a', '#0d0518', '#0a0312', '#000000']}
//           locations={[0, 0.3, 0.7, 1]}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={styles.fullBg}
//         />
//
//         {/* Лёгкая фиолетовая вуаль сверху */}
//         <LinearGradient
//           colors={['#6F1F85', 'rgba(111,31,133,0.5)', 'rgba(111,31,133,0)']}
//           locations={[0, 0.2, 0.5]}
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={styles.gradientOverlay}
//         />
//
//         {/* Специфическое созвездие для знака (пример: Близнецы) */}
//         <View style={styles.constellationStubWrap}>
//           {/*<ConstellationGeminiSvg*/}
//           {/*  width={FRAME_W}*/}
//           {/*  height={500}*/}
//           {/*  style={styles.constellationSvg}*/}
//           {/*  opacity={0.95}*/}
//           {/*/>*/}
//         </View>
//
//         {/* Хедер */}
//         <View style={styles.headerRow}>
//           <TouchableOpacity
//             onPress={goBack}
//             accessibilityRole="button"
//             style={styles.backWrap}
//           >
//             <Text style={styles.backArrow}>←</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Знак зодиака</Text>
//         </View>
//         {/* Пиллы со значением */}
//         <View
//           style={[
//             styles.pillsRow,
//             {
//               left: POS.pillsRow.left,
//               top: POS.pillsRow.top,
//             },
//           ]}
//         >
//           <View style={styles.pill}>
//             <Text style={styles.pillText}>{zodiac.ru}</Text>
//           </View>
//           <View style={styles.pill}>
//             <Text style={styles.pillText}>{rangeText}</Text>
//           </View>
//         </View>
//
//         {/* Описание */}
//         <View style={styles.descriptionBlock}>
//           <Text style={styles.descriptionText}>
//             {`Ваш солнечный знак — ${zodiac.ru}. Это базовый вектор личности,\nисточник мотивации и силы. `}
//           </Text>
//           <Text style={[styles.descriptionText, { marginTop: 12 }]}>
//             {'Далее мы дополним картину данными о времени и месте рождения.'}
//           </Text>
//         </View>
//
//         {/* CTA */}
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={onNext}
//           style={[
//             styles.actionButton,
//             {
//               left: POS.actionButton.left,
//               top: POS.actionButton.top,
//               width: POS.actionButton.w,
//               height: POS.actionButton.h,
//               borderRadius: POS.actionButton.radius,
//             },
//           ]}
//         >
//           <Text style={styles.ctaText}>ДАЛЕЕ</Text>
//         </TouchableOpacity>
//
//         {/* Home indicator */}
//         <View
//           style={[
//             styles.homeIndicator,
//             {
//               left: POS.homeIndicator.left,
//               top: POS.homeIndicator.top,
//               width: POS.homeIndicator.w,
//               height: POS.homeIndicator.h,
//             },
//           ]}
//         />
//       </View>
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({
//   root: {
//     flex: 1,
//     backgroundColor: COLORS.bg,
//     alignItems: 'center',
//     justifyContent: 'flex-start',
//   },
//   frame: {
//     width: FRAME_W,
//     height: FRAME_H,
//     backgroundColor: COLORS.bg,
//     borderRadius: 60,
//     overflow: 'hidden',
//   },
//   fullBg: {
//     position: 'absolute',
//     left: 0,
//     top: 0,
//     width: FRAME_W,
//     height: FRAME_H,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     left: 0,
//     top: 0,
//     width: FRAME_W,
//     height: FRAME_H,
//     opacity: 0.3,
//   },
//   headerRow: {
//     position: 'absolute',
//     top: 79,
//     left: 24,
//     right: 24,
//     height: POS.header.height,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   backWrap: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   backArrow: {
//     color: COLORS.text,
//     fontSize: 28,
//     lineHeight: 36,
//   },
//   headerTitle: {
//     flex: 1,
//     textAlign: 'center',
//     color: COLORS.text,
//     fontSize: TYPE.h1.fontSize,
//     lineHeight: TYPE.h1.lineHeight,
//     fontFamily: TYPE.h1.fontFamily,
//   },
//
//   constellationStubWrap: {
//     position: 'absolute',
//     left: 0,
//     top: 110,
//     width: FRAME_W,
//     height: 500,
//     opacity: 0.95,
//   },
//   star: {
//     position: 'absolute',
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#FFFFFF',
//     shadowOpacity: 0.7,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 0 },
//   },
//   line: {
//     position: 'absolute',
//     width: 2,
//     backgroundColor: '#FFFFFF',
//     opacity: 0.8,
//     borderRadius: 2,
//   },
//   diagLine: {
//     position: 'absolute',
//     height: 2,
//     backgroundColor: '#FFFFFF',
//     opacity: 0.8,
//     borderRadius: 2,
//     transform: [{ rotate: '210deg' }],
//   },
//   diagLineRev: {
//     position: 'absolute',
//     height: 2,
//     backgroundColor: '#FFFFFF',
//     opacity: 0.8,
//     borderRadius: 2,
//     transform: [{ rotate: '330deg' }],
//   },
//
//   pillsRow: {
//     position: 'absolute',
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 16,
//   },
//   pill: {
//     paddingHorizontal: 18,
//     paddingVertical: 10,
//     borderRadius: 24,
//     borderWidth: 1,
//     borderColor: COLORS.pillBorder,
//     backgroundColor: 'rgba(255,255,255,0.05)',
//   },
//   pillText: {
//     color: COLORS.text,
//     fontSize: 16,
//     fontFamily: 'Montserrat_500Medium',
//     letterSpacing: 0.5,
//   },
//
//   descriptionBlock: {
//     position: 'absolute',
//     left: 24,
//     right: 24,
//     top: 700,
//   },
//   descriptionText: {
//     color: COLORS.text,
//     opacity: 0.9,
//     fontSize: TYPE.body.fontSize,
//     lineHeight: TYPE.body.lineHeight,
//     fontFamily: TYPE.body.fontFamily,
//     textAlign: 'left',
//   },
//
//   actionButton: {
//     position: 'absolute',
//     backgroundColor: COLORS.btnBg,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   ctaText: {
//     color: COLORS.btnText,
//     textTransform: 'uppercase',
//     fontSize: TYPE.cta.fontSize,
//     lineHeight: TYPE.cta.lineHeight,
//     fontFamily: TYPE.cta.fontFamily,
//   },
//   homeIndicator: {
//     position: 'absolute',
//     borderRadius: 4,
//     backgroundColor: COLORS.text,
//   },
// });

// frontend/src/screens/OnboardingThirdScreen.tsx
// УПРОЩЁННАЯ ВЕРСИЯ с использованием хука useZodiac

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useZodiac } from '../../hooks/useZodiac';
import { ZodiacConstellationSvg } from '../../components/zodiac/zodiacSvgMap';
import { StarfieldBackground } from '../../components/zodiac/StarfieldBackground';

const { width: SCREEN_W } = Dimensions.get('window');

const FRAME_W = 430;
const FRAME_H = 932;

const POS = {
  header: {
    height: 56,
    horizontalPadding: 16,
  },
  constellation: { top: 140, height: 330 },
  pillsRow: { left: 24, top: 500, gap: 16 },
  actionButton: { left: 24, top: 818, w: 382, h: 60, radius: 58 },
  homeIndicator: { left: 145, top: 920, w: 140, h: 4 },
};

const COLORS = {
  bg: '#101010',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.75)',
  btnBg: '#ECECEC',
  btnText: '#000000',
  pillBorder: 'rgba(255,255,255,0.35)',
};

const TYPE = {
  h1: { fontSize: 24, lineHeight: 28, fontFamily: 'Montserrat_600SemiBold' },
  body: { fontSize: 19, lineHeight: 28, fontFamily: 'Montserrat_400Regular' },
  cta: { fontSize: 20, lineHeight: 24, fontFamily: 'Montserrat_500Medium' },
};

interface Props {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function OnboardingThirdScreen({ navigation }: Props) {
  const scale = useMemo(() => SCREEN_W / FRAME_W, []);

  const birthDate = useOnboardingStore((s) => s.data.birthDate);
  const day = birthDate?.day ?? 1;
  const month = birthDate?.month ?? 1;

  // Используем хук для получения всей информации о знаке
  const { zodiacSign, dateRange, elementDescription } = useZodiac(day, month);

  const goBack = () => navigation.goBack();
  const onNext = () => navigation.navigate('Onboarding4');

  return (
    <View style={styles.root}>
      <View style={[styles.frame, { transform: [{ scale }] }]}>
        {/* Оптимизированный фон со звёздами */}
        <StarfieldBackground width={FRAME_W} height={FRAME_H} starCount={80} />

        {/* Созвездие */}
        <View style={styles.constellationWrap}>
          <ZodiacConstellationSvg
            signKey={zodiacSign.key}
            width={FRAME_W}
            height={330}
            opacity={0.95}
          />
        </View>

        {/* Хедер */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            style={styles.backWrap}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Знак зодиака</Text>
        </View>

        {/* Пиллы */}
        <View
          style={[
            styles.pillsRow,
            {
              left: POS.pillsRow.left,
              top: POS.pillsRow.top,
            },
          ]}
        >
          <View style={styles.pill}>
            <Text style={styles.pillText}>{zodiacSign.nameRu}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{dateRange}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{zodiacSign.elementRu}</Text>
          </View>
        </View>

        {/* Описание */}
        <View style={styles.descriptionBlock}>
          <Text style={styles.descriptionText}>
            {zodiacSign.shortDescription}
          </Text>
          <Text style={[styles.descriptionText, { marginTop: 12 }]}>
            Далее мы дополним картину данными о времени и месте рождения для
            построения полной натальной карты.
          </Text>
        </View>

        {/* Кнопка */}
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
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    fontFamily: TYPE.h1.fontFamily,
  },
  constellationWrap: {
    position: 'absolute',
    left: 0,
    top: 140,
    width: FRAME_W,
    height: 330,
  },
  pillsRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 0.5,
  },
  descriptionBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 560,
  },
  descriptionText: {
    color: COLORS.text,
    opacity: 0.9,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    fontFamily: TYPE.body.fontFamily,
    textAlign: 'left',
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
