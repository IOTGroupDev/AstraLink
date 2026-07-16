// src/components/auth/AuthButton.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import LoadingIndicator from '../shared/LoadingIndicator';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        isDisabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {loading ? (
        <LoadingIndicator size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' && styles.buttonTextSecondary,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: AUTH_LAYOUT.buttonHeight,
    borderRadius: AUTH_LAYOUT.buttonRadius,
    backgroundColor: AUTH_COLORS.btnBg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  buttonSecondary: {
    backgroundColor: AUTH_COLORS.btnPrimary,
  },
  buttonDisabled: {
    backgroundColor: AUTH_COLORS.btnBgDisabled,
  },
  buttonText: {
    color: AUTH_COLORS.btnText,
    textTransform: 'uppercase',
    ...AUTH_TYPOGRAPHY.button,
  },
  buttonTextSecondary: {
    color: AUTH_COLORS.text,
  },
});
