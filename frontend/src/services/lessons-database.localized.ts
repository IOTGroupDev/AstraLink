import { AstroLesson, LessonCategory } from '../types/lessons';
import { ASTRO_LESSONS } from './lessons-database';
import { ASTRO_LESSONS_EN } from './lessons-database.en';
import { ASTRO_LESSONS_ES } from './lessons-database.es';
import {
  buildPersonalizedNatalLessonIds,
  getGeneratedNatalLessons,
  getPersonalizedNatalAspectLessons,
  type NatalLessonPlacements,
  type SupportedLessonsLocale,
} from './generated-sign-lessons';
import type { Chart } from '../types';

const LESSONS_BY_LOCALE: Record<'ru' | 'en' | 'es', AstroLesson[]> = {
  ru: ASTRO_LESSONS,
  en: ASTRO_LESSONS_EN,
  es: ASTRO_LESSONS_ES,
};

const COMBINED_LESSONS_CACHE: Partial<
  Record<SupportedLessonsLocale, AstroLesson[]>
> = {};

export const getCoreLessonsByLocale = (
  locale: 'ru' | 'en' | 'es'
): AstroLesson[] => {
  return LESSONS_BY_LOCALE[locale] || ASTRO_LESSONS_EN;
};

export const getLessonsByLocale = (
  locale: 'ru' | 'en' | 'es'
): AstroLesson[] => {
  if (COMBINED_LESSONS_CACHE[locale]) {
    return COMBINED_LESSONS_CACHE[locale] as AstroLesson[];
  }

  const combinedLessons = [
    ...getCoreLessonsByLocale(locale),
    ...getGeneratedNatalLessons(locale),
  ];

  COMBINED_LESSONS_CACHE[locale] = combinedLessons;
  return combinedLessons;
};

export const getLessonByIdLocalized = (
  locale: 'ru' | 'en' | 'es',
  id: string
): AstroLesson | undefined => {
  return getLessonsByLocale(locale).find((lesson) => lesson.id === id);
};

export const getLessonsByCategoryLocalized = (
  locale: 'ru' | 'en' | 'es',
  category: LessonCategory
): AstroLesson[] => {
  return getLessonsByLocale(locale)
    .filter((lesson) => lesson.category === category)
    .sort((a, b) => a.order - b.order);
};

export const getCategoriesWithCountLocalized = (locale: 'ru' | 'en' | 'es') => {
  const categories: Record<LessonCategory, number> = {
    basics: 0,
    planets: 0,
    signs: 0,
    houses: 0,
    aspects: 0,
    transits: 0,
    practical: 0,
    lunar: 0,
  };

  getLessonsByLocale(locale).forEach((lesson) => {
    categories[lesson.category]++;
  });

  return categories;
};

export const getPersonalizedNatalLessonsLocalized = (
  locale: 'ru' | 'en' | 'es',
  placements: NatalLessonPlacements
): AstroLesson[] => {
  const lessonIds = buildPersonalizedNatalLessonIds(placements);

  return lessonIds
    .map((lessonId) => getLessonByIdLocalized(locale, lessonId))
    .filter((lesson): lesson is AstroLesson => Boolean(lesson));
};

export const getPersonalizedNatalAspectLessonsLocalized = (
  locale: 'ru' | 'en' | 'es',
  chart: Chart | null
): AstroLesson[] => {
  return getPersonalizedNatalAspectLessons(locale, chart);
};
