// import React, { useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import { useOnboardingStore } from '../../stores/onboarding.store';
// import { useZodiac } from '../../hooks/useZodiac';
// import { ZodiacConstellationSvg } from '../../components/svg/zodiac/zodiacSvgMap';
// import CosmicBackground from '../../components/shared/CosmicBackground';
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
//   constellation: { top: 140, height: 330 },
//   pillsRow: { left: 24, top: 500, gap: 16 },
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
// };
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
//   // Используем хук для получения всей информации о знаке
//   const { zodiacSign, dateRange, elementDescription } = useZodiac(day, month);
//
//   const goBack = () => navigation.goBack();
//   const onNext = () => navigation.navigate('Onboarding4');
//
//   return (
//     <View style={styles.root}>
//       <CosmicBackground />
//       {/* Созвездие */}
//       <View style={styles.constellationWrap}>
//         <ZodiacConstellationSvg
//           signKey={zodiacSign.key}
//           width={FRAME_W}
//           height={330}
//           opacity={0.95}
//         />
//       </View>
//
//       {/* Хедер */}
//       <View style={styles.headerRow}>
//         <TouchableOpacity
//           onPress={goBack}
//           accessibilityRole="button"
//           style={styles.backWrap}
//         >
//           <Text style={styles.backArrow}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Знак зодиака</Text>
//       </View>
//
//       {/* Пиллы */}
//       <View
//         style={[
//           styles.pillsRow,
//           {
//             left: POS.pillsRow.left,
//             top: POS.pillsRow.top,
//           },
//         ]}
//       >
//         <View style={styles.pill}>
//           <Text style={styles.pillText}>{zodiacSign.nameRu}</Text>
//         </View>
//         <View style={styles.pill}>
//           <Text style={styles.pillText}>{dateRange}</Text>
//         </View>
//         <View style={styles.pill}>
//           <Text style={styles.pillText}>{zodiacSign.elementRu}</Text>
//         </View>
//       </View>
//
//       {/* Описание */}
//       <View style={styles.descriptionBlock}>
//         <Text style={styles.descriptionText}>
//           {zodiacSign.shortDescription}
//         </Text>
//         <Text style={[styles.descriptionText, { marginTop: 12 }]}>
//           Далее мы дополним картину данными о времени и месте рождения для
//           построения полной натальной карты.
//         </Text>
//       </View>
//
//       {/* Кнопка */}
//       <TouchableOpacity
//         activeOpacity={0.9}
//         onPress={onNext}
//         style={[
//           styles.actionButton,
//           {
//             left: POS.actionButton.left,
//             top: POS.actionButton.top,
//             width: POS.actionButton.w,
//             height: POS.actionButton.h,
//             borderRadius: POS.actionButton.radius,
//           },
//         ]}
//       >
//         <Text style={styles.ctaText}>ДАЛЕЕ</Text>
//       </TouchableOpacity>
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
//   headerRow: {
//     position: 'absolute',
//     top: 60,
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
//   constellationWrap: {
//     position: 'absolute',
//     left: 0,
//     top: 140,
//     width: FRAME_W,
//     height: 330,
//   },
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
//   descriptionBlock: {
//     position: 'absolute',
//     left: 24,
//     right: 24,
//     top: 560,
//   },
//   descriptionText: {
//     color: COLORS.text,
//     opacity: 0.9,
//     fontSize: TYPE.body.fontSize,
//     lineHeight: TYPE.body.lineHeight,
//     fontFamily: TYPE.body.fontFamily,
//     textAlign: 'left',
//   },
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

// src/screens/onboarding/OnboardingThirdScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { ZodiacConstellationSvg } from '../../components/svg/zodiac/zodiacSvgMap';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useZodiac } from '../../hooks/useZodiac';
import { theme } from '../../styles/theme';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
  FRAME,
} from '../../constants/onboarding.constants';

type RootStackParamList = {
  Onboarding3: undefined;
  Onboarding4: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding3'
>;

export default function OnboardingThirdScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const birthDate = useOnboardingStore((s) => s.data.birthDate);
  const day = birthDate?.day ?? 1;
  const month = birthDate?.month ?? 1;
  const { zodiacSign, dateRange } = useZodiac(day, month);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNext = useCallback(() => {
    navigation.navigate('Onboarding4');
  }, [navigation]);

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader title={t('onboarding.third.header')} onBack={handleBack} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.constellationContainer}>
            <ZodiacConstellationSvg
              signKey={zodiacSign.key}
              width={FRAME.WIDTH}
              height={330}
              opacity={0.95}
            />
          </View>

          <View style={styles.pillsRow}>
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

          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>
              {zodiacSign.shortDescription}
            </Text>
            <Text style={[styles.descriptionText, styles.additionalDescription]}>
              {t('onboarding.third.description')}
            </Text>
          </View>
        </ScrollView>

        <OnboardingButton title={t('onboarding.button.next')} onPress={handleNext} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    paddingBottom: theme.spacing.xxxl * 4.375, // 140px (32 * 4.375)
  },
  constellationContainer: {
    height: 330,
    marginTop: theme.spacing.lg, // 20px
    marginBottom: theme.spacing.lg, // 20px
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm, // 10px (близко к 8px)
    marginBottom: theme.spacing.xl * 1.25, // 30px (24 * 1.25)
  },
  pill: {
    paddingHorizontal: theme.spacing.lg - 2, // 18px (20 - 2)
    paddingVertical: theme.spacing.sm, // 10px (близко к 8px)
    borderRadius: theme.spacing.xl, // 24px
    borderWidth: 1,
    borderColor: ONBOARDING_COLORS.pillBorder,
    backgroundColor: ONBOARDING_COLORS.pillBg,
  },
  pillText: {
    color: ONBOARDING_COLORS.text,
    fontSize: theme.fontSizes.sm, // 12px
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 0.5,
  },
  descriptionBlock: {
    marginBottom: theme.spacing.lg, // 20px
  },
  descriptionText: {
    color: ONBOARDING_COLORS.text,
    opacity: 0.9,
    ...ONBOARDING_TYPOGRAPHY.body,
    textAlign: 'left',
  },
  additionalDescription: {
    marginTop: theme.spacing.md, // 12px
  },
});
