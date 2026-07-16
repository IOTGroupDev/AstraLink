import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['rgba(69, 67, 112, 0.76)', 'rgba(105, 47, 151, 0.76)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 49,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(136, 130, 178, 0.5)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: 'rgba(121, 120, 159, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(157, 151, 191, 0.38)',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  activeLabel: {
    fontWeight: '500',
  },
});
