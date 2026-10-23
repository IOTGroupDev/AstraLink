import { getLocationFromBirthData } from './location.utils';

describe('birth location validation and historical timezone', () => {
  it('rejects missing or unknown places', () => {
    expect(() => getLocationFromBirthData()).toThrow();
    expect(() => getLocationFromBirthData('Unknown settlement')).toThrow();
  });
  it.each([
    ['1990-01-01', 0],
    ['1990-07-01', 1],
  ])('resolves London at %s', (date, offset) => {
    expect(
      getLocationFromBirthData(
        'London',
        undefined,
        undefined,
        undefined,
        date,
        '12:00',
      ).timezone,
    ).toBe(offset);
  });
  it('keeps explicit selected coordinates and UTC+0', () => {
    expect(getLocationFromBirthData(undefined, 10, 20, 0)).toEqual({
      latitude: 10,
      longitude: 20,
      timezone: 0,
    });
  });
});
