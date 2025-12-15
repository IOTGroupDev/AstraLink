// src/components/layout/TabScreenLayout.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../shared/CosmicBackground';

interface TabScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[]; // Гибкость для SafeArea
  contentContainerStyle?: any;
}

export function TabScreenLayout({
  children,
  scrollable = true,
  edges = ['top', 'left', 'right'], // bottom исключён из-за TabBar
  contentContainerStyle,
}: TabScreenLayoutProps) {
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

  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {/*<LinearGradient*/}
      {/*  colors={['#1a0a2e', '#16213e', '#0f3460']}*/}
      {/*  style={StyleSheet.absoluteFillObject}*/}
      {/*/>*/}
      <CosmicBackground />
      <Animated.View
        entering={FadeInDown.duration(400).springify().damping(15).stiffness(100)}
        style={styles.animatedContainer}
      >
        {content}
      </Animated.View>
    </SafeAreaView>
  );
}

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
