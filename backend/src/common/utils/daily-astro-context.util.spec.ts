import type { TransitAspect } from '@/services/horoscope.types';
import {
  buildBiorhythmSnapshotFromBirthDate,
  buildDailyAstroContext,
} from './daily-astro-context.util';

describe('daily-astro-context.util', () => {
  it('builds biorhythm snapshot from canonical birth date', () => {
    const snapshot = buildBiorhythmSnapshotFromBirthDate(
      '1990-05-15',
      new Date('2026-04-03T12:00:00.000Z'),
      'en',
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.date).toBe('2026-04-03');
    expect(typeof snapshot?.overall).toBe('number');
    expect(snapshot?.trend).toHaveLength(7);
  });

  it('keeps daily context mixed when transit momentum is high but reserve is low', () => {
    const supportiveTransit: TransitAspect = {
      transitPlanet: 'jupiter',
      natalPlanet: 'sun',
      aspect: 'trine',
      orb: 0.8,
      strength: 0.92,
      isRetrograde: false,
    };

    const context = buildDailyAstroContext({
      birthDateValue: '2026-03-15',
      targetDate: new Date('2026-04-03T12:00:00.000Z'),
      transitAspects: [supportiveTransit],
      lunarPhase: {
        phaseName: 'Waxing Crescent',
        illumination: 24,
        isVoidOfCourse: false,
      },
      lunarDay: {
        number: 5,
        energy: 'positive',
        energyScore: 72,
        summary: 'The lunar day supports gradual progress.',
      },
      locale: 'en',
    });

    expect(context.tone).toBe('mixed');
    expect(context.energy).toBeLessThan(50);
    expect(context.summary).toContain('opportunity');
    expect(context.summary).toContain('internal reserve');
  });
});
