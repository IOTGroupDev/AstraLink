import {
  buildUtcBirthDateTime,
  deriveLocalBirthFieldsFromUtc,
  normalizeBirthDateValue,
  normalizeBirthTimeValue,
} from './birth-data.util';

describe('birth-data.util', () => {
  describe('normalizeBirthDateValue', () => {
    it('keeps canonical YYYY-MM-DD values unchanged', () => {
      expect(normalizeBirthDateValue('1990-05-15')).toBe('1990-05-15');
    });

    it('extracts YYYY-MM-DD from datetime strings', () => {
      expect(normalizeBirthDateValue('1990-05-15T11:30:00.000Z')).toBe(
        '1990-05-15',
      );
    });
  });

  describe('normalizeBirthTimeValue', () => {
    it('normalizes single-digit hours', () => {
      expect(normalizeBirthTimeValue('7:05')).toBe('07:05');
    });
  });

  describe('buildUtcBirthDateTime', () => {
    it('converts local Moscow birth time to UTC instant', () => {
      const utcDate = buildUtcBirthDateTime('1990-05-15', '14:30', 3);

      expect(utcDate?.toISOString()).toBe('1990-05-15T11:30:00.000Z');
    });

    it('converts local Tokyo birth time to previous UTC date when needed', () => {
      const utcDate = buildUtcBirthDateTime('1990-05-15', '00:30', 9);

      expect(utcDate?.toISOString()).toBe('1990-05-14T15:30:00.000Z');
    });
  });

  describe('deriveLocalBirthFieldsFromUtc', () => {
    it('restores canonical local birth date and time from UTC instant', () => {
      expect(
        deriveLocalBirthFieldsFromUtc('1990-05-14T15:30:00.000Z', 9),
      ).toEqual({
        birthDate: '1990-05-15',
        birthTime: '00:30',
      });
    });
  });
});
