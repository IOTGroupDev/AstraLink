import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { LessonCard } from '../components/lessons/LessonCard';
import {
  getCategoriesWithCountLocalized,
  getLessonByIdLocalized,
  getLessonsByCategoryLocalized,
  getLessonsByLocale,
} from '../services/lessons-database.localized';
import type { LessonCategory } from '../types/lessons';
import { useOptionalBottomTabBarHeight } from '../hooks/useOptionalBottomTabBarHeight';
import { useLearningStore } from '../stores';

const CATEGORY_ORDER: LessonCategory[] = [
  'basics',
  'planets',
  'aspects',
  'houses',
  'transits',
  'practical',
  'lunar',
  'signs',
];

const getLocalDayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const getLessonsLocale = (language: string): 'ru' | 'en' | 'es' => {
  const locale = String(language || 'en').toLowerCase();
  if (locale === 'ru' || locale === 'en' || locale === 'es') return locale;
  return 'en';
};

const getLessonOfTheDay = <T,>(items: T[]): T | null => {
  if (!items.length) return null;
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor(
    (Date.now() - startOfYear) / (1000 * 60 * 60 * 24)
  );
  return items[dayOfYear % items.length] ?? null;
};

const sortLessonsByFocus = <
  T extends {
    id: string;
  },
>(
  lessons: T[],
  focusedLessonId: string | null
) => {
  if (!focusedLessonId) return lessons;

  return [...lessons].sort((left, right) => {
    if (left.id === focusedLessonId) return -1;
    if (right.id === focusedLessonId) return 1;
    return 0;
  });
};

const LearningScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const locale = getLessonsLocale(i18n.language);

  const {
    completedLessonIds,
    bookmarkedLessonIds,
    dismissedDailyLessonKey,
    markLessonCompleted,
    toggleLessonBookmark,
    dismissDailyLesson,
    setLastSource,
  } = useLearningStore((state) => ({
    completedLessonIds: state.completedLessonIds,
    bookmarkedLessonIds: state.bookmarkedLessonIds,
    dismissedDailyLessonKey: state.dismissedDailyLessonKey,
    markLessonCompleted: state.markLessonCompleted,
    toggleLessonBookmark: state.toggleLessonBookmark,
    dismissDailyLesson: state.dismissDailyLesson,
    setLastSource: state.setLastSource,
  }));

  const lessons = useMemo(() => getLessonsByLocale(locale), [locale]);
  const categoriesWithCount = useMemo(
    () => getCategoriesWithCountLocalized(locale),
    [locale]
  );
  const featuredLesson = useMemo(
    () =>
      route?.params?.lessonId
        ? getLessonByIdLocalized(locale, route.params.lessonId)
        : null,
    [locale, route?.params?.lessonId]
  );
  const dailyLesson = useMemo(() => getLessonOfTheDay(lessons), [lessons]);
  const dailyLessonKey = useMemo(
    () =>
      dailyLesson
        ? `${getLocalDayKey()}:${dailyLesson.id}`
        : `${getLocalDayKey()}:none`,
    [dailyLesson]
  );

  const visibleCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter(
        (category) => (categoriesWithCount[category] || 0) > 0
      ),
    [categoriesWithCount]
  );

  const [selectedCategory, setSelectedCategory] = useState<
    LessonCategory | 'all'
  >(route?.params?.category || 'all');
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(
    route?.params?.lessonId || null
  );

  useEffect(() => {
    setSelectedCategory(route?.params?.category || 'all');
  }, [route?.params?.category]);

  useEffect(() => {
    setFocusedLessonId(route?.params?.lessonId || null);
  }, [route?.params?.lessonId]);

  useEffect(() => {
    if (route?.params?.source) {
      setLastSource(route.params.source);
    }
  }, [route?.params?.source, setLastSource]);

  const progressPercent = Math.round(
    (completedLessonIds.length / Math.max(lessons.length, 1)) * 100
  );

  const handleOpenLesson = (lessonId: string, category: LessonCategory) => {
    setSelectedCategory(category);
    setFocusedLessonId(lessonId);
  };

  const handleTaskPress = (navigationTarget?: string) => {
    setLastSource('lesson_task');

    if (navigationTarget === 'Chart') {
      navigation.navigate('NatalChart');
      return;
    }

    if (navigationTarget === 'Simulator') {
      navigation.navigate('CosmicSimulator');
    }
  };

  const categoriesToRender =
    selectedCategory === 'all'
      ? visibleCategories
      : visibleCategories.filter((category) => category === selectedCategory);

  return (
    <TabScreenLayout
      scrollable={false}
      edges={['left', 'right']}
      contentContainerStyle={styles.layoutContent}
    >
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 12,
              paddingBottom: Math.max(56, tabBarHeight + 28),
            },
          ]}
        >
          <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{t('learning.title')}</Text>
                <Text style={styles.headerSubtitle}>
                  {t('learning.subtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{progressPercent}%</Text>
            </View>

            <Text style={styles.progressCaption}>
              {t('learning.progress.summary', {
                completed: completedLessonIds.length,
                total: lessons.length,
              })}
            </Text>
          </BlurView>

          {dailyLesson && dismissedDailyLessonKey !== dailyLessonKey && (
            <BlurView intensity={10} tint="dark" style={styles.dailyCard}>
              <View style={styles.dailyHeader}>
                <View style={styles.dailyIconWrap}>
                  <LinearGradient
                    colors={
                      dailyLesson.gradient as [string, string, ...string[]]
                    }
                    style={styles.dailyIcon}
                  >
                    <Text style={styles.dailyEmoji}>{dailyLesson.emoji}</Text>
                  </LinearGradient>
                </View>

                <View style={styles.dailyContent}>
                  <Text style={styles.dailyLabel}>
                    {t('learning.dailyLesson.label')}
                  </Text>
                  <Text style={styles.dailyTitle}>{dailyLesson.title}</Text>
                  <Text style={styles.dailySubtitle} numberOfLines={3}>
                    {dailyLesson.shortText}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => dismissDailyLesson(dailyLessonKey)}
                  style={styles.dailyDismiss}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="rgba(255,255,255,0.6)"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() =>
                  handleOpenLesson(dailyLesson.id, dailyLesson.category)
                }
                style={styles.dailyAction}
              >
                <Text style={styles.dailyActionText}>
                  {t('learning.dailyLesson.button')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </BlurView>
          )}

          {featuredLesson && (
            <View style={styles.featuredContainer}>
              <Text style={styles.sectionTitle}>
                {t('learning.featured.title')}
              </Text>
              <LessonCard
                lesson={featuredLesson}
                isCompleted={completedLessonIds.includes(featuredLesson.id)}
                isBookmarked={bookmarkedLessonIds.includes(featuredLesson.id)}
                onComplete={markLessonCompleted}
                onBookmark={toggleLessonBookmark}
                onTaskPress={(lesson) =>
                  handleTaskPress(lesson.task?.navigationTarget)
                }
              />
            </View>
          )}

          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <TouchableOpacity
                onPress={() => setSelectedCategory('all')}
                style={[
                  styles.filterChip,
                  selectedCategory === 'all' && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  {t('learning.filters.all')}
                </Text>
              </TouchableOpacity>

              {visibleCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.filterChip,
                    selectedCategory === category && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {t(`learning.categories.${category}`)} (
                    {categoriesWithCount[category]})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {categoriesToRender.map((category) => {
            const categoryLessons = sortLessonsByFocus(
              getLessonsByCategoryLocalized(locale, category),
              focusedLessonId
            );

            if (!categoryLessons.length) return null;

            return (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.sectionTitle}>
                  {t(`learning.categories.${category}`)}
                </Text>

                {categoryLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    isCompleted={completedLessonIds.includes(lesson.id)}
                    isBookmarked={bookmarkedLessonIds.includes(lesson.id)}
                    onComplete={markLessonCompleted}
                    onBookmark={toggleLessonBookmark}
                    onTaskPress={(currentLesson) =>
                      handleTaskPress(currentLesson.task?.navigationTarget)
                    }
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(15, 23, 42, 0.98)',
            'rgba(15, 23, 42, 0.65)',
            'rgba(15, 23, 42, 0)',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.topFade, { height: insets.top + 56 }]}
        />
      </View>
    </TabScreenLayout>
  );
};

const styles = StyleSheet.create({
  layoutContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContainer: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    minWidth: 40,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  progressCaption: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  dailyCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  dailyHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  dailyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  dailyIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyEmoji: {
    fontSize: 24,
  },
  dailyContent: {
    flex: 1,
  },
  dailyLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  dailyTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dailySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
  },
  dailyDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyAction: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  dailyActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  featuredContainer: {
    marginTop: 20,
  },
  filtersContainer: {
    marginTop: 20,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  categorySection: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LearningScreen;
