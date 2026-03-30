// src/components/auth/AuthLayout.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CosmicBackground from '../shared/CosmicBackground';
import { AUTH_COLORS } from '../../constants/auth.constants';
import { useIsFocused } from '@react-navigation/native';

interface AuthLayoutProps {
  children: ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  edges = ['top', 'bottom'],
}) => {
  const isFocused = useIsFocused();
  return (
    <View style={styles.root}>
      <CosmicBackground active={isFocused} />
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
