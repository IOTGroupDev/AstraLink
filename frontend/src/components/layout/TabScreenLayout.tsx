// src/components/layout/TabScreenLayout.tsx
import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../shared/CosmicBackground';

interface TabScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[]; // Гибкость для SafeArea
  contentContainerStyle?: any;
}

export const TabScreenLayout = React.memo(function TabScreenLayout({
  children,
  scrollable = true,
  edges = ['top', 'left', 'right'], // bottom исключён из-за TabBar
  contentContainerStyle,
}: TabScreenLayoutProps) {
  // Отслеживаем первый рендер для оптимизации анимации
  const hasAnimated = useRef(false);

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  // Применяем анимацию только при первом рендере
  const entering = !hasAnimated.current
    ? FadeInDown.duration(400).springify().damping(15).stiffness(100)
    : undefined;

  if (!hasAnimated.current) {
    hasAnimated.current = true;
  }

  return (
    <SafeAreaView style={styles.container} edges={edges}>
      <CosmicBackground />
      <Animated.View entering={entering} style={styles.animatedContainer}>
        {content}
      </Animated.View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 120, // Отступ от TabBar
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
});
