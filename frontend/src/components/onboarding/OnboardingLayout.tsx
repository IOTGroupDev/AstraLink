// // src/components/onboarding/OnboardingLayout.tsx
// import React, { ReactNode } from 'react';
// import { View, StyleSheet } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import CosmicBackground from '../shared/CosmicBackground';
// import { ONBOARDING_COLORS } from './constants/onboarding.constants';
//
// interface OnboardingLayoutProps {
//   children: ReactNode;
//   edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
// }
//
// export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
//                                                                     children,
//                                                                     edges = ['top', 'bottom'],
//                                                                   }) => {
//   return (
//     <View style={styles.root}>
//       <CosmicBackground />
//       <SafeAreaView style={styles.safeArea} edges={edges}>
//         {children}
//       </SafeAreaView>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   root: {
//     flex: 1,
//     backgroundColor: ONBOARDING_COLORS.bg,
//   },
//   safeArea: {
//     flex: 1,
//   },
// });

// src/components/onboarding/OnboardingLayout.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import CosmicBackground from '../shared/CosmicBackground';
import { ONBOARDING_COLORS } from '../../constants/onboarding.constants';

interface OnboardingLayoutProps {
  children: ReactNode;
  /**
   * По умолчанию не включаем 'bottom', чтобы не было двойных отступов
   * при фиксированной CTA-кнопке. Если экран без фикс-кнопки — можно передать
   * edges={['top','bottom','left','right']} из экрана.
   */
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  edges = ['top', 'left', 'right'],
}) => {
  return (
    <View style={styles.root}>
      {/* Light status bar for dark background */}
      <StatusBar style="light" />
      {/* Фон под контентом */}
      <CosmicBackground />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONBOARDING_COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
});
