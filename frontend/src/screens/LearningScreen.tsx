import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
  getLessonByIdLocalized,
  getLessonsByLocale,
  getPersonalizedNatalAspectLessonsLocalized,
  getPersonalizedNatalLessonsLocalized,
} from '../services/lessons-database.localized';
import { isGeneratedNatalPlacementLessonId } from '../services/generated-sign-lessons';
import {
  buildDailyLessonDismissKey,
  pickDailyLesson,
} from '../services/daily-lesson';
import { chartAPI } from '../services/api';
import type { Chart } from '../types';
import type { AstroLesson, LessonCategory } from '../types/lessons';
import { useOptionalBottomTabBarHeight } from '../hooks/useOptionalBottomTabBarHeight';
import { useLearningStore } from '../stores';
import {
  DATING_GLASS_BORDER_COLORS,
  DATING_GLASS_BORDER_GRADIENT,
  DatingGlassFill,
  GradientBorderView,
} from '../components/shared';

const learningBackground = require('../../assets/advisor-bg.png');

const SURFACE_BORDER_COLORS = [
  'rgba(255, 255, 255, 0.34)',
  'rgba(124, 119, 153, 0.08)',
] as const;

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

const getLessonsLocale = (language: string): 'ru' | 'en' | 'es' => {
  const locale = String(language || 'en').toLowerCase();
  if (locale === 'ru' || locale === 'en' || locale === 'es') return locale;
  return 'en';
};

const getHouseSign = (
  chart: Chart | null,
  houseNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
): string | null => {
  if (!chart) return null;

  const houses = chart.data?.houses ?? chart.houses;
  if (!houses) return null;

  return houses[houseNumber]?.sign || houses[String(houseNumber)]?.sign || null;
};

