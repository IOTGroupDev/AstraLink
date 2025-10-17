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
  minYear?: number; // inclusive
  maxYear?: number; // inclusive
  onChange?: (value: DateParts) => void;
  locale?: 'ru' | 'en';
  itemHeight?: number;
  visibleRows?: number; // odd number recommended (e.g., 5 or 7)
  /** Selection row background: 'pill' (glass bar) or 'lines' (hairlines). Default: 'pill' */
  selectionStyle?: 'pill' | 'lines';
  /** Custom background color for pill selection */
  selectionBackgroundColor?: string;
}

/** Format left column like "Tue 10 Sep" and show "Today" for the current date */
function formatDayLabel(
  day: number,
  month1Based: number,
  year: number,
  locale: 'ru' | 'en'
) {
  const now = new Date();
  const isToday =
    day === now.getDate() &&
    month1Based === now.getMonth() + 1 &&
    year === now.getFullYear();

  if (isToday) {
    return 'Today';
  }

  const d = new Date(year, month1Based - 1, day);
  const loc = locale === 'ru' ? 'ru-RU' : 'en-US';
  const weekday = d.toLocaleDateString(loc, { weekday: 'short' });
  const monthShort = d.toLocaleDateString(loc, { month: 'short' });
  const dayNum = d.getDate();
  const w = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${w} ${dayNum} ${monthShort}`;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Visual depth: scale/opacity/fontSize fade from center to edges */
function getItemVisualStyle(
  index: number,
  selectedIndex: number,
  itemHeight: number,
  padCount: number
) {
  const dist = Math.abs(index - selectedIndex);
  const t = Math.min(1, dist / (padCount + 0.5)); // 0..1
  const scale = 1 - 0.25 * t; // 0.75..1
  const opacity = 1 - 0.75 * t; // 0.25..1
  const fontSize = 22 - 4 * t; // 18..22
  return { opacity, transform: [{ scale }], fontSize };
}

export default function DateWheelPicker(props: DateWheelPickerProps) {
  const {
    value,
    minYear = 1900,
    maxYear = new Date().getFullYear(),
    onChange,
    locale = 'ru',
    itemHeight = 44,
    visibleRows = 7,
    selectionStyle = 'pill',
    selectionBackgroundColor = 'rgba(255,255,255,0.12)',
  } = props;

  // initial selection
  const initial = useMemo<DateParts>(() => {
    if (value) return value;
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: 1995 };
  }, [value]);

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(() =>
    clamp(initial.day, 1, daysInMonth(initial.year, initial.month))
  );

  // Data sources
  const daysArray = useMemo(() => {
    const dim = daysInMonth(year, month);
    return Array.from({ length: dim }, (_, i) => i + 1);
  }, [year, month]);

  // Center column is day number (1..31)
  const dayNumbers = daysArray;

  // Right column is 2-digit years
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = minYear; y <= maxYear; y++) result.push(y);
    return result;
  }, [minYear, maxYear]);

  // Keep day in range when month/year changes
  useEffect(() => {
    const dim = daysInMonth(year, month);
    if (day > dim) {
      setDay(dim);
      onChange?.({ day: dim, month, year });
    }
  }, [year, month]);

  useEffect(() => {
    onChange?.({ day, month, year });
  }, [day, month, year]);

  // Scroll helpers
  const leftRef = useRef<ScrollView | null>(null);
  const centerRef = useRef<ScrollView | null>(null);
  const rightRef = useRef<ScrollView | null>(null);

  const padCount = Math.floor(visibleRows / 2);
  const containerH = itemHeight * visibleRows;

  // Indices
  const dayIndex = day - 1;
  const yearIndex = years.indexOf(year);

  // Align initial offsets once mounted
  useEffect(() => {
    requestAnimationFrame(() => {
      const yDay = dayIndex * itemHeight;
      leftRef.current?.scrollTo({ y: yDay, animated: false });
      centerRef.current?.scrollTo({ y: yDay, animated: false });
      rightRef.current?.scrollTo({
        y: yearIndex * itemHeight,
        animated: false,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSnap = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
    list: 'left' | 'center' | 'right'
  ) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / itemHeight);
    const snapped = idx * itemHeight;

    if (list === 'left' || list === 'center') {
      const d = clamp(idx + 1, 1, dayNumbers.length);
      setDay(d);
      leftRef.current?.scrollTo({ y: snapped, animated: true });
      centerRef.current?.scrollTo({ y: snapped, animated: true });
    } else {
      const yv = years[clamp(idx, 0, years.length - 1)];
      setYear(yv);
      rightRef.current?.scrollTo({ y: snapped, animated: true });
    }
  };

  const renderColumn = (
    data: Array<number | string>,
    ref: React.RefObject<ScrollView>,
    selectedIndex: number,
    onEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => void,
    onMomentumEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void,
    formatter?: (v: number | string) => string,
    centerAlign: 'left' | 'center' = 'center',
    width?: number
  ) => {
    return (
      <View
        style={[styles.col, { height: containerH }, width ? { width } : null]}
      >
        {/* top pad */}
        <View style={{ height: padCount * itemHeight }} />
        <ScrollView
          ref={ref}
          style={[styles.scroller, width ? { width } : null]}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
          onScrollEndDrag={onEndDrag}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
        >
          {data.map((v, i) => {
            const isSelected = i === selectedIndex;
            const vis = getItemVisualStyle(
              i,
              selectedIndex,
              itemHeight,
              padCount
            );
            return (
              <View
                key={`${v}-${i}`}
                style={[
                  styles.item,
                  { height: itemHeight, justifyContent: 'center' },
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    vis,
                    {
                      textAlign: centerAlign,
                      fontFamily: isSelected
                        ? 'Montserrat_600SemiBold'
                        : 'Montserrat_400Regular',
                    },
                  ]}
                >
                  {formatter ? formatter(v) : String(v)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        {/* bottom pad */}
        <View style={{ height: padCount * itemHeight }} />
        {/* hairline selection if not pill */}
        {selectionStyle !== 'pill' && (
          <View
            pointerEvents="none"
            style={[
              styles.selector,
              { top: padCount * itemHeight, height: itemHeight },
            ]}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { height: containerH }]}>
      {/* Single pill overlay spanning all columns */}
      {selectionStyle === 'pill' && (
        <View
          pointerEvents="none"
          style={[
            styles.pillOverlay,
            {
              top: padCount * itemHeight,
              height: itemHeight,
              borderRadius: Math.max(12, Math.round(itemHeight / 2)),
              backgroundColor: selectionBackgroundColor,
            },
          ]}
        />
      )}

      {/* Left: human-readable labels */}
      {renderColumn(
        dayNumbers,
        leftRef,
        dayIndex,
        (e) => onSnap(e, 'left'),
        (e) => onSnap(e, 'left'),
        (v) => formatDayLabel(Number(v), month, year, locale),
        'left',
        230
      )}
      {/* Center: day number */}
      {renderColumn(
        dayNumbers,
        centerRef,
        dayIndex,
        (e) => onSnap(e, 'center'),
        (e) => onSnap(e, 'center'),
        (v) => String(v),
        'center',
        60
      )}
      {/* Right: 2-digit year */}
      {renderColumn(
        years,
        rightRef,
        yearIndex,
        (e) => onSnap(e, 'right'),
        (e) => onSnap(e, 'right'),
        (v) => String(v).slice(-2),
        'left',
        56
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 16,
  },
  col: {
    position: 'relative',
  },
  pillOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  scroller: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  item: {
    paddingHorizontal: 8,
  },
  itemText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  selector: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
