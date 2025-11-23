/**
 * Типы для системы астро-уроков
 */

export type LessonCategory =
  | 'basics' // Основы
  | 'planets' // Планеты
  | 'signs' // Знаки зодиака
  | 'houses' // Дома
  | 'aspects' // Аспекты
  | 'transits' // Транзиты
  | 'practical' // Практические советы
  | 'lunar'; // Лунные циклы

export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface LessonQuiz {
  question: string;
  options: QuizOption[];
  hint?: string;
}

export interface LessonTask {
  type: 'find_in_chart' | 'check_transit' | 'practice';
  title: string;
  description: string;
  actionLabel: string;
  navigationTarget?: string; // Куда перейти
}

export interface AstroLesson {
  id: string;
  category: LessonCategory;
  title: string;
  subtitle?: string;
  icon: string; // Ionicons name
  emoji?: string;
  gradient: string[];

  // Контент
  shortText: string; // Краткое описание (2-3 предложения)
  fullText?: string; // Полный текст (опционально)
  keyPoints?: string[]; // Ключевые моменты
  example?: string; // Пример из жизни

  // Интерактив
  quiz?: LessonQuiz;
  task?: LessonTask;

  // Метаданные
  relatedLessons?: string[]; // ID связанных уроков
  difficulty: LessonDifficulty;
  readTime: number; // секунды
  order: number; // Порядок в категории

  // Условия показа
  showConditions?: {
    minLevel?: number;
    requiresCompletedLessons?: string[];
    showOnTransit?: string; // Показать при активном транзите планеты
    showOnDate?: string; // Показать в определённую дату (формат MM-DD)
  };
}

export interface UserLessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  quizScore?: number; // 0-100
  quizAttempts?: number;
  bookmarked?: boolean;
  notes?: string;
}

export interface UserLearningStats {
  totalLessonsCompleted: number;
  totalQuizzesPassed: number;
  currentStreak: number; // Дни подряд
  longestStreak: number;
  lastActivityDate?: string;
  level: number; // 1-10
  experiencePoints: number;
  badges: string[];
  categoryProgress: Record<
    LessonCategory,
    {
      completed: number;
      total: number;
      percentage: number;
    }
  >;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  emoji: string;
  gradient: string[];
  requirement: {
    type:
      | 'lessons_completed'
      | 'streak'
      | 'category_mastery'
      | 'quiz_perfect'
      | 'special';
    value: number;
    category?: LessonCategory;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

export interface DailyLessonPlan {
  date: string;
  lessonId: string;
  reason: string; // Почему выбран этот урок
  personalizedNote?: string; // Персональное сообщение
}