const getPlanetSign = (
  chart: Chart | null,
  primaryKey: string,
  secondaryKey?: string
): string | null => {
  if (!chart) return null;

  const planets = chart.data?.planets ?? chart.planets;
  if (!planets) return null;

  return (
    planets[primaryKey]?.sign ||
    (secondaryKey ? planets[secondaryKey]?.sign : null) ||
    null
  );
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

const LearningFilterChip: React.FC<{
  active: boolean;
  label: string;
  onPress: () => void;
}> = ({ active, label, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.82}
    onPress={onPress}
    style={styles.filterChipTouchable}
  >
    <GradientBorderView
      colors={
        active
          ? ['rgba(216, 180, 254, 0.78)', 'rgba(139, 92, 246, 0.24)']
          : SURFACE_BORDER_COLORS
      }
      gradientProps={{
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      }}
      style={styles.filterChipBorder}
      contentStyle={[
        styles.filterChipContent,
        active && styles.filterChipContentActive,
      ]}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </GradientBorderView>
  </TouchableOpacity>
);

const LearningScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const locale = getLessonsLocale(i18n.language);
  const headerTopPadding = insets.top + 10;
  const headerHeight = headerTopPadding + 48;

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
  const generalLessons = useMemo(
    () =>
      lessons.filter((lesson) => !isGeneratedNatalPlacementLessonId(lesson.id)),
    [lessons]
  );
  const categoriesWithCount = useMemo(() => {
    return CATEGORY_ORDER.reduce(
      (acc, category) => {
        acc[category] = generalLessons.filter(
          (lesson) => lesson.category === category
        ).length;
        return acc;
      },
      {
        basics: 0,
        planets: 0,
        signs: 0,
        houses: 0,
        aspects: 0,
        transits: 0,
        practical: 0,
        lunar: 0,
      } as Record<LessonCategory, number>
    );
  }, [generalLessons]);
  const [selectedCategory, setSelectedCategory] = useState<
    LessonCategory | 'all'
  >(route?.params?.category || 'all');
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(
    route?.params?.lessonId || null
  );
  const scrollViewRef = useRef<ScrollView | null>(null);
  const featuredLessonId = route?.params?.lessonId || focusedLessonId || null;
  const featuredLesson = useMemo(
    () =>
      featuredLessonId
        ? getLessonByIdLocalized(locale, featuredLessonId)
        : null,
    [featuredLessonId, locale]
  );
  const [personalizedLessons, setPersonalizedLessons] = useState<AstroLesson[]>(
    []
  );
  const dailyLesson = useMemo(
    () => pickDailyLesson(generalLessons, completedLessonIds),
    [completedLessonIds, generalLessons]
  );
  const dailyLessonKey = useMemo(
    () => buildDailyLessonDismissKey(dailyLesson?.id || null),
    [dailyLesson]
  );

  const visibleCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter(
        (category) => (categoriesWithCount[category] || 0) > 0
      ),
    [categoriesWithCount]
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

  useEffect(() => {
    if (!featuredLessonId) return;
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [featuredLessonId]);

  useEffect(() => {
    let isMounted = true;

    const loadPersonalizedLessons = async () => {
      try {
        const chart = await chartAPI.getNatalChart();

        if (!isMounted || !chart) {
          if (isMounted) setPersonalizedLessons([]);
          return;
        }

        const placementLessons = getPersonalizedNatalLessonsLocalized(locale, {
          sunSign: getPlanetSign(chart, 'sun'),
          moonSign: getPlanetSign(chart, 'moon'),
          ascendantSign: chart.data?.ascendant?.sign || getHouseSign(chart, 1),
          descendantSign: getHouseSign(chart, 7),
          mercurySign: getPlanetSign(chart, 'mercury'),
          venusSign: getPlanetSign(chart, 'venus'),
          marsSign: getPlanetSign(chart, 'mars'),
          midheavenSign: chart.data?.midheaven?.sign || getHouseSign(chart, 10),
          jupiterSign: getPlanetSign(chart, 'jupiter'),
          saturnSign: getPlanetSign(chart, 'saturn'),
          northNodeSign: getPlanetSign(chart, 'north_node', 'northNode'),
          southNodeSign: getPlanetSign(chart, 'south_node', 'southNode'),
          chironSign: getPlanetSign(chart, 'chiron'),
          houseSigns: {
            1: getHouseSign(chart, 1),
            2: getHouseSign(chart, 2),
            3: getHouseSign(chart, 3),
            4: getHouseSign(chart, 4),
            5: getHouseSign(chart, 5),
            6: getHouseSign(chart, 6),
            7: getHouseSign(chart, 7),
            8: getHouseSign(chart, 8),
            9: getHouseSign(chart, 9),
            10: getHouseSign(chart, 10),
            11: getHouseSign(chart, 11),
            12: getHouseSign(chart, 12),
          },
        });
        const aspectLessons = getPersonalizedNatalAspectLessonsLocalized(
          locale,
          chart
        );

        if (isMounted) {
          setPersonalizedLessons([...placementLessons, ...aspectLessons]);
        }
      } catch {
        if (isMounted) {
          setPersonalizedLessons([]);
        }
      }
    };

    void loadPersonalizedLessons();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  const trackableLessonIds = useMemo(() => {
    return Array.from(
      new Set([
        ...generalLessons.map((lesson) => lesson.id),
        ...personalizedLessons.map((lesson) => lesson.id),
      ])
    );
  }, [generalLessons, personalizedLessons]);

  const completedTrackedLessons = useMemo(() => {
    return trackableLessonIds.filter((lessonId) =>
      completedLessonIds.includes(lessonId)
    ).length;
  }, [completedLessonIds, trackableLessonIds]);

  const progressPercent = Math.round(
    (completedTrackedLessons / Math.max(trackableLessonIds.length, 1)) * 100
  );

  const handleOpenLesson = (lessonId: string, category: LessonCategory) => {
    setSelectedCategory(category);
    setFocusedLessonId(lessonId);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
      showCosmicBackground={false}
    >
      <View style={styles.screen}>
        <Image
          source={learningBackground}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: headerHeight + 24,
              paddingBottom: Math.max(72, tabBarHeight + 48),
            },
          ]}
        >
          <GradientBorderView
            colors={SURFACE_BORDER_COLORS}
            gradientProps={{
              start: { x: 0.5, y: 0 },
              end: { x: 0.5, y: 1 },
            }}
            style={styles.headerContainer}
            contentStyle={styles.headerSurface}
          >
            <BlurView
              intensity={24}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={styles.headerBlur}
            >
              <View style={styles.overviewHeader}>
                <Ionicons name="school-outline" size={22} color="#D8B4FE" />
                <Text style={styles.headerSubtitle}>
                  {t('learning.subtitle')}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#C45BFF', '#7567FF']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
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
                  completed: completedTrackedLessons,
                  total: trackableLessonIds.length,
                })}
              </Text>
            </BlurView>
          </GradientBorderView>

          {dailyLesson &&
            dismissedDailyLessonKey !== dailyLessonKey &&
            featuredLesson?.id !== dailyLesson.id && (
              <GradientBorderView
                colors={[
                  'rgba(216, 180, 254, 0.62)',
                  'rgba(139, 92, 246, 0.1)',
                ]}
                style={styles.dailyCard}
                contentStyle={styles.dailyCardSurface}
              >
                <BlurView
                  intensity={20}
                  tint="dark"
                  experimentalBlurMethod="dimezisBlurView"
                  style={styles.dailyCardBlur}
                >
                  <View style={styles.dailyHeader}>
                    <View style={styles.dailyIconWrap}>
                      <LinearGradient
                        colors={
                          dailyLesson.gradient as [string, string, ...string[]]
                        }
                        style={styles.dailyIcon}
                      >
                        <Text style={styles.dailyEmoji}>
                          {dailyLesson.emoji}
                        </Text>
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
                    activeOpacity={0.82}
                    onPress={() =>
                      handleOpenLesson(dailyLesson.id, dailyLesson.category)
                    }
                    style={styles.dailyAction}
                  >
                    <Text style={styles.dailyActionText}>
                      {t('learning.dailyLesson.button')}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#D8B4FE" />
                  </TouchableOpacity>
                </BlurView>
              </GradientBorderView>
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
                startExpanded={true}
                expansionKey={featuredLesson.id}
                onTaskPress={(lesson) =>
                  handleTaskPress(lesson.task?.navigationTarget)
                }
              />
            </View>
          )}

          {personalizedLessons.length > 0 && (
            <View style={styles.personalizedContainer}>
              <Text style={styles.sectionTitle}>
                {t('learning.personalized.title')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('learning.personalized.subtitle')}
              </Text>

              {personalizedLessons.map((lesson) => (
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
          )}

          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <LearningFilterChip
                active={selectedCategory === 'all'}
                label={t('learning.filters.all')}
                onPress={() => setSelectedCategory('all')}
              />

              {visibleCategories.map((category) => (
                <LearningFilterChip
                  key={category}
                  active={selectedCategory === category}
                  label={`${t(`learning.categories.${category}`)} (${categoriesWithCount[category]})`}
                  onPress={() => setSelectedCategory(category)}
                />
              ))}
            </ScrollView>
          </View>

          {categoriesToRender.map((category) => {
            const categoryLessons = sortLessonsByFocus(
              generalLessons.filter((lesson) => lesson.category === category),
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
            'rgba(20, 17, 48, 0.88)',
            'rgba(20, 17, 48, 0.44)',
            'rgba(20, 17, 48, 0)',
          ]}
          locations={[0, 0.62, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.topFade, { height: headerHeight + 44 }]}
        />
        <View
          style={[
            styles.fixedHeader,
            { paddingTop: headerTopPadding, height: headerHeight },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.headerCirclePressable}
            onPress={() => navigation.goBack()}
          >
            <GradientBorderView
              colors={DATING_GLASS_BORDER_COLORS}
              gradientProps={DATING_GLASS_BORDER_GRADIENT}
              style={styles.headerCircleBorder}
              contentStyle={[styles.datingGlassContent, styles.backHit]}
            >
              <DatingGlassFill />
              <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
            </GradientBorderView>
          </TouchableOpacity>

          <GradientBorderView
            colors={DATING_GLASS_BORDER_COLORS}
            gradientProps={DATING_GLASS_BORDER_GRADIENT}
            style={styles.titlePillBorder}
            contentStyle={[styles.datingGlassContent, styles.titlePill]}
          >
            <DatingGlassFill />
            <Text numberOfLines={1} style={styles.fixedHeaderTitle}>
              {t('learning.title')}
            </Text>
          </GradientBorderView>

          <View style={styles.headerSpacer} />
        </View>
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
    backgroundColor: '#080E1C',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.82,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerCirclePressable: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerCircleBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  datingGlassContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backHit: {
    width: 45.8,
    height: 45.8,
    borderRadius: 22.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePillBorder: {
    height: 48,
    marginHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  titlePill: {
    height: 45.8,
    borderRadius: 22.9,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  headerContainer: {
    borderWidth: 1,
    borderRadius: 20,
  },
  headerSurface: {
    backgroundColor: 'rgba(18, 18, 42, 0.48)',
  },
  headerBlur: {
    padding: 18,
    overflow: 'hidden',
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSubtitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
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
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    minWidth: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#D8B4FE',
  },
  progressCaption: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  dailyCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  dailyCardSurface: {
    backgroundColor: 'rgba(18, 18, 42, 0.44)',
  },
  dailyCardBlur: {
    padding: 16,
    overflow: 'hidden',
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
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#D8B4FE',
    letterSpacing: 0.5,
  },
  dailyTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
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
    minHeight: 42,
    borderRadius: 22,
    backgroundColor: 'rgba(104,99,135,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.28)',
  },
  dailyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5EEFF',
  },
  featuredContainer: {
    marginTop: 24,
  },
  personalizedContainer: {
    marginTop: 24,
  },
  filtersContainer: {
    marginTop: 24,
    marginHorizontal: -24,
  },
  filtersContent: {
    gap: 10,
    paddingHorizontal: 24,
  },
  filterChipTouchable: {
    borderRadius: 22,
  },
  filterChipBorder: {
    borderWidth: 1,
    borderRadius: 22,
  },
  filterChipContent: {
    minHeight: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,44,79,0.72)',
  },
  filterChipContentActive: {
    backgroundColor: 'rgba(104,99,135,0.88)',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#AAA5B6',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  categorySection: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 14,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.68)',
  },
});

export default LearningScreen;
