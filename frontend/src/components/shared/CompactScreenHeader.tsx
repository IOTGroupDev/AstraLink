import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface CompactScreenHeaderProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const CompactScreenHeader: React.FC<CompactScreenHeaderProps> = ({
  title,
  description,
  icon,
  style,
}) => {
  const resolvedIcon = React.isValidElement<{ size?: number }>(icon)
    ? React.cloneElement(icon, {
        size:
          typeof icon.props.size === 'number'
            ? Math.round(icon.props.size * 1.4)
            : undefined,
      })
    : icon;

  return (
    <BlurView intensity={10} tint="dark" style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>{resolvedIcon}</View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {!!description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 21,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CompactScreenHeader;
