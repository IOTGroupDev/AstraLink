// // src/components/onboarding/OnboardingHeader.tsx
// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import ArrowBackSvg from '../svg/ArrowBackSvg';
// import {
//   ONBOARDING_COLORS,
//   ONBOARDING_TYPOGRAPHY,
//   ONBOARDING_LAYOUT,
// } from './constants/onboarding.constants';
//
// interface OnboardingHeaderProps {
//   title: string;
//   onBack?: () => void;
//   showStep?: boolean;
//   currentStep?: number;
//   totalSteps?: number;
// }
//
// export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
//                                                                     title,
//                                                                     onBack,
//                                                                     showStep = false,
//                                                                     currentStep,
//                                                                     totalSteps,
//                                                                   }) => {
//   return (
//     <View style={styles.header}>
//       <View style={styles.leftSection}>
//         {onBack && (
//           <TouchableOpacity
//             onPress={onBack}
//             style={styles.backButton}
//             activeOpacity={0.7}
//           >
//             <ArrowBackSvg width={36} height={36} />
//           </TouchableOpacity>
//         )}
//       </View>
//
//       <Text style={styles.title} numberOfLines={1}>
//         {title}
//       </Text>
//
//       <View style={styles.rightSection}>
//         {showStep && currentStep && totalSteps && (
//           <Text style={styles.stepText}>
//             {currentStep}/{totalSteps}
//           </Text>
//         )}
//       </View>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     height: ONBOARDING_LAYOUT.headerHeight,
//     paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
//     marginTop: ONBOARDING_LAYOUT.headerTopOffset,
//   },
//   leftSection: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'flex-start',
//   },
//   backButton: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     flex: 1,
//     textAlign: 'center',
//     color: ONBOARDING_COLORS.text,
//     ...ONBOARDING_TYPOGRAPHY.h1,
//   },
//   rightSection: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'flex-end',
//   },
//   stepText: {
//     color: ONBOARDING_COLORS.textDim70,
//     ...ONBOARDING_TYPOGRAPHY.step,
//   },
// });

// src/components/onboarding/OnboardingHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ArrowBackSvg from '../svg/ArrowBackSvg';
import {
  FRAME,
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from './constants/onboarding.constants';

interface OnboardingHeaderProps {
  title?: string;
  onBack?: () => void;
  showStep?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

const S = FRAME.SCALE;

export default function OnboardingHeader({
  title,
  onBack,
  showStep = false,
  currentStep,
  totalSteps,
}: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowBackSvg />
          </TouchableOpacity>
        ) : null}
      </View>

      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={styles.rightSection}>
        {showStep &&
        typeof currentStep === 'number' &&
        typeof totalSteps === 'number' ? (
          <Text style={styles.stepText}>
            {currentStep}/{totalSteps}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ONBOARDING_LAYOUT.headerHeight * S,
    marginTop: ONBOARDING_LAYOUT.headerTopOffset * S,
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding * S,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    width: 36 * S,
    height: 36 * S,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: ONBOARDING_COLORS.text,
    ...ONBOARDING_TYPOGRAPHY.h1,
  },
  rightSection: {
    width: 36 * S,
    height: 36 * S,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  stepText: {
    color: ONBOARDING_COLORS.textDim70,
    ...ONBOARDING_TYPOGRAPHY.step,
  },
});
