import { Badge } from '../../types/lessons';

/**
 * База данных бейджей и достижений
 */
export const BADGES: Badge[] = [
  // ==================== БАЗОВЫЕ БЕЙДЖИ ====================
  {
    id: 'first_lesson',
    name: 'Первый шаг',
    description: 'Завершили свой первый урок',
    icon: 'footsteps',
    emoji: '👣',
    gradient: ['#10B981', '#059669'],
    requirement: {
      type: 'lessons_completed',
      value: 1,
    },
    rarity: 'common',
  },

  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Завершили 5 уроков',
    icon: 'sunny',
    emoji: '🌅',
    gradient: ['#F59E0B', '#D97706'],
    requirement: {
      type: 'lessons_completed',
      value: 5,
    },
    rarity: 'common',
  },

  {
    id: 'dedicated_student',
    name: 'Прилежный ученик',
    description: 'Завершили 10 уроков',
    icon: 'school',
    emoji: '📚',
    gradient: ['#3B82F6', '#2563EB'],
    requirement: {
      type: 'lessons_completed',
      value: 10,
    },
    rarity: 'common',
  },

  {
    id: 'knowledge_seeker',
    name: 'Искатель знаний',
    description: 'Завершили 25 уроков',
    icon: 'book',
    emoji: '📖',
    gradient: ['#8B5CF6', '#7C3AED'],
    requirement: {
      type: 'lessons_completed',
      value: 25,
    },
    rarity: 'rare',
  },

  {
    id: 'astro_enthusiast',
    name: 'Астро-энтузиаст',
    description: 'Завершили 50 уроков',
    icon: 'planet',
    emoji: '🌍',
    gradient: ['#EC4899', '#DB2777'],
    requirement: {
      type: 'lessons_completed',
      value: 50,
    },
    rarity: 'rare',
  },

  {
    id: 'master_scholar',
    name: 'Мастер-эрудит',
    description: 'Завершили 100 уроков',
    icon: 'trophy',
    emoji: '🏆',
    gradient: ['#FBBF24', '#F59E0B'],
    requirement: {
      type: 'lessons_completed',
      value: 100,
    },
    rarity: 'epic',
  },

  // ==================== БЕЙДЖИ КАТЕГОРИЙ ====================
  {
    id: 'basics_master',
    name: 'Знаток основ',
    description: 'Освоили все уроки категории "Основы"',
    icon: 'checkbox',
    emoji: '✅',
    gradient: ['#8B5CF6', '#6366F1'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'basics',
    },
    rarity: 'rare',
  },

  {
    id: 'planets_master',
    name: 'Планетарный эксперт',
    description: 'Освоили все уроки категории "Планеты"',
    icon: 'planet',
    emoji: '🪐',
    gradient: ['#EC4899', '#F43F5E'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'planets',
    },
    rarity: 'rare',
  },

  {
    id: 'aspects_master',
    name: 'Мастер аспектов',
    description: 'Освоили все уроки категории "Аспекты"',
    icon: 'git-network',
    emoji: '🔗',
    gradient: ['#3B82F6', '#2563EB'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'aspects',
    },
    rarity: 'rare',
  },

  {
    id: 'houses_master',
    name: 'Хозяин домов',
    description: 'Освоили все уроки категории "Дома"',
    icon: 'home',
    emoji: '🏠',
    gradient: ['#10B981', '#14B8A6'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'houses',
    },
    rarity: 'rare',
  },

  {
    id: 'transits_master',
    name: 'Гид по транзитам',
    description: 'Освоили все уроки категории "Транзиты"',
    icon: 'swap-horizontal',
    emoji: '🔄',
    gradient: ['#F59E0B', '#EAB308'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'transits',
    },
    rarity: 'rare',
  },

  {
    id: 'lunar_master',
    name: 'Лунный мудрец',
    description: 'Освоили все уроки категории "Лунные циклы"',
    icon: 'moon',
    emoji: '🌙',
    gradient: ['#6366F1', '#8B5CF6'],
    requirement: {
      type: 'category_mastery',
      value: 100,
      category: 'lunar',
    },
    rarity: 'rare',
  },

  // ==================== БЕЙДЖИ СЕРИЙ (STREAKS) ====================
  {
    id: 'streak_3',
    name: 'Начало пути',
    description: '3 дня подряд изучаете уроки',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#EF4444', '#DC2626'],
    requirement: {
      type: 'streak',
      value: 3,
    },
    rarity: 'common',
  },

  {
    id: 'streak_7',
    name: 'Недельный марафон',
    description: '7 дней подряд изучаете уроки',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#F59E0B', '#D97706'],
    requirement: {
      type: 'streak',
      value: 7,
    },
    rarity: 'rare',
  },

  {
    id: 'streak_14',
    name: 'Двухнедельный рекорд',
    description: '14 дней подряд изучаете уроки',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#FBBF24', '#F59E0B'],
    requirement: {
      type: 'streak',
      value: 14,
    },
    rarity: 'epic',
  },

  {
    id: 'streak_30',
    name: 'Месячная одержимость',
    description: '30 дней подряд изучаете уроки',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#DC2626', '#991B1B'],
    requirement: {
      type: 'streak',
      value: 30,
    },
    rarity: 'legendary',
  },

  {
    id: 'streak_100',
    name: 'Астро-маньяк',
    description: '100 дней подряд изучаете уроки',
    icon: 'flame',
    emoji: '🔥',
    gradient: ['#7C2D12', '#431407'],
    requirement: {
      type: 'streak',
      value: 100,
    },
    rarity: 'legendary',
  },

  // ==================== КВИЗЫ ====================
  {
    id: 'quiz_perfect_first',
    name: 'Отличник',
    description: 'Правильно ответили на первый квиз',
    icon: 'checkmark-circle',
    emoji: '✅',
    gradient: ['#10B981', '#059669'],
    requirement: {
      type: 'quiz_perfect',
      value: 1,
    },
    rarity: 'common',
  },

  {
    id: 'quiz_perfect_10',
    name: 'Мозговой центр',
    description: 'Правильно ответили на 10 квизов',
    icon: 'bulb',
    emoji: '💡',
    gradient: ['#FBBF24', '#F59E0B'],
    requirement: {
      type: 'quiz_perfect',
      value: 10,
    },
    rarity: 'rare',
  },

  {
    id: 'quiz_perfect_25',
    name: 'Интеллектуал',
    description: 'Правильно ответили на 25 квизов',
    icon: 'medal',
    emoji: '🥇',
    gradient: ['#3B82F6', '#2563EB'],
    requirement: {
      type: 'quiz_perfect',
      value: 25,
    },
    rarity: 'epic',
  },

  // ==================== СПЕЦИАЛЬНЫЕ ====================
  {
    id: 'night_owl',
    name: 'Ночная сова',
    description: 'Прошли урок между 00:00 и 04:00',
    icon: 'moon',
    emoji: '🦉',
    gradient: ['#1F2937', '#111827'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'rare',
  },

  {
    id: 'mercury_retrograde_warrior',
    name: 'Воин ретроградов',
    description: 'Изучили урок о ретроградном Меркурии во время ретрограда',
    icon: 'shield',
    emoji: '🛡️',
    gradient: ['#F59E0B', '#D97706'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'epic',
  },

  {
    id: 'full_moon_learner',
    name: 'Ученик полнолуния',
    description: 'Изучили урок во время полнолуния',
    icon: 'moon',
    emoji: '🌕',
    gradient: ['#F59E0B', '#FBBF24'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'rare',
  },

  {
    id: 'new_moon_seeker',
    name: 'Искатель новолуния',
    description: 'Изучили урок во время новолуния',
    icon: 'moon-outline',
    emoji: '🌑',
    gradient: ['#1F2937', '#374151'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'rare',
  },

  {
    id: 'birthday_scholar',
    name: 'Именинник-ученик',
    description: 'Прошли урок в свой день рождения',
    icon: 'gift',
    emoji: '🎁',
    gradient: ['#EC4899', '#EF4444'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'epic',
  },

  {
    id: 'completionist',
    name: 'Перфекционист',
    description: 'Завершили абсолютно все уроки',
    icon: 'star',
    emoji: '⭐',
    gradient: ['#FBBF24', '#F59E0B'],
    requirement: {
      type: 'special',
      value: 1,
    },
    rarity: 'legendary',
  },
];

/**
 * Получить бейдж по ID
 */
export const getBadgeById = (id: string): Badge | undefined => {
  return BADGES.find((badge) => badge.id === id);
};

/**
 * Получить бейджи по редкости
 */
export const getBadgesByRarity = (rarity: Badge['rarity']): Badge[] => {
  return BADGES.filter((badge) => badge.rarity === rarity);
};

/**
 * Проверить, заслужен ли бейдж
 */
export const checkBadgeEarned = (
  badge: Badge,
  stats: {
    lessonsCompleted: number;
    streak: number;
    quizzesPerfect: number;
    categoryProgress: Record<string, { percentage: number }>;
  }
): boolean => {
  switch (badge.requirement.type) {
    case 'lessons_completed':
      return stats.lessonsCompleted >= badge.requirement.value;

    case 'streak':
      return stats.streak >= badge.requirement.value;

    case 'quiz_perfect':
      return stats.quizzesPerfect >= badge.requirement.value;

    case 'category_mastery':
      if (!badge.requirement.category) return false;
      const progress = stats.categoryProgress[badge.requirement.category];
      return progress ? progress.percentage >= badge.requirement.value : false;

    case 'special':
      // Специальные бейджи проверяются отдельно
      return false;

    default:
      return false;
  }
};

/**
 * Получить новые заслуженные бейджи
 */
export const getNewlyEarnedBadges = (
  currentBadges: string[],
  stats: {
    lessonsCompleted: number;
    streak: number;
    quizzesPerfect: number;
    categoryProgress: Record<string, { percentage: number }>;
  }
): Badge[] => {
  return BADGES.filter((badge) => {
    // Пропускаем уже заслуженные
    if (currentBadges.includes(badge.id)) return false;

    // Пропускаем специальные (они проверяются отдельно)
    if (badge.requirement.type === 'special') return false;

    // Проверяем условие
    return checkBadgeEarned(badge, stats);
  });
};
