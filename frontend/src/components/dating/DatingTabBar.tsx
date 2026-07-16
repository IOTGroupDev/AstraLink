import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GradientBorderView } from '../shared';

export type DatingTab = 'discovery' | 'matched' | 'messages';

type Props = {
  value: DatingTab;
  onChange: (tab: DatingTab) => void;
};

const TABS: Array<{ key: DatingTab; label: string }> = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'matched', label: 'Matched' },
  { key: 'messages', label: 'Messages' },
];

export function DatingTabBar({ value, onChange }: Props) {
  const [tabsWidth, setTabsWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const activeIndex = TABS.findIndex((tab) => tab.key === value);
  const tabWidth = tabsWidth / TABS.length;

  useEffect(() => {
    if (!tabsWidth) return;

    indicatorX.value = withTiming(activeIndex * tabWidth, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeIndex, indicatorX, tabWidth, tabsWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <GradientBorderView
      colors={['rgba(255,255,255,0.42)', 'rgba(124,119,153,0.32)']}
      gradientProps={{
        locations: [0, 1],
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      }}
      style={styles.shell}
      contentStyle={styles.shellContent}
    >
      <BlurView
        pointerEvents="none"
        intensity={56}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.shellTint} />
      <View
        style={styles.tabs}
        onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}
      >
        {tabsWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              { width: tabWidth },
              indicatorStyle,
            ]}
          />
        ) : null}
        {TABS.map((tab) => {
          const active = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(tab.key)}
              style={styles.tab}
            >
              <Text style={styles.label}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </GradientBorderView>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    height: 48,
    borderRadius: 26,
    borderWidth: 1.1,
  },
  shellContent: {
    height: 45.8,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shellTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,14,28,0.08)',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    zIndex: 1,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    lineHeight: 20,
  },
});
