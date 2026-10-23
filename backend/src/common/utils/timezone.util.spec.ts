import { historicalTimezoneOffset } from './timezone.util';

describe('historical birth timezone offsets', () => {
  it.each([
    ['Europe/London', '2000-01-01', '12:00', 0],
    ['Europe/London', '2000-07-01', '12:00', 1],
    ['Europe/Lisbon', '2000-01-01', '12:00', 0],
    ['Atlantic/Reykjavik', '2000-01-01', '12:00', 0],
    ['Africa/Accra', '2000-01-01', '12:00', 0],
    ['Asia/Kathmandu', '2000-01-01', '12:00', 5.75],
    ['America/St_Johns', '2000-01-01', '12:00', -3.5],
    ['Europe/Moscow', '1990-07-01', '12:00', 4],
  ])('resolves %s at %s %s to %s', (zone, date, time, expected) => {
    expect(historicalTimezoneOffset(zone, date, time)).toBe(expected);
  });
  it('rejects a nonexistent local time during a spring DST jump', () => {
    expect(
      historicalTimezoneOffset('Europe/London', '2000-03-26', '01:30'),
    ).toBeNull();
  });
  it('returns no invented offset for an invalid zone', () => {
    expect(
      historicalTimezoneOffset('Invalid/City', '2000-01-01', '12:00'),
    ).toBeNull();
  });
});
