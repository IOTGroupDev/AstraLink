// services/__tests__/zodiac.service.test.ts
// Тесты для сервиса зодиака

import {
  getZodiacSign,
  formatDateRange,
  getSignsByElement,
  getElementDescription,
} from '../zodiac.service';

describe('Zodiac Service', () => {
  describe('getZodiacSign', () => {
    it('должен корректно определять знак Овен', () => {
      const sign = getZodiacSign(21, 3);
      expect(sign.nameRu).toBe('ОВЕН');
      expect(sign.key).toBe('aries');
      expect(sign.element).toBe('fire');
    });

    it('должен корректно определять знак Рыбы', () => {
      const sign = getZodiacSign(24, 2);
      expect(sign.nameRu).toBe('РЫБЫ');
      expect(sign.key).toBe('pisces');
      expect(sign.element).toBe('water');
    });

    it('должен корректно определять знак Козерог (переход через год)', () => {
      // Козерог: 22 декабря - 19 января
      const signDec = getZodiacSign(25, 12);
      expect(signDec.nameRu).toBe('КОЗЕРОГ');
      expect(signDec.key).toBe('capricorn');

      const signJan = getZodiacSign(15, 1);
      expect(signJan.nameRu).toBe('КОЗЕРОГ');
      expect(signJan.key).toBe('capricorn');
    });

    it('должен корректно определять граничные даты', () => {
      // Первый день Овна
      const ariesStart = getZodiacSign(21, 3);
      expect(ariesStart.key).toBe('aries');

      // Последний день Овна
      const ariesEnd = getZodiacSign(19, 4);
      expect(ariesEnd.key).toBe('aries');

      // Первый день Тельца
      const taurusStart = getZodiacSign(20, 4);
      expect(taurusStart.key).toBe('taurus');
    });

    it('должен корректно определять все 12 знаков', () => {
      const testDates = [
        { day: 1, month: 4, expected: 'aries' },
        { day: 1, month: 5, expected: 'taurus' },
        { day: 1, month: 6, expected: 'gemini' },
        { day: 1, month: 7, expected: 'cancer' },
        { day: 1, month: 8, expected: 'leo' },
        { day: 1, month: 9, expected: 'virgo' },
        { day: 1, month: 10, expected: 'libra' },
        { day: 1, month: 11, expected: 'scorpio' },
        { day: 1, month: 12, expected: 'sagittarius' },
        { day: 1, month: 1, expected: 'capricorn' },
        { day: 1, month: 2, expected: 'aquarius' },
        { day: 1, month: 3, expected: 'pisces' },
      ];

      testDates.forEach(({ day, month, expected }) => {
        const sign = getZodiacSign(day, month);
        expect(sign.key).toBe(expected);
      });
    });
  });

  describe('formatDateRange', () => {
    it('должен корректно форматировать диапазон дат', () => {
      const aries = getZodiacSign(1, 4);
      const range = formatDateRange(aries);
      expect(range).toBe('21 МАР - 19 АПР');
    });

    it('должен добавлять ведущий ноль для однозначных дней', () => {
      const cancer = getZodiacSign(1, 7);
      const range = formatDateRange(cancer);
      expect(range).toMatch(/^\d{2} /); // Проверяем формат с двумя цифрами
    });
  });

  describe('getSignsByElement', () => {
    it('должен возвращать три огненных знака', () => {
      const fireSigns = getSignsByElement('fire');
      expect(fireSigns).toHaveLength(3);
      expect(fireSigns.map((s) => s.key)).toEqual([
        'aries',
        'leo',
        'sagittarius',
      ]);
    });

    it('должен возвращать три земных знака', () => {
      const earthSigns = getSignsByElement('earth');
      expect(earthSigns).toHaveLength(3);
      expect(earthSigns.map((s) => s.key)).toEqual([
        'taurus',
        'virgo',
        'capricorn',
      ]);
    });

    it('должен возвращать три воздушных знака', () => {
      const airSigns = getSignsByElement('air');
      expect(airSigns).toHaveLength(3);
      expect(airSigns.map((s) => s.key)).toEqual([
        'gemini',
        'libra',
        'aquarius',
      ]);
    });

    it('должен возвращать три водных знака', () => {
      const waterSigns = getSignsByElement('water');
      expect(waterSigns).toHaveLength(3);
      expect(waterSigns.map((s) => s.key)).toEqual([
        'cancer',
        'scorpio',
        'pisces',
      ]);
    });
  });

  describe('getElementDescription', () => {
    it('должен возвращать описание для каждой стихии', () => {
      const fireDesc = getElementDescription('fire');
      expect(fireDesc).toContain('Огненные');

      const earthDesc = getElementDescription('earth');
      expect(earthDesc).toContain('Земные');

      const airDesc = getElementDescription('air');
      expect(airDesc).toContain('Воздушные');

      const waterDesc = getElementDescription('water');
      expect(waterDesc).toContain('Водные');
    });
  });

  describe('ZodiacSign properties', () => {
    it('каждый знак должен иметь все необходимые свойства', () => {
      const sign = getZodiacSign(1, 1);

      expect(sign).toHaveProperty('key');
      expect(sign).toHaveProperty('nameRu');
      expect(sign).toHaveProperty('nameEn');
      expect(sign).toHaveProperty('element');
      expect(sign).toHaveProperty('elementRu');
      expect(sign).toHaveProperty('startDate');
      expect(sign).toHaveProperty('endDate');
      expect(sign).toHaveProperty('shortDescription');
      expect(sign).toHaveProperty('traits');
      expect(Array.isArray(sign.traits)).toBe(true);
    });

    it('каждый знак должен иметь 4 черты характера', () => {
      const sign = getZodiacSign(24, 2);
      expect(sign.traits).toHaveLength(4);
    });
  });
});
