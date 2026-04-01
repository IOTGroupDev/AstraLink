import { buildUserLocalPeriodContext } from './user-local-date.util';

describe('user-local-date.util', () => {
  const now = new Date('2026-04-01T21:30:00.000Z');

  it('uses the user local date for daily cache and quota keys', () => {
    const context = buildUserLocalPeriodContext('day', 180, now);

    expect(context.targetDate.toISOString()).toBe('2026-04-01T21:30:00.000Z');
    expect(context.dateKey).toBe('2026-04-02');
    expect(context.quotaDayKey).toBe('2026-04-02');
    expect(context.ttlSec).toBe(84600);
    expect(context.quotaTtlSec).toBe(84600);
  });

  it('moves tomorrow to the next user-local date bucket', () => {
    const context = buildUserLocalPeriodContext('tomorrow', 180, now);

    expect(context.dateKey).toBe('2026-04-03');
    expect(context.targetDate.toISOString()).toBe('2026-04-02T21:30:00.000Z');
  });

  it('uses monday start for weekly buckets in user local time', () => {
    const context = buildUserLocalPeriodContext('week', 180, now);

    expect(context.dateKey).toBe('2026-04-06');
    expect(context.targetDate.toISOString()).toBe('2026-04-08T21:30:00.000Z');
  });

  it('uses the user-local month bucket for monthly cache keys', () => {
    const context = buildUserLocalPeriodContext('month', 180, now);

    expect(context.dateKey).toBe('2026-05');
    expect(context.targetDate.toISOString()).toBe('2026-05-01T21:30:00.000Z');
  });
});
