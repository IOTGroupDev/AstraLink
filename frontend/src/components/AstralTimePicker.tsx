import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

interface AstralTimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  animationValue?: any;
  visible?: boolean;
}

// Генерация массивов для часов и минут
const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);

// Компонент для отображения элемента
interface WheelItemProps {
  value: number;
  isSelected: boolean;
  index: number;
  selectedIndex: number;
  label?: string;
}

const WheelItem: React.FC<WheelItemProps> = ({
  value,
  isSelected,
  index,
  selectedIndex,
  label,
}) => {
  const distance = Math.abs(index - selectedIndex);

  // Прозрачность: активный = 1, соседи = 0.5, дальше = 0.3
  const opacity =
    distance === 0 ? 1 : distance === 1 ? 0.5 : distance === 2 ? 0.3 : 0.2;

  // Размер шрифта: активный = 24, соседи = 20, дальше постепенно уменьшается
  const fontSize =
    distance === 0 ? 24 : distance === 1 ? 18 : distance === 2 ? 18 : 14;

  return (
    <View style={styles.wheelItem}>
      <Text
        style={[
          styles.wheelText,
          isSelected && styles.wheelTextSelected,
          { opacity, fontSize },
        ]}
      >
        {value.toString().padStart(2, '0')}
        {isSelected && label && <Text style={styles.wheelLabel}> {label}</Text>}
      </Text>
    </View>
  );
};

const AstralTimePicker: React.FC<AstralTimePickerProps> = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  visible = true,
}) => {
  const hourListRef = useRef<FlatList>(null);
  const minuteListRef = useRef<FlatList>(null);

  // Прокрутка к выбранному значению при монтировании
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        hourListRef.current?.scrollToOffset({
          offset: selectedHour * ITEM_HEIGHT,
          animated: false,
        });
        minuteListRef.current?.scrollToOffset({
          offset: selectedMinute * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible]);

  // Обработка прокрутки часов
  const handleHourMomentumScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (index >= 0 && index < hours.length && index !== selectedHour) {
      onHourChange(index);
    }
  };

  // Обработка прокрутки минут
  const handleMinuteMomentumScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (index >= 0 && index < minutes.length && index !== selectedMinute) {
      onMinuteChange(index);
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
      {/* Подсветка выбранного элемента */}
      <View style={styles.selectionOverlay} />

      <View style={styles.wheelContainer}>
        {/* Часы */}
        <View style={styles.wheel}>
          <FlatList
            ref={hourListRef}
            data={hours}
            keyExtractor={(item) => `hour-${item}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleHourMomentumScrollEnd}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            contentContainerStyle={{
              paddingVertical: ITEM_HEIGHT * 2,
            }}
            renderItem={({ item, index }) => (
              <WheelItem
                value={item}
                isSelected={item === selectedHour}
                index={index}
                selectedIndex={selectedHour}
                label="часов"
              />
            )}
          />
        </View>

        {/* Разделитель */}
        <Text style={styles.separator}>:</Text>

        {/* Минуты */}
        <View style={styles.wheel}>
          <FlatList
            ref={minuteListRef}
            data={minutes}
            keyExtractor={(item) => `minute-${item}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleMinuteMomentumScrollEnd}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            contentContainerStyle={{
              paddingVertical: ITEM_HEIGHT * 2,
            }}
            renderItem={({ item, index }) => (
              <WheelItem
                value={item}
                isSelected={item === selectedMinute}
                index={index}
                selectedIndex={selectedMinute}
                label="минут"
              />
            )}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH * 0.85,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    alignSelf: 'center',
    position: 'relative',
  },
  wheelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  wheel: {
    width: 120,
    height: '100%',
    overflow: 'hidden',
  },
  separator: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
    marginHorizontal: 16,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    fontFamily: 'Montserrat_400Regular',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wheelTextSelected: {
    fontFamily: 'Montserrat_600SemiBold',
  },
  wheelLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: -1,
  },
});

export default AstralTimePicker;
