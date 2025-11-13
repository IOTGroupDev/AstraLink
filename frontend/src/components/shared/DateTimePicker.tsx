import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

interface DateTimePickerProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  mode: 'date' | 'time';
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  animationValue: Animated.SharedValue<number>;
}

const AstralDateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChangeText,
  placeholder,
  icon,
  mode,
  required = false,
  error = false,
  errorMessage,
  animationValue,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const labelAnimation = useSharedValue(0);
  const [date, setDate] = useState(() => {
    if (value) {
      if (mode === 'date') {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const year = parseInt(m[1], 10);
          const month = parseInt(m[2], 10) - 1;
          const day = parseInt(m[3], 10);
          return new Date(year, month, day);
        }
        return new Date(value);
      } else {
        const [hours, minutes] = value.split(':');
        const d = new Date();
        d.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
        return d;
      }
    }
    return new Date();
  });

  useEffect(() => {
    // Update date when value changes
    if (value) {
      if (mode === 'date') {
        // Безопасный парсинг YYYY-MM-DD (без сдвига таймзоны)
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const year = parseInt(m[1], 10);
          const month = parseInt(m[2], 10) - 1;
          const day = parseInt(m[3], 10);
          setDate(new Date(year, month, day));
        } else {
          // fallback
          setDate(new Date(value));
        }
      } else {
        const [hours, minutes] = value.split(':');
        const newDate = new Date();
        newDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
        setDate(newDate);
      }
    }

    // Update label animation (без Easing для совместимости)
    if (value) {
      labelAnimation.value = withTiming(1, { duration: 200 });
    } else {
      labelAnimation.value = withTiming(0, { duration: 200 });
    }
  }, [value]);

  const animatedInputStyle = useAnimatedStyle(() => {
    const scale = animationValue.value;
    const opacity = animationValue.value;

    return {
      transform: [{ scale }],
      opacity,
      borderColor: error ? '#FF6B6B' : 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1.5,
      borderRadius: 15,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingVertical: 20,
      paddingHorizontal: 20,
      minHeight: 80,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: error ? '#FF6B6B' : '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: error ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 5,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const scaleOuter = animationValue.value;
    const opacity = animationValue.value;
    const translateY = interpolate(labelAnimation.value, [0, 1], [0, -25]);
    const scaleInner = interpolate(labelAnimation.value, [0, 1], [1, 0.8]);
    const animatedColor = interpolateColor(
      labelAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.7)', 'rgba(139, 92, 246, 0.9)']
    );

    return {
      transform: [{ scale: scaleOuter }, { translateY }, { scale: scaleInner }],
      opacity,
      position: 'absolute',
      left: 20,
      top: 25,
      color: error ? '#FF6B6B' : (animatedColor as any),
      fontSize: interpolate(labelAnimation.value, [0, 1], [16, 12]),
      fontWeight: '500',
      zIndex: 1,
    };
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');

    if (selectedDate) {
      setDate(selectedDate);

      if (mode === 'date') {
        // Форматируем как YYYY-MM-DD по локальному времени (без UTC-сдвига)
        const y = selectedDate.getFullYear();
        const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const d = selectedDate.getDate().toString().padStart(2, '0');
        onChangeText(`${y}-${m}-${d}`);
      } else {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        onChangeText(formattedTime);
      }
    }
  };

  const formatDisplayValue = () => {
    if (!value) return '';

    if (mode === 'date') {
      // Проверяем формат YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const dateObj = new Date(value);
        return dateObj.toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
      return value; // Возвращаем как есть если неправильный формат
    } else {
      return value;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={animatedInputStyle}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#FF6B6B' : 'rgba(255, 255, 255, 0.6)'}
          />
        </View>

        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Animated.Text style={animatedLabelStyle}>
            {placeholder} {required && '*'}
          </Animated.Text>
          {value && (
            <Animated.Text
              style={[
                styles.inputText,
                {
                  marginTop: interpolate(labelAnimation.value, [0, 1], [0, 20]),
                },
              ]}
            >
              {formatDisplayValue()}
            </Animated.Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {showPicker && (
        <DateTimePicker
          value={date}
          mode={mode}
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
          locale="ru-RU"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 20,
    fontWeight: '500',
  },
});

export default AstralDateTimePicker;
