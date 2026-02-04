// src/components/ScreenWrapper.tsx
// Используйте этот wrapper для тяжелых экранов, чтобы избежать белых/черных экранов

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  showLoader?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  backgroundColor = '#0F172A',
  showLoader = true,
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Небольшая задержка для монтирования экрана
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {!isReady && showLoader ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Пример использования в ваших тяжелых экранах:
//
// import { ScreenWrapper } from '../components/ScreenWrapper';
//
// export default function CosmicSimulatorScreen() {
//   return (
//     <ScreenWrapper>
//       {/* Ваш контент экрана */}
//     </ScreenWrapper>
//   );
// }
