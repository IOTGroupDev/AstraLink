// src/navigation/navigationConfig.ts
// Импортируйте эту конфигурацию в App.tsx

import { DefaultTheme } from '@react-navigation/native';

// Кастомная тема для устранения белых вспышек
export const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B5CF6',
    background: '#0F172A', // КРИТИЧНО: тот же цвет везде
    card: '#0F172A',
    text: '#FFFFFF',
    border: 'rgba(139, 92, 246, 0.3)',
    notification: '#EF4444',
  },
};

// Конфигурация для оптимизации производительности
export const navigationConfig = {
  // Отключаем предварительные вычисления для более плавной работы
  detachInactiveScreens: false,

  // Общие настройки анимации
  animationEnabled: true,
  animationDuration: 200,
};
