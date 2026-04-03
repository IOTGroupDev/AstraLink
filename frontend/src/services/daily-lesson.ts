type LessonLike = {
  id: string;
};

const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const getLocalLessonDayKey = (date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

export const buildDailyLessonDismissKey = (
  lessonId: string | null,
  dayKey = getLocalLessonDayKey()
): string => {
  return `${dayKey}:${lessonId || 'none'}`;
};

export const buildDailyLessonOrder = <T extends LessonLike>(
  lessons: readonly T[],
  dayKey = getLocalLessonDayKey()
): T[] => {
  return [...lessons].sort((left, right) => {
    const leftScore = hashString(`${dayKey}:${left.id}`);
    const rightScore = hashString(`${dayKey}:${right.id}`);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.id.localeCompare(right.id);
  });
};

export const pickDailyLesson = <T extends LessonLike>(
  lessons: readonly T[],
  completedLessonIds: readonly string[],
  dayKey = getLocalLessonDayKey()
): T | null => {
  const orderedLessons = buildDailyLessonOrder(lessons, dayKey);

  if (!orderedLessons.length) {
    return null;
  }

  const completedLessonIdSet = new Set(completedLessonIds);

  return (
    orderedLessons.find((lesson) => !completedLessonIdSet.has(lesson.id)) ||
    orderedLessons[0]
  );
};
