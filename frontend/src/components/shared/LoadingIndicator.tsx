import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { commonStyles } from '../../styles/commonStyles';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
}

/**
 * LoadingIndicator - простой индикатор загрузки
 * Для скелетонов виджетов используйте SkeletonLoader
 */
export default function LoadingIndicator({
  size = 'large',
  color = theme.colors.primary,
}: LoadingIndicatorProps) {
  return (
    <View style={[commonStyles.loadingContainer, styles.container]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
});
