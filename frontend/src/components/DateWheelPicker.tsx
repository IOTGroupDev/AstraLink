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
  floatingIndex: number,
  padCount: number
) {
  const dist = Math.abs(index - floatingIndex);

  if (dist < 0.01) {
    return { opacity: 1, scale: 1, fontSize: 26, fontWeight: '600' as const };
  }

  const t = dist / padCount;

  const scale = Math.max(0.4, 1 - Math.pow(t, 1.0) * 0.6);
  const opacity = Math.max(0.2, 1 - Math.pow(t, 0.8) * 0.8);

  const fontSize = Math.max(16, 26 - dist * 3);
  const fontWeight = dist < 0.5 ? '600' : '400';

  return { opacity, scale, fontSize, fontWeight: fontWeight as '600' | '400' };
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

  const initial = useMemo<DateParts>(() => {
    if (value) return value;
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, []);

  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const [floatingDayIndex, setFloatingDayIndex] = useState(initial.day - 1);
  const [floatingMonthIndex, setFloatingMonthIndex] = useState(
    initial.month - 1
  );
  const [floatingYearIndex, setFloatingYearIndex] = useState(0);

  const isScrollingDay = useRef(false);
  const isScrollingMonth = useRef(false);
  const isScrollingYear = useRef(false);

  // Таймеры для отложенного центрирования
  const snapTimerDay = useRef<NodeJS.Timeout | null>(null);
  const snapTimerMonth = useRef<NodeJS.Timeout | null>(null);
  const snapTimerYear = useRef<NodeJS.Timeout | null>(null);

  const monthNames = locale === 'ru' ? RU_MONTHS_SHORT : EN_MONTHS_SHORT;
  const padCount = Math.floor(visibleRows / 2);
  const containerH = itemHeight * visibleRows;
  const paddingHeight = padCount * itemHeight;

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

  const dayRef = useRef<ScrollView | null>(null);
  const monthRef = useRef<ScrollView | null>(null);
  const yearRef = useRef<ScrollView | null>(null);

  const dayIndex = day - 1;
  const monthIndex = month - 1;
  const yearIndex = years.indexOf(year);

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

      setFloatingDayIndex(dayIndex);
      setFloatingMonthIndex(monthIndex);
      if (yearIndex >= 0) {
        setFloatingYearIndex(yearIndex);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [dayIndex, monthIndex, yearIndex, itemHeight]);

  const handleScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
    type: 'day' | 'month' | 'year'
  ) => {
    const y = e.nativeEvent.contentOffset.y;
    const floatIdx = y / itemHeight;

    if (type === 'day') {
      isScrollingDay.current = true;
      setFloatingDayIndex(floatIdx);

      if (snapTimerDay.current) clearTimeout(snapTimerDay.current);

      snapTimerDay.current = setTimeout(() => {
        finalizeScroll('day');
      }, 200);
    } else if (type === 'month') {
      isScrollingMonth.current = true;
      setFloatingMonthIndex(floatIdx);

      if (snapTimerMonth.current) clearTimeout(snapTimerMonth.current);

      snapTimerMonth.current = setTimeout(() => {
        finalizeScroll('month');
      }, 200);
    } else {
      isScrollingYear.current = true;
      setFloatingYearIndex(floatIdx);

      if (snapTimerYear.current) clearTimeout(snapTimerYear.current);

      snapTimerYear.current = setTimeout(() => {
        finalizeScroll('year');
      }, 200);
    }
  };

  // ИСПРАВЛЕНИЕ: плавное центрирование
  const finalizeScroll = (type: 'day' | 'month' | 'year') => {
    let ref: React.RefObject<ScrollView>;
    let floatingIndex: number;
    let maxIndex: number;

    if (type === 'day') {
      ref = dayRef;
      floatingIndex = floatingDayIndex;
      maxIndex = days.length - 1;
      isScrollingDay.current = false;
    } else if (type === 'month') {
      ref = monthRef;
      floatingIndex = floatingMonthIndex;
      maxIndex = 11;
      isScrollingMonth.current = false;
    } else {
      ref = yearRef;
      floatingIndex = floatingYearIndex;
      maxIndex = years.length - 1;
      isScrollingYear.current = false;
    }

    const targetIdx = clamp(Math.round(floatingIndex), 0, maxIndex);
    const targetY = targetIdx * itemHeight;

    // Плавное центрирование с анимацией
    ref.current?.scrollTo({ y: targetY, animated: true });

    // Обновляем состояние после небольшой задержки для синхронизации с анимацией
    setTimeout(() => {
      if (type === 'day') {
        const newDay = targetIdx + 1;
        setDay(newDay);
        setFloatingDayIndex(targetIdx);
        if (onChange) onChange({ day: newDay, month, year });
      } else if (type === 'month') {
        const newMonth = targetIdx + 1;
        setMonth(newMonth);
        setFloatingMonthIndex(targetIdx);
        if (onChange) onChange({ day, month: newMonth, year });
      } else {
        const newYear = years[targetIdx];
        setYear(newYear);
        setFloatingYearIndex(targetIdx);
        if (onChange) onChange({ day, month, year: newYear });
      }
    }, 100);
  };

  const handleScrollEnd = (type: 'day' | 'month' | 'year') => {
    finalizeScroll(type);
  };

  const renderColumn = (
    data: number[],
    ref: React.RefObject<ScrollView>,
    currentFloatingIndex: number,
    type: 'day' | 'month' | 'year',
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
          decelerationRate={0.985}
          onScroll={(e) => handleScroll(e, type)}
          scrollEventThrottle={16}
        >
          {data.map((value, index) => {
            const vis = getItemVisualStyle(
              index,
              currentFloatingIndex,
              padCount
            );

            return (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.item,
                  {
                    height: itemHeight,
                    transform: [{ scale: vis.scale }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    {
                      opacity: vis.opacity,
                      fontSize: vis.fontSize,
                      fontFamily:
                        vis.fontWeight === '600'
                          ? 'Montserrat_600SemiBold'
                          : 'Montserrat_400Regular',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {formatter ? formatter(value) : String(value)}
                </Text>
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
        {renderColumn(days, dayRef, floatingDayIndex, 'day', undefined, 70)}

        {renderColumn(
          months,
          monthRef,
          floatingMonthIndex,
          'month',
          (v) => monthNames[v - 1],
          100
        )}

        {renderColumn(years, yearRef, floatingYearIndex, 'year', undefined, 70)}
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
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default DateWheelPicker;
