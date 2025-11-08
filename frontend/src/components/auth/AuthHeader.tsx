// src/components/auth/AuthHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

interface AuthHeaderProps {
  title: string;
  onBack?: () => void;
  disabled?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  onBack,
  disabled = false,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            disabled={disabled}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={AUTH_COLORS.textDim70}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.rightSection} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: AUTH_LAYOUT.headerHeight,
    paddingHorizontal: AUTH_LAYOUT.horizontalPadding,
    marginBottom: 12,
  },
  leftSection: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: AUTH_COLORS.text,
    ...AUTH_TYPOGRAPHY.title,
  },
  rightSection: {
    width: 36,
  },
});
