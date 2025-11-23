// src/components/auth/AuthLayout.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CosmicBackground from '../shared/CosmicBackground';
import { AUTH_COLORS } from '../../constants/auth.constants';

interface AuthLayoutProps {
  children: ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  edges = ['top', 'bottom'],
}) => {
  return (
    <View style={styles.root}>
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
    backgroundColor: AUTH_COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
});
