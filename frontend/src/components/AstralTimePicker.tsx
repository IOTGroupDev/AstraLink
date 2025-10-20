// components/AstralTimePicker.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import WheelPicker from '@quidone/react-native-wheel-picker';

interface AstralTimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  animationValue: Animated.SharedValue<number>;
  visible?: boolean;
}

const AstralTimePicker: React.FC<AstralTimePickerProps> = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  animationValue,
  visible = true,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => ({ value: i }));
  const minutes = Array.from({ length: 60 }, (_, i) => ({ value: i }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(animationValue.value, [0, 1], [0.8, 1]) },
      { translateY: interpolate(animationValue.value, [0, 1], [50, 0]) },
    ],
    opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <View style={styles.pickerRow}>
          <WheelPicker
            data={hours}
            value={selectedHour}
            onValueChanged={({ item }) => onHourChange(item.value)}
            itemTextStyle={styles.pickerText}
            itemHeight={40}
            width={80}
            renderItem={({ item }) => (
              <Text style={styles.pickerText}>
                {item.value.toString().padStart(2, '0')}
              </Text>
            )}
          />
          <Text style={styles.separator}>:</Text>
          <WheelPicker
            data={minutes}
            value={selectedMinute}
            onValueChanged={({ item }) => onMinuteChange(item.value)}
            itemTextStyle={styles.pickerText}
            itemHeight={40}
            width={80}
            renderItem={({ item }) => (
              <Text style={styles.pickerText}>
                {item.value.toString().padStart(2, '0')}
              </Text>
            )}
          />
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 324,
    height: 174,
    marginVertical: 10,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 20,
  },
  pickerText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  separator: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    marginHorizontal: 10,
  },
});

export default AstralTimePicker;
