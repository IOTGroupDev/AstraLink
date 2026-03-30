import { createStoreWithMiddleware } from './setupStore';

type LearningSource = 'horoscope' | 'profile' | 'lesson_task';

interface LearningState {
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  dismissedDailyLessonKey: string | null;
  lastSource: LearningSource | null;
  markLessonCompleted: (lessonId: string) => void;
  toggleLessonBookmark: (lessonId: string) => void;
  dismissDailyLesson: (dayKey: string) => void;
  setLastSource: (source: LearningSource | null) => void;
  resetLearningProgress: () => void;
}

export const useLearningStore = createStoreWithMiddleware<LearningState>(
  (set) => ({
    completedLessonIds: [],
    bookmarkedLessonIds: [],
    dismissedDailyLessonKey: null,
    lastSource: null,

    markLessonCompleted: (lessonId) =>
      set((state) => ({
        completedLessonIds: state.completedLessonIds.includes(lessonId)
          ? state.completedLessonIds
          : [...state.completedLessonIds, lessonId],
      })),

    toggleLessonBookmark: (lessonId) =>
      set((state) => ({
        bookmarkedLessonIds: state.bookmarkedLessonIds.includes(lessonId)
          ? state.bookmarkedLessonIds.filter((id) => id !== lessonId)
          : [...state.bookmarkedLessonIds, lessonId],
      })),

    dismissDailyLesson: (dayKey) => set({ dismissedDailyLessonKey: dayKey }),

    setLastSource: (source) => set({ lastSource: source }),

    resetLearningProgress: () =>
      set({
        completedLessonIds: [],
        bookmarkedLessonIds: [],
        dismissedDailyLessonKey: null,
        lastSource: null,
      }),
  }),
  {
    name: 'learning-storage',
    partialize: (state) => ({
      completedLessonIds: state.completedLessonIds,
      bookmarkedLessonIds: state.bookmarkedLessonIds,
      dismissedDailyLessonKey: state.dismissedDailyLessonKey,
      lastSource: state.lastSource,
    }),
  }
);

export const useCompletedLessonIds = () =>
  useLearningStore((state) => state.completedLessonIds);
export const useBookmarkedLessonIds = () =>
  useLearningStore((state) => state.bookmarkedLessonIds);
