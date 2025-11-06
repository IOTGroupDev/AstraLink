// Примеры использования компонента PremiumFeature с разными режимами

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PremiumFeature from './PremiumFeature';

// ========================================
// ПРИМЕР 1: Режим HIDE (по умолчанию)
// Скрывает контент полностью и показывает upgrade prompt
// ========================================

export function Example1_HideMode() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Продвинутая аналитика</Text>

      <PremiumFeature
        feature="ADVANCED_ANALYTICS"
        // lockMode="hide" - по умолчанию
      >
        {/* Этот контент СКРЫТ без Premium подписки */}
        <View style={styles.analyticsContainer}>
          <Text style={styles.analyticsTitle}>📊 Детальная статистика</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>1,234</Text>
              <Text style={styles.statLabel}>Просмотры</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>56%</Text>
              <Text style={styles.statLabel}>Конверсия</Text>
            </View>
          </View>
        </View>
      </PremiumFeature>
    </View>
  );
}

// ========================================
// ПРИМЕР 2: Режим LOCK с кнопками
// Показывает затемнённые кнопки с overlay и замком
// ========================================

export function Example2_LockModeWithButtons() {
  const exportToPDF = () => {
    console.log('Экспорт в PDF');
  };

  const exportToExcel = () => {
    console.log('Экспорт в Excel');
  };

  const exportToCSV = () => {
    console.log('Экспорт в CSV');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Экспорт данных</Text>

      <PremiumFeature
        feature="UNLIMITED_EXPORTS"
        lockMode="lock" // 🔑 Режим блокировки
        customTitle="Безлимитный экспорт"
      >
        {/* Эти кнопки ВИДНЫ, но заблокированы без Premium */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={exportToPDF}
          >
            <Ionicons name="document-text" size={24} color="#fff" />
            <Text style={styles.buttonText}>Экспорт в PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.excelButton]}
            onPress={exportToExcel}
          >
            <Ionicons name="grid" size={24} color="#fff" />
            <Text style={styles.buttonText}>Экспорт в Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.csvButton]}
            onPress={exportToCSV}
          >
            <Ionicons name="list" size={24} color="#fff" />
            <Text style={styles.buttonText}>Экспорт в CSV</Text>
          </TouchableOpacity>
        </View>
      </PremiumFeature>
    </View>
  );
}

// ========================================
// ПРИМЕР 3: Компактный режим LOCK
// Минималистичная блокировка для небольших элементов
// ========================================

export function Example3_CompactLockMode() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Быстрые действия</Text>

      <View style={styles.actionsGrid}>
        {/* Обычная кнопка - всегда доступна */}
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.actionGradient}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.actionText}>Поделиться</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Premium кнопка с компактной блокировкой */}
        <PremiumFeature
          feature="ADVANCED_FILE_MANAGEMENT"
          lockMode="lock"
          compactLock={true} // 🔑 Компактный режим
        >
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.actionGradient}
            >
              <Ionicons name="folder-open" size={24} color="#fff" />
              <Text style={styles.actionText}>Переместить</Text>
            </LinearGradient>
          </TouchableOpacity>
        </PremiumFeature>

        {/* Ещё одна Premium кнопка */}
        <PremiumFeature
          feature="ADVANCED_FILE_MANAGEMENT"
          lockMode="lock"
          compactLock={true}
        >
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.actionGradient}
            >
              <Ionicons name="copy" size={24} color="#fff" />
              <Text style={styles.actionText}>Дублировать</Text>
            </LinearGradient>
          </TouchableOpacity>
        </PremiumFeature>
      </View>
    </View>
  );
}

// ========================================
// ПРИМЕР 4: Сетка карточек с блокировкой
// Показываем премиум функции, но блокируем их
// ========================================

