// // src/components/onboarding/OnboardingButton.tsx
// import React from 'react';
// import { Text, StyleSheet, TouchableOpacity } from 'react-native';
// import {
//   ONBOARDING_COLORS,
//   ONBOARDING_TYPOGRAPHY,
//   ONBOARDING_LAYOUT,
// } from './constants/onboarding.constants';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
//
// interface OnboardingButtonProps {
//   title: string;
//   onPress: () => void;
//   disabled?: boolean;
//   isFixed?: boolean;
// }
//
// export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
//                                                                     title,
//                                                                     onPress,
//                                                                     disabled = false,
//                                                                     isFixed = true,
//                                                                   }) => {
//   const insets = useSafeAreaInsets();
//
//   const buttonStyle = isFixed
//     ? [
//       styles.button,
//       styles.buttonFixed,
//       {
//         bottom: ONBOARDING_LAYOUT.buttonBottomOffset + insets.bottom,
//       },
//       disabled && styles.buttonDisabled,
//     ]
//     : [styles.button, disabled && styles.buttonDisabled];
//
//   return (
//     <TouchableOpacity
//       style={buttonStyle}
//       onPress={onPress}
//       activeOpacity={0.8}
//       disabled={disabled}
//     >
//       <Text style={styles.buttonText}>{title}</Text>
//     </TouchableOpacity>
//   );
// };
//
// const styles = StyleSheet.create({
//   button: {
//     height: ONBOARDING_LAYOUT.buttonHeight,
//     borderRadius: ONBOARDING_LAYOUT.buttonBorderRadius,
//     backgroundColor: ONBOARDING_COLORS.btnBg,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 28,
//   },
//   buttonFixed: {
//     position: 'absolute',
//     left: ONBOARDING_LAYOUT.horizontalPadding,
//     right: ONBOARDING_LAYOUT.horizontalPadding,
//   },
//   buttonDisabled: {
//     backgroundColor: ONBOARDING_COLORS.btnBgDisabled,
//   },
//   buttonText: {
//     color: ONBOARDING_COLORS.btnText,
//     textTransform: 'uppercase',
//     ...ONBOARDING_TYPOGRAPHY.cta,
//   },
// });

// src/components/onboarding/OnboardingButton.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  FRAME,
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isFixed?: boolean; // если true — кнопка фиксируется у нижнего края
}

const S = FRAME.SCALE;

export default function OnboardingButton({
  title,
  onPress,
  disabled,
  isFixed = true,
}: OnboardingButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        isFixed && styles.buttonFixed,
        {
          bottom: ONBOARDING_LAYOUT.buttonBottomOffset * S + insets.bottom,
          height: ONBOARDING_LAYOUT.buttonHeight * S,
          borderRadius: ONBOARDING_LAYOUT.buttonBorderRadius * S,
          opacity: disabled ? 0.7 : 1,
        },
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: ONBOARDING_COLORS.btnBg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding * S,
  },
  buttonFixed: {
    position: 'absolute',
    left: ONBOARDING_LAYOUT.horizontalPadding * S,
    right: ONBOARDING_LAYOUT.horizontalPadding * S,
  },
  buttonText: {
    color: ONBOARDING_COLORS.btnText,
    textTransform: 'uppercase',
    ...ONBOARDING_TYPOGRAPHY.cta,
  },
});
