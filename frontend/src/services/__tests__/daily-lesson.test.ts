import {
  buildDailyLessonOrder,
  buildDailyLessonDismissKey,
  getLocalLessonDayKey,
  pickDailyLesson,
} from '../daily-lesson';

const LESSONS = [{ id: 'lesson-a' }, { id: 'lesson-b' }, { id: 'lesson-c' }];

describe('daily lesson picker', () => {
  it('builds a stable local day key', () => {
    expect(getLocalLessonDayKey(new Date('2026-04-03T10:15:00.000Z'))).toBe(
      '2026-04-03'
    );
  });

  it('returns the same order for the same day key', () => {
    const firstOrder = buildDailyLessonOrder(LESSONS, '2026-04-03').map(
      (lesson) => lesson.id
    );
    const secondOrder = buildDailyLessonOrder(LESSONS, '2026-04-03').map(
      (lesson) => lesson.id
    );

    expect(firstOrder).toEqual(secondOrder);
  });

  it('skips completed lessons and returns the next unfinished one', () => {
    const orderedLessons = buildDailyLessonOrder(LESSONS, '2026-04-03');
    const [firstLesson, secondLesson] = orderedLessons;

    expect(pickDailyLesson(LESSONS, [firstLesson.id], '2026-04-03')?.id).toBe(
      secondLesson.id
    );
  });

  it('falls back to the first lesson when everything is completed', () => {
    const firstLesson = buildDailyLessonOrder(LESSONS, '2026-04-03')[0];

    expect(
      pickDailyLesson(
        LESSONS,
        LESSONS.map((lesson) => lesson.id),
        '2026-04-03'
      )?.id
    ).toBe(firstLesson.id);
  });

  it('includes the lesson id in the dismiss key', () => {
    expect(buildDailyLessonDismissKey('lesson-a', '2026-04-03')).toBe(
      '2026-04-03:lesson-a'
    );
  });
});
