// frontend/src/components/DateWheelPickerImproved.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';

export type DateParts = { day: number; month: number; year: number };

export interface DateWheelPickerProps {
  value?: DateParts;
  minYear?: number;
  maxYear?: number;
  onChange?: (value: DateParts) => void;
  locale?: 'ru' | 'en';
  itemHeight?: number;
  visibleRows?: number; // нечётное число лучше (5/7/9)
  selectionStyle?: 'pill' | 'lines';
  selectionBackgroundColor?: string;
  // ширины колонок (на случай кастомизации)
  dayWidth?: number;
  monthWidth?: number;
  yearWidth?: number;
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ---------- Универсальная колонка колеса ----------
type WheelColumnProps<T extends number> = {
  data: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
  itemHeight: number;
  visibleRows: number;
  selectionBackgroundColor: string;
  selectionStyle: 'pill' | 'lines';
  width: number;
};

function WheelColumn<T extends number>({
  data,
  value,
  onChange,
  renderLabel,
  itemHeight,
  visibleRows,
  selectionBackgroundColor,
  selectionStyle,
  width,
}: WheelColumnProps<T>) {
  const listRef = useRef<FlatList<T>>(null);

  const containerH = itemHeight * visibleRows;
  const centerOffset = (containerH - itemHeight) / 2;

  const indexOfValue = useMemo(() => {
    const i = data.indexOf(value);
    return i < 0 ? 0 : i;
  }, [data, value]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  // Прокрутить к текущему значению на маунте и при изменении value/data
  useEffect(() => {
    if (!listRef.current) return;
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({
          index: clamp(indexOfValue, 0, Math.max(0, data.length - 1)),
          animated: false,
        });
      } catch {
        // бывает при первой разметке, попробуем позже
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index: clamp(indexOfValue, 0, Math.max(0, data.length - 1)),
            animated: false,
          });
        }, 60);
      }
    });
  }, [indexOfValue, data.length]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offset / itemHeight);
      const idx = clamp(rawIndex, 0, Math.max(0, data.length - 1));
      const picked = data[idx];
      if (picked !== value) onChange(picked);
      // докрутить точно к центру (на случай дробного)
      listRef.current?.scrollToIndex({ index: idx, animated: true });
    },
    [data, itemHeight, onChange, value]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<T>) => {
      const label = renderLabel ? renderLabel(item) : String(item);
      const isSelected = item === value;
      return (
        <View style={[styles.item, { height: itemHeight, width }]}>
          <Text
            style={[styles.itemText, isSelected ? styles.itemTextActive : null]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      );
    },
    [itemHeight, value, renderLabel, width]
  );

  return (
    <View style={[styles.column, { height: containerH, width }]}>
      {/* Центрирующий оверлей */}
      {selectionStyle === 'pill' ? (
        <View
          pointerEvents="none"
          style={[
            styles.pillOverlay,
            {
              top: centerOffset,
              height: itemHeight,
              borderRadius: itemHeight / 2,
              backgroundColor: selectionBackgroundColor,
              left: 8,
              right: 8,
            },
          ]}
        />
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.lineOverlay,
              { top: centerOffset, left: 0, right: 0 },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.lineOverlay,
              { top: centerOffset + itemHeight, left: 0, right: 0 },
            ]}
          />
        </>
      )}

      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(it, i) => `${it}-${i}`}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        // важные "подушки" для центрирования под оверлеем
        contentContainerStyle={{
          paddingTop: centerOffset,
          paddingBottom: centerOffset,
        }}
      />
    </View>
  );
}

// ---------- Основной компонент ----------
const DateWheelPickerImproved: React.FC<DateWheelPickerProps> = ({
  value,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  onChange,
  locale = 'en',
  itemHeight = 44,
  visibleRows = 7,
  selectionStyle = 'pill',
  selectionBackgroundColor = 'rgba(255,255,255,0.12)',
  dayWidth = 72,
  monthWidth = 104,
  yearWidth = 80,
}) => {
  // начальное значение
  const initial = useMemo<DateParts>(() => {
    if (value) return value;
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, [value]);

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const monthNames = locale === 'ru' ? RU_MONTHS_SHORT : EN_MONTHS_SHORT;

  // диапазоны
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= maxYear; y++) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => {
    const dMax = daysInMonth(year, month);
    return Array.from({ length: dMax }, (_, i) => i + 1);
  }, [year, month]);

  // следим, чтобы день не «выпал» при смене месяца/года
  useEffect(() => {
    const dMax = daysInMonth(year, month);
    if (day > dMax) {
      const newDay = dMax;
      setDay(newDay);
      onChange?.({ day: newDay, month, year });
    }
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  // синхронизация при внешнем value
  useEffect(() => {
    if (!value) return;
    let changed = false;
    if (value.year !== year) {
      setYear(value.year);
      changed = true;
    }
    if (value.month !== month) {
      setMonth(value.month);
      changed = true;
    }
    const dMax = daysInMonth(value.year, value.month);
    const dNext = clamp(value.day, 1, dMax);
    if (dNext !== day) {
      setDay(dNext);
      changed = true;
    }
    if (changed) {
      onChange?.({ day: dNext, month: value.month, year: value.year });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeDay = useCallback(
    (d: number) => {
      setDay(d);
      onChange?.({ day: d, month, year });
    },
    [month, year, onChange]
  );

  const onChangeMonth = useCallback(
    (m: number) => {
      const dMax = daysInMonth(year, m);
      const dNext = clamp(day, 1, dMax);
      setMonth(m);
      if (dNext !== day) setDay(dNext);
      onChange?.({ day: dNext, month: m, year });
    },
    [day, year, onChange]
  );

  const onChangeYear = useCallback(
    (y: number) => {
      const dMax = daysInMonth(y, month);
      const dNext = clamp(day, 1, dMax);
      setYear(y);
      if (dNext !== day) setDay(dNext);
      onChange?.({ day: dNext, month, year: y });
    },
    [day, month, onChange]
  );

  const containerH = itemHeight * visibleRows;

  return (
    <View style={[styles.root, { height: containerH }]}>
      <View style={styles.columnsContainer}>
        <WheelColumn
          data={days}
          value={day}
          onChange={onChangeDay}
          renderLabel={(d) => String(d)}
          itemHeight={itemHeight}
          visibleRows={visibleRows}
          selectionBackgroundColor={selectionBackgroundColor}
          selectionStyle={selectionStyle}
          width={dayWidth}
        />
        <WheelColumn
          data={months}
          value={month}
          onChange={onChangeMonth}
          renderLabel={(m) => monthNames[m - 1]}
          itemHeight={itemHeight}
          visibleRows={visibleRows}
          selectionBackgroundColor={selectionBackgroundColor}
          selectionStyle={selectionStyle}
          width={monthWidth}
        />
        <WheelColumn
          data={years as number[]}
          value={year}
          onChange={onChangeYear}
          renderLabel={(y) => String(y)}
          itemHeight={itemHeight}
          visibleRows={visibleRows}
          selectionBackgroundColor={selectionBackgroundColor}
          selectionStyle={selectionStyle}
          width={yearWidth}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 12,
    height: '100%',
  },
  column: {
    position: 'relative',
    overflow: 'hidden',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  itemText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  itemTextActive: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 22,
  },
  pillOverlay: {
    position: 'absolute',
  },
  lineOverlay: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

export default DateWheelPickerImproved;
