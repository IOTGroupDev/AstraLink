// frontend/src/components/DateWheelPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';

export type DateParts = { day: number; month: number; year: number };

export interface DateWheelPickerProps {
  value?: DateParts;
  minYear?: number;
  maxYear?: number;
  onChange?: (value: DateParts) => void;
  locale?: 'ru' | 'en';
  itemHeight?: number;
  visibleRows?: number;
  selectionStyle?: 'pill' | 'lines';
  selectionBackgroundColor?: string;
}

const RU_MONTHS_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
];

const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getItemVisualStyle(
  index: number,
  selectedIndex: number,
  padCount: number
) {
  const dist = Math.abs(index - selectedIndex);

  if (dist === 0) {
    return { opacity: 1, scale: 1 };
  }

  // Очень выраженный 3D эффект цилиндра с перспективой
  const t = dist / padCount; // 0 в центре, 1 на краях

  // Экспоненциальное уменьшение - элементы очень маленькие на краях
  const scale = Math.max(0.3, 1 - Math.pow(t, 1.2) * 0.7);

  // Сильное затухание
  const opacity = Math.max(0.15, 1 - Math.pow(t, 0.9) * 0.85);

  return { opacity, scale };
}

const DateWheelPicker: React.FC<DateWheelPickerProps> = (props) => {
  const {
    value,
    minYear = 1900,
    maxYear = new Date().getFullYear(),
    onChange,
    locale = 'en',
    itemHeight = 40,
    visibleRows = 7,
    selectionStyle = 'pill',
    selectionBackgroundColor = 'rgba(255, 255, 255, 0.12)',
  } = props;

  // 1. Вычисляем начальное значение
  const initial = useMemo<DateParts>(() => {
    if (value) return value;
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, []);

  // 2. State для выбранных значений
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  // 3. State для индексов прокрутки
  const [scrollDayIndex, setScrollDayIndex] = useState(initial.day - 1);
  const [scrollMonthIndex, setScrollMonthIndex] = useState(initial.month - 1);
  const [scrollYearIndex, setScrollYearIndex] = useState(0);

  // 4. Константы
  const monthNames = locale === 'ru' ? RU_MONTHS_SHORT : EN_MONTHS_SHORT;
  const padCount = Math.floor(visibleRows / 2);
  const containerH = itemHeight * visibleRows;
  const paddingHeight = padCount * itemHeight;

  // 5. Массивы данных (useMemo)
  const days = useMemo(() => {
    const maxDay = daysInMonth(year, month);
    return Array.from({ length: maxDay }, (_, i) => i + 1);
  }, [year, month]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = minYear; y <= maxYear; y++) result.push(y);
    return result;
  }, [minYear, maxYear]);

  // 6. Refs
  const dayRef = useRef<ScrollView | null>(null);
  const monthRef = useRef<ScrollView | null>(null);
  const yearRef = useRef<ScrollView | null>(null);

  // 7. Вычисляемые индексы (ПОСЛЕ определения массивов)
  const dayIndex = day - 1;
  const monthIndex = month - 1;
  const yearIndex = years.indexOf(year);

  // 8. Effects
  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) {
      setDay(maxDay);
    }
  }, [year, month, day]);

  useEffect(() => {
    if (value) {
      if (value.day !== day) setDay(value.day);
      if (value.month !== month) setMonth(value.month);
      if (value.year !== year) setYear(value.year);
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const safeYearIndex = yearIndex >= 0 ? yearIndex : 0;

      dayRef.current?.scrollTo({ y: dayIndex * itemHeight, animated: false });
      monthRef.current?.scrollTo({
        y: monthIndex * itemHeight,
        animated: false,
      });
      yearRef.current?.scrollTo({
        y: safeYearIndex * itemHeight,
        animated: false,
      });

      setScrollDayIndex(dayIndex);
      setScrollMonthIndex(monthIndex);
      if (yearIndex >= 0) {
        setScrollYearIndex(yearIndex);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [dayIndex, monthIndex, yearIndex, itemHeight]);

  // 9. Handlers
  const handleSnap = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
    type: 'day' | 'month' | 'year'
  ) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / itemHeight);
    const snapped = idx * itemHeight;

    let newDay = day;
    let newMonth = month;
    let newYear = year;

    if (type === 'day') {
      dayRef.current?.scrollTo({ y: snapped, animated: true });
      newDay = clamp(idx + 1, 1, days.length);
      setDay(newDay);
      setScrollDayIndex(idx);
    } else if (type === 'month') {
      monthRef.current?.scrollTo({ y: snapped, animated: true });
      newMonth = clamp(idx + 1, 1, 12);
      setMonth(newMonth);
      setScrollMonthIndex(idx);
    } else {
      yearRef.current?.scrollTo({ y: snapped, animated: true });
      newYear = years[clamp(idx, 0, years.length - 1)];
      setYear(newYear);
      setScrollYearIndex(idx);
    }

    if (onChange) {
      onChange({ day: newDay, month: newMonth, year: newYear });
    }
  };

  const renderColumn = (
    data: number[],
    ref: React.RefObject<ScrollView>,
    currentScrollIndex: number,
    onSnap: (e: NativeSyntheticEvent<NativeScrollEvent>) => void,
    formatter?: (v: number) => string,
    width?: number
  ) => {
    return (
      <View style={[styles.column, { height: containerH, width: width || 80 }]}>
        <ScrollView
          ref={ref}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ paddingVertical: paddingHeight }}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.95}
          onScrollEndDrag={onSnap}
          onMomentumScrollEnd={onSnap}
          scrollEventThrottle={16}
        >
          {data.map((value, index) => {
            const isSelected = index === currentScrollIndex;
            const vis = getItemVisualStyle(index, currentScrollIndex, padCount);

            return (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.item,
                  {
                    height: itemHeight,
                  },
                ]}
              >
                <View
                  style={{
                    transform: [{ scale: vis.scale }],
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isSelected && styles.selectedText,
                      { opacity: vis.opacity },
                    ]}
                    numberOfLines={1}
                  >
                    {formatter ? formatter(value) : String(value)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.root, { height: containerH }]}>
      {selectionStyle === 'pill' && (
        <View
          pointerEvents="none"
          style={[
            styles.pillOverlay,
            {
              top: paddingHeight,
              height: itemHeight,
              borderRadius: itemHeight / 2,
              backgroundColor: selectionBackgroundColor,
            },
          ]}
        />
      )}

      <View style={styles.columnsContainer}>
        {renderColumn(
          days,
          dayRef,
          scrollDayIndex,
          (e) => handleSnap(e, 'day'),
          undefined,
          70
        )}

        {renderColumn(
          months,
          monthRef,
          scrollMonthIndex,
          (e) => handleSnap(e, 'month'),
          (v) => monthNames[v - 1],
          100
        )}

        {renderColumn(
          years,
          yearRef,
          scrollYearIndex,
          (e) => handleSnap(e, 'year'),
          undefined,
          70
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  pillOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    gap: 16,
  },
  column: {
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  item: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    includeFontPadding: false,
    fontFamily: 'Montserrat_400Regular',
  },
  selectedText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 26,
    includeFontPadding: false,
  },
});

export default DateWheelPicker;
