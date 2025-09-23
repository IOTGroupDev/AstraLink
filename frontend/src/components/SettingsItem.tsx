import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  type?: 'button' | 'toggle';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  icon,
  type = 'button',
  value = false,
  onPress,
  onToggle,
  danger = false,
}) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (type === 'button' && onPress) {
      scale.value = withSpring(0.95, { damping: 8, stiffness: 100 }, () => {
        scale.value = withSpring(1, { damping: 8, stiffness: 100 });
      });
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = danger ? '#EF4444' : '#8B5CF6';
  const textColor = danger ? '#EF4444' : '#fff';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.item}
      >
        <TouchableOpacity
          onPress={handlePress}
          disabled={type === 'toggle'}
          style={styles.content}
          activeOpacity={0.7}
        >
          <View style={styles.leftContent}>
            {icon && (
              <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={24} color={iconColor} />
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
              {subtitle && (
                <Text style={styles.subtitle}>{subtitle}</Text>
              )}
            </View>
          </View>

          <View style={styles.rightContent}>
            {type === 'toggle' ? (
              <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={value ? '#fff' : '#9CA3AF'}
                ios_backgroundColor="#374151"
              />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  item: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  rightContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsItem;