export function Example4_FeatureCardsGrid() {
  const features = [
    {
      id: 'themes',
      title: 'Кастомные темы',
      icon: 'color-palette',
      color: '#EC4899',
      premium: true,
      feature: 'CUSTOM_THEMES',
    },
    {
      id: 'filters',
      title: 'Продвинутые фильтры',
      icon: 'funnel',
      color: '#8B5CF6',
      premium: true,
      feature: 'ADVANCED_FILTERS',
    },
    {
      id: 'export',
      title: 'Экспорт данных',
      icon: 'download',
      color: '#10B981',
      premium: true,
      feature: 'UNLIMITED_EXPORTS',
    },
    {
      id: 'support',
      title: 'Priority Support',
      icon: 'chatbubbles',
      color: '#F59E0B',
      premium: true,
      feature: 'PRIORITY_SUPPORT',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Премиум функции</Text>

      <View style={styles.cardsGrid}>
        {features.map((feat) => (
          <PremiumFeature
            key={feat.id}
            feature={feat.feature as any}
            lockMode="lock"
            compactLock={true}
          >
            <TouchableOpacity style={styles.featureCard}>
              <View
                style={[styles.featureIcon, { backgroundColor: feat.color }]}
              >
                <Ionicons name={feat.icon as any} size={32} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>{feat.title}</Text>
            </TouchableOpacity>
          </PremiumFeature>
        ))}
      </View>
    </View>
  );
}

// ========================================
// ПРИМЕР 5: Список настроек с блокировкой
// Отдельные строки настроек заблокированы
// ========================================

export function Example5_SettingsList() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Настройки</Text>

      <View style={styles.settingsList}>
        {/* Обычная настройка - доступна всем */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={24} color="#fff" />
            <Text style={styles.settingText}>Уведомления</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Premium настройка с блокировкой */}
        <PremiumFeature
          feature="CUSTOM_THEMES"
          lockMode="lock"
          compactLock={true}
        >
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-palette" size={24} color="#fff" />
              <Text style={styles.settingText}>Темы оформления</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
          </TouchableOpacity>
        </PremiumFeature>

        {/* Ещё одна обычная настройка */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="language" size={24} color="#fff" />
            <Text style={styles.settingText}>Язык</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Premium настройка */}
        <PremiumFeature
          feature="ADVANCED_FILTERS"
          lockMode="lock"
          compactLock={true}
        >
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="construct" size={24} color="#fff" />
              <Text style={styles.settingText}>Расширенные настройки</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
          </TouchableOpacity>
        </PremiumFeature>
      </View>
    </View>
  );
}

// ========================================
// ПРИМЕР 6: Полноэкранная секция с контентом
// Большая секция с подробным содержимым
// ========================================

export function Example6_FullSectionLock() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Аналитика и отчёты</Text>

      <PremiumFeature
        feature="ADVANCED_ANALYTICS"
        lockMode="lock"
        customTitle="Продвинутая аналитика 📊"
      >
        <View style={styles.fullSection}>
          {/* Графики */}
          <View style={styles.chart}>
            <Text style={styles.chartTitle}>Статистика за месяц</Text>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart" size={80} color="#8B5CF6" />
            </View>
          </View>

          {/* Метрики */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>45.2K</Text>
              <Text style={styles.metricLabel}>Просмотры</Text>
              <Text style={styles.metricChange}>+12.5%</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>3.8K</Text>
              <Text style={styles.metricLabel}>Клики</Text>
              <Text style={styles.metricChange}>+8.3%</Text>
            </View>
          </View>

          {/* Кнопки действий */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Скачать отчёт</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Поделиться</Text>
            </TouchableOpacity>
          </View>
        </View>
      </PremiumFeature>
    </ScrollView>
  );
}

// ========================================
// ПРИМЕР 7: Миксованный режим
// Некоторые функции скрыты, другие заблокированы
// ========================================

export function Example7_MixedModes() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>Панель управления</Text>

      {/* Режим LOCK - показываем кнопки */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        <PremiumFeature
          feature="QUICK_ACTIONS"
          lockMode="lock"
          compactLock={false}
        >
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn}>
              <Ionicons name="camera" size={28} color="#fff" />
              <Text style={styles.quickBtnText}>Скан</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn}>
              <Ionicons name="mic" size={28} color="#fff" />
              <Text style={styles.quickBtnText}>Аудио</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn}>
              <Ionicons name="location" size={28} color="#fff" />
              <Text style={styles.quickBtnText}>Геометка</Text>
            </TouchableOpacity>
          </View>
        </PremiumFeature>
      </View>

      {/* Режим HIDE - полностью скрываем */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Ассистент</Text>
        <PremiumFeature
          feature="AI_ASSISTANT"
          lockMode="hide"
          customTitle="AI Ассистент 🤖"
          customMessage="Получите персонального AI помощника для автоматизации задач"
        >
          <View style={styles.aiAssistant}>
            <Text style={styles.aiTitle}>Ваш AI помощник готов!</Text>
            <TouchableOpacity style={styles.aiButton}>
              <Text style={styles.aiButtonText}>Начать диалог</Text>
            </TouchableOpacity>
          </View>
        </PremiumFeature>
      </View>
    </ScrollView>
  );
}

// ========================================
// СТИЛИ
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },

  // Аналитика
  analyticsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
  },
  analyticsTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },

  // Кнопки экспорта
  buttonsContainer: {
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  pdfButton: {
    backgroundColor: '#EF4444',
  },
  excelButton: {
    backgroundColor: '#10B981',
  },
  csvButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Быстрые действия
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Сетка карточек
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (300 - 36) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Список настроек
  settingsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    color: '#fff',
    fontSize: 16,
  },
  premiumBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 6,
  },

  // Полная секция
  fullSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  chart: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  metricChange: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  // AI ассистент
  aiAssistant: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  aiTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  aiButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Быстрые действия (Пример 7)
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
