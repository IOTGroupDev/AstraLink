import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface AstralTimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  animationValue?: any;
  visible?: boolean;
}

const AstralTimePicker: React.FC<AstralTimePickerProps> = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  visible = true,
}) => {
  // Create a Date object from hour and minute
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(selectedHour);
    d.setMinutes(selectedMinute);
    return d;
  });

  const onChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      onHourChange(selectedDate.getHours());
      onMinuteChange(selectedDate.getMinutes());
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <DateTimePicker
        value={date}
        mode="time"
        is24Hour={true}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={onChange}
        textColor="#FFFFFF"
        themeVariant="dark"
        locale="ru-RU"
        style={styles.picker}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 'auto',
  },
});

export default AstralTimePicker;
