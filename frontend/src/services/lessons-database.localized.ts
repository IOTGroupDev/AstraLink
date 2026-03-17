import { AstroLesson, LessonCategory } from '../types/lessons';
import { ASTRO_LESSONS } from './lessons-database';
import { ASTRO_LESSONS_EN } from './lessons-database.en';
import { ASTRO_LESSONS_ES } from './lessons-database.es';

const LESSONS_BY_LOCALE: Record<'ru' | 'en' | 'es', AstroLesson[]> = {
  ru: ASTRO_LESSONS,
  en: ASTRO_LESSONS_EN,
  es: ASTRO_LESSONS_ES,
};

export const getLessonsByLocale = (
  locale: 'ru' | 'en' | 'es'
): AstroLesson[] => {
  return LESSONS_BY_LOCALE[locale] || ASTRO_LESSONS_EN;
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
